const pool = require("./pool");
const fs = require("node:fs/promises");
const path = require("node:path");

async function applySchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  await pool.query(schemaSql);
}

async function main() {
  try {
    await applySchema();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { applySchema };
