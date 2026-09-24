jest.mock("../../database/writeQueries");
jest.mock("../clients/mlServiceClient");

const {
  createTransaction,
  updatePendingTransactionStatus,
  createFraudPrediction,
} = require("../../database/writeQueries");

const { getFraudPrediction } = require("../clients/mlServiceClient");

const { createAndScoreTransaction } = require("../services/transactionService");

beforeEach(() => {
  jest.resetAllMocks();
});

test("creates a pending transaction, scores it, stores REVIEW prediction, and leaves transaction pending", async () => {
  const transactionData = {
    account_id: 4,
    amount: "125.50",
    merchant: "Campus Store",
    merchant_category: "es_fashion",
    device: "mobile",
    currency: "USD",
    occurred_at: "2026-09-23T23:29:45.000Z",
  };

  const createdTransaction = {
    id: 17,
    account_id: 4,
    amount: "125.50",
    merchant: "Campus Store",
    merchant_category: "es_fashion",
    device: "mobile",
    currency: "USD",
    transaction_status: "PENDING",
    created_at: "2026-09-23T23:30:00.000Z",
    occurred_at: "2026-09-23T23:29:45.000Z",
  };

  const mlPrediction = {
    fraud_probability: 0.823451,
    model_version: "banksim_logistic_v1",
  };

  const storedPrediction = {
    prediction_id: 42,
    transaction_id: 17,
    model_version: "banksim_logistic_v1",
    score_probability: "0.823451",
    decision: "REVIEW",
    prediction_created_at: "2026-09-23T23:30:00.125Z",
  };

  createTransaction.mockResolvedValue(createdTransaction);
  getFraudPrediction.mockResolvedValue(mlPrediction);
  createFraudPrediction.mockResolvedValue(storedPrediction);

  const result = await createAndScoreTransaction(transactionData);

  expect(createTransaction).toHaveBeenCalledWith(transactionData);

  expect(getFraudPrediction).toHaveBeenCalledWith({
    amount: createdTransaction.amount,
    merchant_category: createdTransaction.merchant_category,
  });

  expect(createFraudPrediction).toHaveBeenCalledWith({
    transaction_id: createdTransaction.id,
    model_version: "banksim_logistic_v1",
    score_probability: 0.823451,
    decision: "REVIEW",
  });

  expect(updatePendingTransactionStatus).not.toHaveBeenCalled();

  expect(createTransaction.mock.invocationCallOrder[0]).toBeLessThan(
    getFraudPrediction.mock.invocationCallOrder[0],
  );

  expect(getFraudPrediction.mock.invocationCallOrder[0]).toBeLessThan(
    createFraudPrediction.mock.invocationCallOrder[0],
  );

  expect(result).toEqual({
    transaction: createdTransaction,
    scoring: {
      status: "SUCCESS",
      prediction: storedPrediction,
    },
  });
});

test.each([
  "ML_SERVICE_TIMEOUT",
  "ML_SERVICE_UNAVAILABLE",
  "ML_SERVICE_HTTP_ERROR",
  "ML_SERVICE_INVALID_RESPONSE",
])(
  "returns failed scoring when ML client rejects with %s",
  async (errorCode) => {
    const transactionData = {
      account_id: 4,
      amount: "125.50",
      merchant: "Campus Store",
      merchant_category: "es_fashion",
      device: "mobile",
      currency: "USD",
      occurred_at: "2026-09-23T23:29:45.000Z",
    };

    const createdTransaction = {
      id: 17,
      account_id: 4,
      amount: "125.50",
      merchant: "Campus Store",
      merchant_category: "es_fashion",
      device: "mobile",
      currency: "USD",
      transaction_status: "PENDING",
      created_at: "2026-09-23T23:30:00.000Z",
      occurred_at: "2026-09-23T23:29:45.000Z",
    };

    const mlError = new Error("ML service failure");
    mlError.code = errorCode;

    createTransaction.mockResolvedValue(createdTransaction);
    getFraudPrediction.mockRejectedValue(mlError);

    const result = await createAndScoreTransaction(transactionData);

    expect(createTransaction).toHaveBeenCalledWith(transactionData);

    expect(getFraudPrediction).toHaveBeenCalledWith({
      amount: createdTransaction.amount,
      merchant_category: createdTransaction.merchant_category,
    });

    expect(createFraudPrediction).not.toHaveBeenCalled();
    expect(updatePendingTransactionStatus).not.toHaveBeenCalled();

    expect(result.transaction.transaction_status).toBe("PENDING");

    expect(result).toEqual({
      transaction: createdTransaction,
      scoring: {
        status: "FAILED",
        prediction: null,
        error_code: errorCode,
      },
    });
  },
);

