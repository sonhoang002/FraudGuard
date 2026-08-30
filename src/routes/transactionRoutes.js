const express = require("express");
const transactionRoute = express.Router();

const transactionController = require("../controllers/transactionController");

transactionRoute.get("/pending", transactionController.getPendingTransactions);
transactionRoute.get(
  "/:transactionId",
  transactionController.getTransactionById,
);
transactionRoute.get(
  "/:transactionId/predictions",
  transactionController.getTransactionPredictionHistory,
);

transactionRoute.post("/", transactionController.createTransaction);

transactionRoute.patch(
  "/:transactionId/status",
  transactionController.statusUpdateHandler,
);
module.exports = transactionRoute;
