const client = require("../clients/mlServiceClient");

describe("getFraudPrediction", () => {
  test("calls ML service and returns parsed fraud prediction", async () => {
    const originalMlServiceUrl = process.env.ML_SERVICE_URL;
    const originalFetch = global.fetch;

    process.env.ML_SERVICE_URL = "http://localhost:8000";

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        fraud_probability: 0.72,
        model_version: "banksim_logistic_v1",
      }),
    });

    try {
      const result = await client.getFraudPrediction({
        amount: "125.50",
        merchant_category: "es_food",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.ML_SERVICE_URL}/predict`,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: 125.5,
            merchant_category: "es_food",
          }),
        }),
      );

      expect(result).toEqual({
        fraud_probability: 0.72,
        model_version: "banksim_logistic_v1",
      });
    } finally {
      global.fetch = originalFetch;

      if (originalMlServiceUrl === undefined) {
        delete process.env.ML_SERVICE_URL;
      } else {
        process.env.ML_SERVICE_URL = originalMlServiceUrl;
      }
    }
  });

  test("throws MlServiceError for non-successful HTTP response", async () => {
    const originalMlServiceUrl = process.env.ML_SERVICE_URL;
    const originalFetch = global.fetch;

    process.env.ML_SERVICE_URL = "http://localhost:8000";

    const json = jest.fn();

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json,
    });

    try {
      const result = client.getFraudPrediction({
        amount: "125.50",
        merchant_category: "es_food",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.ML_SERVICE_URL}/predict`,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: 125.5,
            merchant_category: "es_food",
          }),
        }),
      );

      await expect(result).rejects.toMatchObject({
        name: "MlServiceError",
        code: "ML_SERVICE_HTTP_ERROR",
        status: 503,
      });

      expect(json).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;

      if (originalMlServiceUrl === undefined) {
        delete process.env.ML_SERVICE_URL;
      } else {
        process.env.ML_SERVICE_URL = originalMlServiceUrl;
      }
    }
  });

  test("rejects malformed successful HTTP response", async () => {
    const originalMlServiceUrl = process.env.ML_SERVICE_URL;
    const originalFetch = global.fetch;

    process.env.ML_SERVICE_URL = "http://localhost:8000";

    const json = jest.fn().mockResolvedValue({
      fraud_probability: "0.72",
      model_version: "banksim_logistic_v1",
    });

    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json });

    try {
      const result = client.getFraudPrediction({
        amount: "125.50",
        merchant_category: "es_food",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.ML_SERVICE_URL}/predict`,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: 125.5,
            merchant_category: "es_food",
          }),
        }),
      );

      await expect(result).rejects.toMatchObject({
        name: "MlServiceError",
        code: "ML_SERVICE_INVALID_RESPONSE",
      });

      expect(json).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;

      if (originalMlServiceUrl === undefined) {
        delete process.env.ML_SERVICE_URL;
      } else {
        process.env.ML_SERVICE_URL = originalMlServiceUrl;
      }
    }
  });

  test("throws MlServiceError when successful response contains invalid JSON", async () => {
    const originalMlServiceUrl = process.env.ML_SERVICE_URL;
    const originalFetch = global.fetch;

    process.env.ML_SERVICE_URL = "http://localhost:8000";

    const json = jest
      .fn()
      .mockRejectedValue(new SyntaxError("Unexpected token"));

    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json });

    try {
      const result = client.getFraudPrediction({
        amount: "125.50",
        merchant_category: "es_food",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.ML_SERVICE_URL}/predict`,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: 125.5,
            merchant_category: "es_food",
          }),
        }),
      );

      await expect(result).rejects.toMatchObject({
        name: "MlServiceError",
        code: "ML_SERVICE_INVALID_RESPONSE",
      });

      expect(json).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;

      if (originalMlServiceUrl === undefined) {
        delete process.env.ML_SERVICE_URL;
      } else {
        process.env.ML_SERVICE_URL = originalMlServiceUrl;
      }
    }
  });

  test("throws MlServiceError when ML service is unavailable", async () => {
    const originalMlServiceUrl = process.env.ML_SERVICE_URL;
    const originalFetch = global.fetch;

    process.env.ML_SERVICE_URL = "http://localhost:8000";

    global.fetch = jest.fn().mockRejectedValue(new TypeError("fetch failed"));

    try {
      const result = client.getFraudPrediction({
        amount: "125.50",
        merchant_category: "es_food",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.ML_SERVICE_URL}/predict`,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: 125.5,
            merchant_category: "es_food",
          }),
        }),
      );

      await expect(result).rejects.toMatchObject({
        name: "MlServiceError",
        code: "ML_SERVICE_UNAVAILABLE",
      });
    } finally {
      global.fetch = originalFetch;

      if (originalMlServiceUrl === undefined) {
        delete process.env.ML_SERVICE_URL;
      } else {
        process.env.ML_SERVICE_URL = originalMlServiceUrl;
      }
    }
  });

  test("throws MlServiceError when ML service times out", async () => {
    const originalMlServiceUrl = process.env.ML_SERVICE_URL;
    const originalTimeout = process.env.ML_SERVICE_TIMEOUT_MS;
    const originalFetch = global.fetch;

    process.env.ML_SERVICE_URL = "http://localhost:8000";
    process.env.ML_SERVICE_TIMEOUT_MS = "2000";

    const knownSignal = new AbortController().signal;

    const timeoutSpy = jest
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(knownSignal);

    const timeoutError = new Error("Request timed out");
    timeoutError.name = "TimeoutError";

    global.fetch = jest.fn().mockRejectedValue(timeoutError);

    try {
      const result = client.getFraudPrediction({
        amount: "125.50",
        merchant_category: "es_food",
      });

      await expect(result).rejects.toMatchObject({
        name: "MlServiceError",
        code: "ML_SERVICE_TIMEOUT",
      });

      expect(AbortSignal.timeout).toHaveBeenCalledWith(2000);

      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.ML_SERVICE_URL}/predict`,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: 125.5,
            merchant_category: "es_food",
          }),
          signal: knownSignal,
        }),
      );
    } finally {
      timeoutSpy.mockRestore();
      global.fetch = originalFetch;

      if (originalMlServiceUrl === undefined) {
        delete process.env.ML_SERVICE_URL;
      } else {
        process.env.ML_SERVICE_URL = originalMlServiceUrl;
      }

      if (originalTimeout === undefined) {
        delete process.env.ML_SERVICE_TIMEOUT_MS;
      } else {
        process.env.ML_SERVICE_TIMEOUT_MS = originalTimeout;
      }
    }
  });
});
