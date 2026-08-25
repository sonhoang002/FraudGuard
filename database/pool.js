require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  database: "fraudguard",
  port: 5432,
  user: "postgres",
  password: process.env.LOCAL_DATABASE_PASSWORD,
});

module.exports = pool;
