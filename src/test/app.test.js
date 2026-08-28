jest.mock("../../database/readQueries");
jest.mock("../../database/writeQueries");

const request = require("supertest");
const app = require("../app");

const db = require("../../database/readQueries");
const writeDb = require("../../database/writeQueries");

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

test("POST failing because of given transaction status", async () => {
  const expectedReturnBody = { error: "Do not supply transaction status." };
  const expectedReturnCode = 400;

  const response = await request(app).post("/api/transactions").send({
    account_id: 5,
    amount: "100.00",
    currency: "USD",
    device: "Phone",
    merchant: "Example",
    occurred_at: "2026-08-26T12:00:00.000Z",
    transaction_status: "COMPLETED",
  });

  expect(response.statusCode).toBe(expectedReturnCode);
  expect(response.body).toStrictEqual(expectedReturnBody);
  expect(writeDb.createTransaction).not.toHaveBeenCalled();
});

test.each(["account_id", "amount", "currency", "occurred_at"])(
  "POST /api/transactions returns 400 when %s is missing",
  async (missingField) => {
    const expectedReturnBody = {
      error: "account_id, amount, currency, and occurred_at are required",
    };
    const expectedReturnCode = 400;
    const validRequestObject = {
      account_id: 5,
      amount: "100.00",
      currency: "USD",
      device: "Phone",
      merchant: "Example",
      occurred_at: "2026-08-26T12:00:00.000Z",
    };
    const requestBody = { ...validRequestObject };
    delete requestBody[missingField];

    const response = await request(app)
      .post("/api/transactions")
      .send(requestBody);

    expect(response.statusCode).toBe(expectedReturnCode);
    expect(response.body).toStrictEqual(expectedReturnBody);
    expect(writeDb.createTransaction).not.toHaveBeenCalled();
  },
);

test.each(["abc", "5", 1.5, 0, -1, null])(
  "POST /api/transactions returns 400 when account_id %s is not a positive integer",
  async (accountId) => {
    const expectedReturnBody = {
      error: "account_id must be a positive integer",
    };
    const expectedReturnCode = 400;
    const validRequestObject = {
      account_id: accountId,
      amount: "100.00",
      currency: "USD",
      device: "Phone",
      merchant: "Example",
      occurred_at: "2026-08-26T12:00:00.000Z",
    };

    const response = await request(app)
      .post("/api/transactions")
      .send(validRequestObject);

    expect(response.statusCode).toBe(expectedReturnCode);
    expect(response.body).toStrictEqual(expectedReturnBody);
    expect(writeDb.createTransaction).not.toHaveBeenCalled();
  },
);

test.each([
  "abc",
  "-100.00",
  "0",
  "0.00",
  111,
  "100.001",
  "10000000000.00",
  "",
  null,
])(
  "POST /api/transactions returns 400 when amount %s is not a positive decimal string",
  async (amount) => {
    const expectedReturnBody = {
      error:
        "amount must be a positive decimal string with up to 2 decimal places",
    };
    const expectedReturnCode = 400;
    const validRequestObject = {
      account_id: 4,
      amount: amount,
      currency: "USD",
      device: "Phone",
      merchant: "Example",
      occurred_at: "2026-08-26T12:00:00.000Z",
    };

    const response = await request(app)
      .post("/api/transactions")
      .send(validRequestObject);

    expect(response.statusCode).toBe(expectedReturnCode);
    expect(response.body).toStrictEqual(expectedReturnBody);
    expect(writeDb.createTransaction).not.toHaveBeenCalled();
  },
);

test.each(["usd", "US", "USDD", "U1D", " USD ", "", 123, null])(
  "POST /api/transactions returns 400 when currency %s is not in the right format",
  async (currency) => {
    const expectedReturnBody = {
      error: "currency must be a three-letter uppercase code",
    };
    const expectedReturnCode = 400;
    const validRequestObject = {
      account_id: 4,
      amount: "100.00",
      currency: currency,
      device: "Phone",
      merchant: "Example",
      occurred_at: "2026-08-26T12:00:00.000Z",
    };

    const response = await request(app)
      .post("/api/transactions")
      .send(validRequestObject);

    expect(response.statusCode).toBe(expectedReturnCode);
    expect(response.body).toStrictEqual(expectedReturnBody);
    expect(writeDb.createTransaction).not.toHaveBeenCalled();
  },
);

