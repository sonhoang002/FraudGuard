const express = require("express");
const cors = require("cors");
const app = express();

const transactionRoute = require("./routes/transactionRoutes");
const errorMiddleware = require("./middleware/errorHandler");
const notFoundMiddleware = require("./middleware/notFoundHandler");
const healthController = require("./controllers/healthController");

const corsOption = {
  origin: (origin, callback) => {
    const allowedOrigin = process.env.FRONTEND_ORIGIN;

    const isAllowed = Boolean(allowedOrigin && origin === allowedOrigin);

    callback(null, isAllowed);
  },
};

app.use(express.json());
app.use(cors(corsOption));

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/ready", healthController.checkReadiness);
app.use("/api/transactions", transactionRoute);

app.use(notFoundMiddleware.notFoundHandler);
app.use(errorMiddleware.errorHandler);

module.exports = app;
