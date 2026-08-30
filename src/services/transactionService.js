const {
  getTransactionStatusById,
  getTransactionById,
  getTransactionPredictionHistory,
} = require("../../database/readQueries");

const {
  updatePendingTransactionStatus,
} = require("../../database/writeQueries");

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

module.exports = { resolvePendingTransactionStatus, getTransactionDetails };