test.each([
  "not-a-date",
  "2026-02-30T12:00:00.000Z",
  "2026-08-26",
  "2026-08-26T12:00:00",
  "",
  123,
  null,
])(
  "POST /api/transactions returns 400 when occurred_at %s is not a valid ISO 8601 UTC timestamp",
  async (occurred_at) => {
    const expectedReturnBody = {
      error: "occurred_at must be a valid ISO 8601 UTC timestamp",
    };
    const expectedReturnCode = 400;
    const validRequestObject = {
      account_id: 4,
      amount: "100.00",
      currency: "USD",
      device: "Phone",
      merchant: "Example",
      occurred_at: occurred_at,
    };

    const response = await request(app)
      .post("/api/transactions")
      .send(validRequestObject);

    expect(response.statusCode).toBe(expectedReturnCode);
    expect(response.body).toStrictEqual(expectedReturnBody);
    expect(writeDb.createTransaction).not.toHaveBeenCalled();
  },
);

test.each([
  ["device", 123],
  ["device", ""],
  ["device", "   "],
  ["merchant", 123],
  ["merchant", ""],
  ["merchant", "   "],
])(
  "POST /api/transactions returns 400 when optional %s is set to %p",
  async (fieldName, invalidValue) => {
    const validRequestObject = {
      account_id: 4,
      amount: "100.00",
      currency: "USD",
      device: "Phone",
      merchant: "Example",
      occurred_at: "2026-08-26T12:00:00.000Z",
    };
    const errorMessages = {
      device: "device must be a non-empty string when provided",
      merchant: "merchant must be a non-empty string when provided",
    };

    const expectedReturnBody = {
      error: errorMessages[fieldName],
    };
    const expectedReturnCode = 400;

    validRequestObject[fieldName] = invalidValue;

    const response = await request(app)
      .post("/api/transactions")
      .send(validRequestObject);

    expect(response.statusCode).toBe(expectedReturnCode);
    expect(response.body).toStrictEqual(expectedReturnBody);
    expect(writeDb.createTransaction).not.toHaveBeenCalled();
  },
);

test("POST /api/transactions returns 201 with the created transaction", async () => {
  const fakeReturningTransaction = {
    id: 1,
    account_id: 4,
    amount: "100.00",
    currency: "USD",
    merchant: null,
    device: null,
    transaction_status: "PENDING",
    occurred_at: "2026-08-26T12:00:00.000Z",
    created_at: "2026-08-26T12:00:10.000Z",
  };
  const validRequestObject = {
    account_id: 4,
    amount: "100.00",
    currency: "USD",
    device: undefined,
    merchant: null,
    occurred_at: "2026-08-26T12:00:00.000Z",
  };
  const expectedReturnCode = 201;

  writeDb.createTransaction.mockResolvedValue(fakeReturningTransaction);

  const response = await request(app)
    .post("/api/transactions")
    .send(validRequestObject);

  expect(response.statusCode).toBe(expectedReturnCode);
  expect(response.body).toStrictEqual(fakeReturningTransaction);
  expect(writeDb.createTransaction).toHaveBeenCalledTimes(1);
  expect(writeDb.createTransaction).toHaveBeenCalledWith(validRequestObject);
});

test("POST /api/transactions returns 500 when the database is unavailable", async () => {
  const validRequestObject = {
    account_id: 4,
    amount: "100.00",
    currency: "USD",
    device: undefined,
    merchant: null,
    occurred_at: "2026-08-26T12:00:00.000Z",
  };
  const expectedReturnCode = 500;
  const expectedReturnBody = { error: "Internal server error" };

  writeDb.createTransaction.mockRejectedValue(
    new Error("Database unavailable"),
  );

  const response = await request(app)
    .post("/api/transactions")
    .send(validRequestObject);

  expect(response.statusCode).toBe(expectedReturnCode);
  expect(response.body).toStrictEqual(expectedReturnBody);
  expect(response.body.error).not.toContain("Database unavailable");
  expect(writeDb.createTransaction).toHaveBeenCalledTimes(1);
  expect(writeDb.createTransaction).toHaveBeenCalledWith(validRequestObject);
});
