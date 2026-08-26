const {
  getPendingTransactionsByUsername,
  getTransactionPredictionHistory,
} = require("../../database/readQueries");

exports.getPendingTransactions = async (req, res, next) => {
  const username = req.query.username;

  if (!username) {
    return res.status(400).json({ error: "username is required" });
  }

  try {
    const pendingTransactions =
      await getPendingTransactionsByUsername(username);
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
