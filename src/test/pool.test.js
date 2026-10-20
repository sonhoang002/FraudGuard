jest.mock("dotenv", () => ({ config: jest.fn() }));
jest.mock("pg", () => ({ Pool: jest.fn() }));

const DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
];

const originalDatabaseEnv = Object.fromEntries(
  DATABASE_ENV_KEYS.map((key) => [key, process.env[key]]),
);

function loadPoolConstructor() {
  require("../../database/pool");
  return require("pg").Pool;
}

beforeEach(() => {
  jest.resetModules();

  for (const key of DATABASE_ENV_KEYS) {
    delete process.env[key];
  }
});

afterAll(() => {
  for (const [key, value] of Object.entries(originalDatabaseEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("database pool configuration", () => {
  test("uses only connectionString when DATABASE_URL is set", () => {
    const url = "postgresql://url_user:url_password@db.example.com:5432/url_db";
    process.env.DATABASE_URL = url;

    const Pool = loadPoolConstructor();

    expect(Pool).toHaveBeenCalledTimes(1);
    expect(Pool).toHaveBeenCalledWith({ connectionString: url });
  });

  test("uses separate local settings when DATABASE_URL is absent", () => {
    process.env.DATABASE_HOST = "127.0.0.1";
    process.env.DATABASE_PORT = "5433";
    process.env.DATABASE_NAME = "fraudguard_test";
    process.env.DATABASE_USER = "test_user";
    process.env.DATABASE_PASSWORD = "test_password";

    const Pool = loadPoolConstructor();

    expect(Pool).toHaveBeenCalledTimes(1);
    expect(Pool).toHaveBeenCalledWith({
      host: "127.0.0.1",
      database: "fraudguard_test",
      port: 5433,
      user: "test_user",
      password: "test_password",
    });
  });

  test("DATABASE_URL takes precedence when both formats are set", () => {
    const url = "postgresql://url_user:url_password@db.example.com:5432/url_db";
    process.env.DATABASE_URL = url;
    process.env.DATABASE_HOST = "localhost";
    process.env.DATABASE_PORT = "5433";
    process.env.DATABASE_NAME = "local_db";
    process.env.DATABASE_USER = "local_user";
    process.env.DATABASE_PASSWORD = "local_password";

    const Pool = loadPoolConstructor();

    expect(Pool).toHaveBeenCalledTimes(1);
    expect(Pool).toHaveBeenCalledWith({ connectionString: url });
  });
});
