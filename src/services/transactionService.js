const {
  getTransactionStatusById,
  getTransactionById,
  getTransactionPredictionHistory,
} = require("../../database/readQueries");

const {
  createTransaction,
  createFraudPrediction,
  updatePendingTransactionStatus,
} = require("../../database/writeQueries");

const { getFraudPrediction } = require("../clients/mlServiceClient");

const { getFraudDecision } = require("./fraudDecisionService");

const DEGRADED_ML_ERROR_CODES = new Set([
  "ML_SERVICE_TIMEOUT",
  "ML_SERVICE_UNAVAILABLE",
  "ML_SERVICE_HTTP_ERROR",
  "ML_SERVICE_INVALID_RESPONSE",
]);

async function resolvePendingTransactionStatus(
  transactionId,
  transactionStatus,
) {
  const updatedTransaction = await updatePendingTransactionStatus(
    transactionId,
    transactionStatus,
  );

  if (updatedTransaction !== undefined) {
    return { outcome: "UPDATED", transaction: updatedTransaction };
  }

  const existingTransaction = await getTransactionStatusById(transactionId);

  if (existingTransaction === undefined) {
    return { outcome: "NOT_FOUND" };
  }

  return {
    outcome: "CONFLICT",
    currentStatus: existingTransaction.transaction_status,
  };
}

async function getTransactionDetails(transactionId) {
  const existingTransaction = await getTransactionById(transactionId);

  if (existingTransaction === undefined) {
    return { outcome: "NOT_FOUND" };
  }

  const predictionHistory =
    await getTransactionPredictionHistory(transactionId);

  const cleanedPredictionHistory = predictionHistory.map((prediction) => {
    const {
      prediction_id,
      model_version,
      score_probability,
      decision,
      prediction_created_at,
    } = prediction;
    return {
      prediction_id,
      model_version,
      score_probability,
      decision,
      prediction_created_at,
    };
  });

  return {
    outcome: "FOUND",
    ...existingTransaction,
    predictions: cleanedPredictionHistory,
  };
}

async function createAndScoreTransaction(transactionData) {
  const createdTransaction = await createTransaction(transactionData);

  let mlPrediction;

  try {
    mlPrediction = await getFraudPrediction({
      amount: createdTransaction.amount,
      merchant_category: createdTransaction.merchant_category,
    });
  } catch (error) {
    if (!DEGRADED_ML_ERROR_CODES.has(error.code)) {
      throw error;
    }

    return {
      transaction: createdTransaction,
      scoring: {
        status: "FAILED",
        prediction: null,
        error_code: error.code,
      },
    };
  }

  const decision = getFraudDecision(mlPrediction.fraud_probability);

  const storedPrediction = await createFraudPrediction({
    transaction_id: createdTransaction.id,
    model_version: mlPrediction.model_version,
    score_probability: mlPrediction.fraud_probability,
    decision,
  });

  let finalTransaction = createdTransaction;

  if (decision === "APPROVE") {
    finalTransaction = await updatePendingTransactionStatus(
      createdTransaction.id,
      "COMPLETED",
    );
  }

  if (decision === "BLOCK") {
    finalTransaction = await updatePendingTransactionStatus(
      createdTransaction.id,
      "DECLINED",
    );
  }

  return {
    transaction: finalTransaction,
    scoring: {
      status: "SUCCESS",
      prediction: storedPrediction,
    },
  };
}

module.exports = {
  resolvePendingTransactionStatus,
  getTransactionDetails,
  createAndScoreTransaction,
};
