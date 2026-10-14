jest.mock("../../database/pool");

const pool = require("../../database/pool");
const { insertStatement } = require("../../database/queries");

beforeEach(() => {
  jest.resetAllMocks();
});

function createMockClient() {
  return {
    query: jest.fn(),
    release: jest.fn(),
  };
}

test("commits the current-schema seed with one checked-out client", async () => {
  const client = createMockClient();

  client.query
    .mockResolvedValueOnce()
    .mockResolvedValueOnce({ rows: [{ id: 1 }] })
    .mockResolvedValueOnce({ rows: [{ id: 2 }] })
    .mockResolvedValueOnce({ rows: [{ id: 3 }] })
    .mockResolvedValueOnce({ rows: [{ id: 4 }] })
    .mockResolvedValueOnce()
    .mockResolvedValueOnce()
    .mockResolvedValueOnce()
    .mockResolvedValueOnce();

  pool.connect.mockResolvedValue(client);

  await insertStatement();

  expect(pool.connect).toHaveBeenCalledTimes(1);
  expect(client.query).toHaveBeenCalledTimes(9);
  expect(client.query.mock.calls[0]).toEqual(["BEGIN"]);
  expect(client.query.mock.calls.at(-1)).toEqual(["COMMIT"]);
  expect(client.query).not.toHaveBeenCalledWith("ROLLBACK");
  expect(client.release).toHaveBeenCalledTimes(1);

  const sqlStatements = client.query.mock.calls.map(([sql]) => sql);
  const transactionInserts = sqlStatements.filter((sql) =>
    sql.includes("INSERT INTO transactions"),
  );
  const predictionInserts = sqlStatements.filter((sql) =>
    sql.includes("INSERT INTO fraud_predictions"),
  );

  expect(transactionInserts).toHaveLength(2);
  expect(transactionInserts[0]).toContain("merchant_category");
  expect(transactionInserts[0]).toContain("'es_transportation'");
  expect(transactionInserts[1]).toContain("merchant_category");
  expect(transactionInserts[1]).toContain("'es_fashion'");

  expect(predictionInserts).toHaveLength(3);
  predictionInserts.forEach((sql) => {
    expect(sql).toContain("decision_policy_version");
    expect(sql).toContain("'legacy_unversioned'");
  });
});

test("rolls back and releases the client when a seed insert fails", async () => {
  const client = createMockClient();
  const seedError = new Error("Prediction insert failed");

  client.query
    .mockResolvedValueOnce()
    .mockResolvedValueOnce({ rows: [{ id: 1 }] })
    .mockResolvedValueOnce({ rows: [{ id: 2 }] })
    .mockResolvedValueOnce({ rows: [{ id: 3 }] })
    .mockResolvedValueOnce({ rows: [{ id: 4 }] })
    .mockRejectedValueOnce(seedError)
    .mockResolvedValueOnce();

  pool.connect.mockResolvedValue(client);

  await expect(insertStatement()).rejects.toBe(seedError);

  expect(client.query.mock.calls.at(-1)).toEqual(["ROLLBACK"]);
  expect(client.query).not.toHaveBeenCalledWith("COMMIT");
  expect(client.release).toHaveBeenCalledTimes(1);
});
