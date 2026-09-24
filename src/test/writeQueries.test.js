jest.mock("../../database/pool");

const pool = require("../../database/pool");
const {
  createTransaction,
  updatePendingTransactionStatus,
  createFraudPrediction,
} = require("../../database/writeQueries");

beforeEach(() => {
  jest.resetAllMocks();
});

test("sends merchant_category as a parameterized SQL value", async () => {
  const transactionData = {
    account_id: 4,
    amount: "100.00",
    device: "Phone",
    merchant: "Example",
    merchant_category: "es_transportation",
    currency: "USD",
    occurred_at: "2026-08-26T12:00:00.000Z",
  };

  pool.query.mockResolvedValue({
    rows: [
      {
        id: 1,
        ...transactionData,
        transaction_status: "PENDING",
      },
    ],
  });

  await createTransaction(transactionData);

  expect(pool.query).toHaveBeenCalledTimes(1);

  const [sql, values] = pool.query.mock.calls[0];

  expect(sql).toContain("merchant_category");

  expect(sql).not.toContain("es_transportation");

  expect(values).toEqual([
    4,
    "100.00",
    "Phone",
    "Example",
    "es_transportation",
    "USD",
    "2026-08-26T12:00:00.000Z",
  ]);
});

test("returns the database row", async () => {
  const transactionData = {
    account_id: 4,
    amount: "100.00",
    device: "Phone",
    merchant: "Example",
    merchant_category: "es_transportation",
    currency: "USD",
    occurred_at: "2026-08-26T12:00:00.000Z",
  };

  const databaseRow = {
    id: 1,
    ...transactionData,
    transaction_status: "PENDING",
    created_at: "2026-08-26T12:00:10.000Z",
  };

  pool.query.mockResolvedValue({
    rows: [databaseRow],
  });

  const result = await createTransaction(transactionData);

  expect(result).toEqual(databaseRow);
});

test("updatePendingTransactionStatus returns merchant_category from updated transaction", async () => {
  const expectedRow = {
    id: 17,
    account_id: 4,
    amount: "100.00",
    currency: "USD",
    device: "Phone",
    merchant: "Example",
    merchant_category: "es_transportation",
    transaction_status: "COMPLETED",
    occurred_at: "2026-08-26T12:00:00.000Z",
  };

  pool.query.mockResolvedValue({
    rows: [expectedRow],
  });

  const result = await updatePendingTransactionStatus(17, "COMPLETED");

  const [sql, values] = pool.query.mock.calls[0];

  expect(pool.query).toHaveBeenCalledTimes(1);

  expect(sql).toContain("RETURNING");
  expect(sql).toContain("merchant_category");

  expect(values).toStrictEqual(["COMPLETED", 17]);

  expect(result).toStrictEqual(expectedRow);
});

test("uses parameterized values in the correct order and returns the database row unchanged", async () => {
  const predictionData = {
    transaction_id: 17,
    model_version: "banksim_logistic_v1",
    score_probability: 0.823451,
    decision: "REVIEW",
  };

  const expectedRow = {
    prediction_id: 42,
    transaction_id: 17,
    model_version: "banksim_logistic_v1",
    score_probability: "0.823451",
    decision: "REVIEW",
    prediction_created_at: "2026-09-23T23:30:00.125Z",
  };

  pool.query.mockResolvedValue({
    rows: [expectedRow],
  });

  const result = await createFraudPrediction(predictionData);

  const [sql, values] = pool.query.mock.calls[0];

  expect(values).toEqual([17, "banksim_logistic_v1", 0.823451, "REVIEW"]);

  expect(sql).toContain("$1");
  expect(sql).toContain("$2");
  expect(sql).toContain("$3");
  expect(sql).toContain("$4");

  expect(sql).not.toContain("$5");
  expect(sql).not.toContain("banksim_logistic_v1");
  expect(sql).not.toContain("0.823451");
  expect(sql).not.toContain("REVIEW");

  expect(result).toBe(expectedRow);
});
