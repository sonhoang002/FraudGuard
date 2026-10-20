const path = require("node:path");
const fs = require("node:fs/promises");
const pool = require("../../database/pool");
const { applySchema } = require("../../database/migrate");

jest.mock("node:fs/promises", () => ({
  readFile: jest.fn(),
}));

jest.mock("../../database/pool", () => ({
  query: jest.fn(),
  end: jest.fn(),
}));

const schemaPath = path.resolve(__dirname, "../../database/schema.sql");
const sampleSql = "CREATE TABLE example (id INTEGER PRIMARY KEY);";

beforeEach(() => {
  jest.resetAllMocks();
});

test("reads schema.sql and executes its SQL without closing the pool", async () => {
  fs.readFile.mockResolvedValue(sampleSql);
  pool.query.mockResolvedValue({});

  await applySchema();

  expect(fs.readFile).toHaveBeenCalledTimes(1);
  expect(fs.readFile).toHaveBeenCalledWith(schemaPath, "utf8");
  expect(pool.query).toHaveBeenCalledTimes(1);
  expect(pool.query).toHaveBeenCalledWith(sampleSql);
  expect(pool.end).not.toHaveBeenCalled();
});

test("propagates query errors without closing the pool", async () => {
  const queryError = new Error("schema migration failed");
  fs.readFile.mockResolvedValue(sampleSql);
  pool.query.mockRejectedValue(queryError);

  await expect(applySchema()).rejects.toBe(queryError);

  expect(pool.query).toHaveBeenCalledWith(sampleSql);
  expect(pool.end).not.toHaveBeenCalled();
});
