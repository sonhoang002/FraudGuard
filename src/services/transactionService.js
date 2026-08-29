const { getTransactionStatusById } = require("../../database/readQueries");

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

module.exports = { resolvePendingTransactionStatus };