test.each([
  {
    score: 0.2,
    expectedDecision: "APPROVE",
    expectedStatus: "COMPLETED",
  },
  {
    score: 0.95,
    expectedDecision: "BLOCK",
    expectedStatus: "DECLINED",
  },
])(
  "$expectedDecision changes transaction to $expectedStatus",
  async ({ score, expectedDecision, expectedStatus }) => {
    const transactionData = {
      account_id: 4,
      amount: "125.50",
      merchant: "Campus Store",
      merchant_category: "es_fashion",
      device: "mobile",
      currency: "USD",
      occurred_at: "2026-09-23T23:29:45.000Z",
    };

    const createdTransaction = {
      id: 17,
      account_id: 4,
      amount: "125.50",
      merchant: "Campus Store",
      merchant_category: "es_fashion",
      device: "mobile",
      currency: "USD",
      transaction_status: "PENDING",
      created_at: "2026-09-23T23:30:00.000Z",
      occurred_at: "2026-09-23T23:29:45.000Z",
    };

    const mlPrediction = {
      fraud_probability: score,
      model_version: "banksim_logistic_v1",
    };

    const storedPrediction = {
      prediction_id: 42,
      transaction_id: 17,
      model_version: "banksim_logistic_v1",
      score_probability: String(score),
      decision: expectedDecision,
      prediction_created_at: "2026-09-23T23:30:00.125Z",
    };

    const updatedTransaction = {
      ...createdTransaction,
      transaction_status: expectedStatus,
    };

    createTransaction.mockResolvedValue(createdTransaction);
    getFraudPrediction.mockResolvedValue(mlPrediction);
    createFraudPrediction.mockResolvedValue(storedPrediction);
    updatePendingTransactionStatus.mockResolvedValue(updatedTransaction);

    const result = await createAndScoreTransaction(transactionData);

    expect(createFraudPrediction).toHaveBeenCalledWith({
      transaction_id: 17,
      model_version: "banksim_logistic_v1",
      score_probability: score,
      decision: expectedDecision,
    });

    expect(updatePendingTransactionStatus).toHaveBeenCalledWith(
      17,
      expectedStatus,
    );

    expect(result).toEqual({
      transaction: updatedTransaction,
      scoring: {
        status: "SUCCESS",
        prediction: storedPrediction,
      },
    });

    expect(createFraudPrediction.mock.invocationCallOrder[0]).toBeLessThan(
      updatePendingTransactionStatus.mock.invocationCallOrder[0],
    );

    expect(createTransaction).toHaveBeenCalledWith(transactionData);
  },
);

test("rethrows unexpected ML client errors", async () => {
  const transactionData = {
    account_id: 4,
    amount: "125.50",
    merchant: "Campus Store",
    merchant_category: "es_fashion",
    device: "mobile",
    currency: "USD",
    occurred_at: "2026-09-23T23:29:45.000Z",
  };

  const createdTransaction = {
    id: 17,
    account_id: 4,
    amount: "125.50",
    merchant: "Campus Store",
    merchant_category: "es_fashion",
    device: "mobile",
    currency: "USD",
    transaction_status: "PENDING",
    created_at: "2026-09-23T23:30:00.000Z",
    occurred_at: "2026-09-23T23:29:45.000Z",
  };

  const unexpectedError = new Error("Unexpected programming error");

  createTransaction.mockResolvedValue(createdTransaction);
  getFraudPrediction.mockRejectedValue(unexpectedError);

  await expect(createAndScoreTransaction(transactionData)).rejects.toBe(
    unexpectedError,
  );

  expect(createFraudPrediction).not.toHaveBeenCalled();
  expect(updatePendingTransactionStatus).not.toHaveBeenCalled();
});
