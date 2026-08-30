const {
  getPendingTransactions,
  getTransactionPredictionHistory,
} = require("../../database/readQueries");

const { createTransaction } = require("../../database/writeQueries");

const {
  resolvePendingTransactionStatus,
  getTransactionDetails,
} = require("../services/transactionService");

function isInvalidOptionalText(value) {
  return (
    value !== undefined &&
    value !== null &&
    (typeof value !== "string" || value.trim() === "")
  );
}

exports.getPendingTransactions = async (req, res, next) => {
  const username = req.query.username;

  try {
    const pendingTransactions = await getPendingTransactions(username);
    return res.status(200).json(pendingTransactions);
  } catch (error) {
    next(error);
  }
};

exports.getTransactionPredictionHistory = async (req, res, next) => {
  const transactionId = Number(req.params.transactionId);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return res
      .status(400)
      .json({ error: "transactionId must be a positive integer" });
  }

  try {
    const predictionHistory =
      await getTransactionPredictionHistory(transactionId);
    return res.status(200).json(predictionHistory);
  } catch (err) {
    next(err);
  }
};

exports.getTransactionById = async (req, res, next) => {
  const transactionId = Number(req.params.transactionId);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return res
      .status(400)
      .json({ error: "transactionId must be a positive integer" });
  }

  try {
    const response = await getTransactionDetails(transactionId);
    const { outcome, ...transactionDetails } = response;

    if (outcome === "NOT_FOUND") {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (outcome === "FOUND") {
      return res.status(200).json(transactionDetails);
    }
    throw new Error("Unexpected transaction detail outcome");
  } catch (error) {
    next(error);
  }
};

exports.createTransaction = async (req, res, next) => {
  const {
    account_id,
    amount,
    currency,
    device,
    merchant,
    occurred_at,
    transaction_status,
  } = req.body || {};
  const amountPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
  const currencyPattern = /^[A-Z]{3}$/;

  if (transaction_status !== undefined) {
    return res.status(400).json({ error: "Do not supply transaction status." });
  }

  if (
    account_id === undefined ||
    amount === undefined ||
    currency === undefined ||
    occurred_at === undefined
  ) {
    return res.status(400).json({
      error: "account_id, amount, currency, and occurred_at are required",
    });
  }

  if (!Number.isInteger(account_id) || account_id <= 0) {
    return res
      .status(400)
      .json({ error: "account_id must be a positive integer" });
  }

  if (
    typeof amount !== "string" ||
    !amountPattern.test(amount) ||
    Number(amount) <= 0
  ) {
    return res.status(400).json({
      error:
        "amount must be a positive decimal string with up to 2 decimal places",
    });
  }

  if (typeof currency !== "string" || !currencyPattern.test(currency)) {
    return res.status(400).json({
      error: "currency must be a three-letter uppercase code",
    });
  }

  if (
    typeof occurred_at !== "string" ||
    Number.isNaN(Date.parse(occurred_at)) ||
    new Date(occurred_at).toISOString() !== occurred_at
  ) {
    return res
      .status(400)
      .json({ error: "occurred_at must be a valid ISO 8601 UTC timestamp" });
  }

  if (isInvalidOptionalText(device)) {
    return res.status(400).json({
      error: "device must be a non-empty string when provided",
    });
  }

  if (isInvalidOptionalText(merchant)) {
    return res.status(400).json({
      error: "merchant must be a non-empty string when provided",
    });
  }
  try {
    const data = {
      account_id,
      amount,
      currency,
      device,
      merchant,
      occurred_at,
    };
    const createdTransaction = await createTransaction(data);

    return res.status(201).json(createdTransaction);
  } catch (error) {
    next(error);
  }
};

exports.statusUpdateHandler = async (req, res, next) => {
  const { transaction_status } = req.body || {};
  const transactionId = Number(req.params.transactionId);

  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return res
      .status(400)
      .json({ error: "transactionId must be a positive integer" });
  }

  if (transaction_status === undefined) {
    return res.status(400).json({ error: "transaction_status is required" });
  }

  if (!["COMPLETED", "DECLINED"].includes(transaction_status)) {
    return res
      .status(400)
      .json({ error: "transaction_status must be COMPLETED or DECLINED" });
  }

  try {
    const resolution = await resolvePendingTransactionStatus(
      transactionId,
      transaction_status,
    );

    if (resolution.outcome === "NOT_FOUND") {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (resolution.outcome === "CONFLICT") {
      return res.status(409).json({
        error: "Transaction is not pending",
        current_status: resolution.currentStatus,
      });
    }

    if (resolution.outcome === "UPDATED") {
      return res.status(200).json(resolution.transaction);
    }

    throw new Error("Unexpected transaction resolution outcome");
  } catch (error) {
    next(error);
  }
};
