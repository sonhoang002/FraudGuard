jest.mock("../../database/readQueries");

const request = require("supertest");
const app = require("../app");

const db = require("../../database/readQueries");

beforeEach(() => {
  jest.resetAllMocks();
});

test("GET /health returns status 200 and an OK response body", async () => {
  const expectedReturnCode = 200;
  const expectedReturnBody = { status: "ok" };

  const response = await request(app).get("/health");

  expect(response.statusCode).toBe(expectedReturnCode);
  expect(response.body).toStrictEqual(expectedReturnBody);
});

test("GET /api/unknown returns status 404 and a route not found error", async () => {
  const expectedReturnCode = 404;
  const expectedReturnBody = { error: "Route not found" };

  const response = await request(app).get("/api/unknown");

  expect(response.statusCode).toBe(expectedReturnCode);
  expect(response.body).toStrictEqual(expectedReturnBody);
});

test("GET /api/transactions/pending returns 400 when username is missing", async () => {
  const expectedReturnCode = 400;
  const expectedReturnBody = { error: "username is required" };

  const response = await request(app).get("/api/transactions/pending");

  expect(response.statusCode).toBe(expectedReturnCode);
  expect(response.body).toStrictEqual(expectedReturnBody);
});

test.each(["abc", 1.5, 0, -1])(
  "GET predictions returns 400 when transactionId %s",
  async (invalidId) => {
    const expectedReturnCode = 400;
    const expectedReturnBody = {
      error: "transactionId must be a positive integer",
    };

    const response = await request(app).get(
      `/api/transactions/${invalidId}/predictions`,
    );

    expect(response.statusCode).toBe(expectedReturnCode);
    expect(response.body).toStrictEqual(expectedReturnBody);
  },
);

test("GET /api/transactions/pending?username=Customer1 returns 200 with pending transactions", async () => {
  const fakePendingTransactions = [
    {
      transaction_id: 1,
      username: "Customer1",
      amount: "100.00",
      currency: "USD",
      merchant: "Apple",
      transaction_status: "PENDING",
      occurred_at: "2026-08-26T12:00:00.000Z",
    },
  ];

  db.getPendingTransactionsByUsername.mockResolvedValue(
    fakePendingTransactions,
  );

  const expectedReturnCode = 200;

  const response = await request(app).get(
    "/api/transactions/pending?username=Customer1",
  );

  expect(response.statusCode).toBe(expectedReturnCode);
  expect(response.body).toStrictEqual(fakePendingTransactions);
  expect(db.getPendingTransactionsByUsername).toHaveBeenCalledWith("Customer1");
});

test("GET pending transactions returns 500 when the database query fails", async () => {
  const databaseError = new Error("Database unavailable");
  const expectedReturnBody = { error: "Internal server error" };
  const expectedReturnCode = 500;

  db.getPendingTransactionsByUsername.mockRejectedValue(databaseError);
  const response = await request(app).get(
    "/api/transactions/pending?username=Customer1",
  );

  expect(response.statusCode).toBe(expectedReturnCode);
  expect(response.body).toStrictEqual(expectedReturnBody);
});

test("GET /api/transactions/4/predictions returns 200 with prediction history", async () => {
  const fakePredictionArray = [
    {
      transaction_id: 4,
      amount: "100.00",
      transaction_status: "PENDING",
      prediction_id: 5,
      model_version: "v0.2",
      score_probability: "0.75",
      decision: "REVIEW",
      prediction_created_at: "2026-08-26T12:00:00.000Z",
    },
  ];

  db.getTransactionPredictionHistory.mockResolvedValue(fakePredictionArray);

  const response = await request(app).get("/api/transactions/4/predictions");

  expect(response.statusCode).toBe(200);
  expect(response.body).toStrictEqual(fakePredictionArray);
  expect(db.getTransactionPredictionHistory).toHaveBeenCalledWith(4);
});

test("GET /api/transactions/99999/predictions returns 200 but with an empty prediction history", async () => {
  db.getTransactionPredictionHistory.mockResolvedValue([]);

  const response = await request(app).get(
    "/api/transactions/99999/predictions",
  );

  expect(response.statusCode).toBe(200);
  expect(response.body).toStrictEqual([]);
  expect(db.getTransactionPredictionHistory).toHaveBeenCalledWith(99999);
});

test("GET prediction history returns 500 when the database query fails", async () => {
  const databaseError = new Error("Database unavailable");
  const expectedReturnBody = { error: "Internal server error" };
  const expectedReturnCode = 500;

  db.getTransactionPredictionHistory.mockRejectedValue(databaseError);

  const response = await request(app).get("/api/transactions/4/predictions");

  expect(response.statusCode).toBe(expectedReturnCode);
  expect(response.body).toStrictEqual(expectedReturnBody);
  expect(db.getTransactionPredictionHistory).toHaveBeenCalledWith(4);
});
