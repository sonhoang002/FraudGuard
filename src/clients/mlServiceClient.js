class MlServiceError extends Error {
  constructor(message, code, status) {
    super(message);

    this.name = "MlServiceError";
    this.code = code;
    this.status = status;
  }
}

async function getFraudPrediction({ amount, merchant_category }) {
  const timeoutMs = Number(process.env.ML_SERVICE_TIMEOUT_MS) || 2000;
  const signal = AbortSignal.timeout(timeoutMs);

  let response, data;
  try {
    response = await fetch(`${process.env.ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(amount),
        merchant_category: merchant_category,
      }),
      signal,
    });
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new MlServiceError(
        "ML service request timed out",
        "ML_SERVICE_TIMEOUT",
      );
    }

    throw new MlServiceError(
      "ML service is unavailable",
      "ML_SERVICE_UNAVAILABLE",
    );
  }

  if (!response.ok) {
    throw new MlServiceError(
      "ML service returned a non-successful response",
      "ML_SERVICE_HTTP_ERROR",
      response.status,
    );
  }

  try {
    data = await response.json();
  } catch {
    throw new MlServiceError(
      "ML service returned an invalid response",
      "ML_SERVICE_INVALID_RESPONSE",
    );
  }

  const isValidResponse =
    data !== null &&
    typeof data === "object" &&
    typeof data.fraud_probability === "number" &&
    Number.isFinite(data.fraud_probability) &&
    data.fraud_probability >= 0 &&
    data.fraud_probability <= 1 &&
    typeof data.model_version === "string" &&
    data.model_version.trim().length > 0;

  if (!isValidResponse) {
    throw new MlServiceError(
      "ML service returned an invalid response",
      "ML_SERVICE_INVALID_RESPONSE",
    );
  }

  return data;
}

module.exports = { getFraudPrediction };
