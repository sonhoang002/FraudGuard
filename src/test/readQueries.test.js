jest.mock("../../database/pool");

const pool = require("../../database/pool");
const db = require("../../database/readQueries");

beforeEach(() => {
  jest.resetAllMocks();
});

test("getPendingTransactions queries all pending transactions when username is omitted", async () => {
  const expectedRows = [
    {
      transaction_id: 1,
      username: "Customer1",
      amount: "100.00",
      currency: "USD",
      merchant: "Example1",
      transaction_status: "PENDING",
      occurred_at: "2026-08-26T12:00:00.000Z",
    },
    {
      transaction_id: 2,
      username: "Customer2",
      amount: "102.00",
      currency: "CAD",
      merchant: "Example2",
      transaction_status: "PENDING",
      occurred_at: "2026-08-26T12:00:10.000Z",
    },
  ];

  pool.query.mockResolvedValue({ rows: expectedRows });
  const result = await db.getPendingTransactions();
  const [sql, values] = pool.query.mock.calls[0];

  expect(values).toStrictEqual([]);
  expect(sql).toContain("t.transaction_status = 'PENDING'");
  expect(sql).not.toContain("u.username = $1");
  expect(pool.query).toHaveBeenCalledTimes(1);
  expect(result).toStrictEqual(expectedRows);
});

test("getPendingTransactions filters pending transactions when username is provided", async () => {
  const expectedRows = [
    {
      transaction_id: 1,
      username: "Customer1",
      amount: "100.00",
      currency: "USD",
      merchant: "Example1",
      transaction_status: "PENDING",
      occurred_at: "2026-08-26T12:00:00.000Z",
    },
  ];

  pool.query.mockResolvedValue({ rows: expectedRows });
  const result = await db.getPendingTransactions("Customer1");
  const [sql, values] = pool.query.mock.calls[0];

  expect(values).toStrictEqual(["Customer1"]);
  expect(sql).toContain("t.transaction_status = 'PENDING'");
  expect(sql).toContain("u.username = $1");
  expect(sql).not.toContain("Customer1");
  expect(pool.query).toHaveBeenCalledTimes(1);
  expect(result).toStrictEqual(expectedRows);
});

test("getTransactionById returns correct transaction when valid transactionId is provided", async () => {
  const expectedRow = {
    transaction_id: 17,
    account_id: 1,
    username: "Customer1",
    amount: "100.00",
    device: "Phone",
    merchant: "Example1",
    currency: "USD",
    transaction_status: "PENDING",
    occurred_at: "2026-08-26T12:00:00.000Z",
    created_at: "2026-08-26T12:10:00.000Z",
  };
  pool.query.mockResolvedValue({ rows: [expectedRow] });
  const result = await db.getTransactionById(17);
  const [sql, values] = pool.query.mock.calls[0];

  expect(result).toStrictEqual(expectedRow);
  expect(pool.query).toHaveBeenCalledTimes(1);
  expect(sql).toContain("WHERE");
  expect(sql).toContain("t.id = $1");
  expect(values).toStrictEqual([17]);
});
