const express = require("express");
const app = express();

const transactionRoute = require("./routes/transactionRoutes");
const errorMiddleware = require("./middleware/errorHandler");
const notFoundMiddleware = require("./middleware/notFoundHandler");

app.use(express.json());

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/transactions", transactionRoute);

app.use(notFoundMiddleware.notFoundHandler);
app.use(errorMiddleware.errorHandler);

module.exports = app;
