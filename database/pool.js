require("dotenv").config();

const { Pool } = require("pg");

let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
} else {
  pool = new Pool({
    host: process.env.DATABASE_HOST || "localhost",
    database: process.env.DATABASE_NAME || "fraudguard",
    port: Number(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USER || "postgres",
    password: process.env.DATABASE_PASSWORD,
  });
}

module.exports = pool;
