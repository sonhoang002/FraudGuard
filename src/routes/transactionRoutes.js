const express = require("express");
const transactionRoute = express.Router();

const transactionController = require("../controllers/transactionController");

transactionRoute.get("/pending", transactionController.getPendingTransactions);
transactionRoute.get(
  "/:transactionId/predictions",
  transactionController.getTransactionPredictionHistory,
);
module.exports = transactionRoute;
