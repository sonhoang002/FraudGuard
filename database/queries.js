const pool = require("./pool");

async function insertStatement() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const usersInsert = await client.query(`
      INSERT INTO users (username, password_hash, created_at)
      VALUES ('Customer1', 'Some_random_password', NOW())
      RETURNING id
    `);

    const accountInsert = await client.query(
      `
      INSERT INTO accounts (user_id, account_type, created_at)
      VALUES ($1, 'transfer', NOW())
      RETURNING id
      `,
      [usersInsert.rows[0].id],
    );

    const transactionInsert1 = await client.query(
      `
      INSERT INTO transactions
        (account_id, amount, device, merchant, transaction_status, currency, occurred_at)
      VALUES
        ($1, 100.00, 'Phone', 'Someone', 'COMPLETED', 'CAD', NOW())
      RETURNING id
      `,
      [accountInsert.rows[0].id],
    );

    const transactionInsert2 = await client.query(
      `
      INSERT INTO transactions
        (account_id, amount, device, merchant, transaction_status, currency, occurred_at)
      VALUES
        ($1, 120.00, 'Laptop', 'Someone2', 'PENDING', 'USD', NOW())
      RETURNING id
      `,
      [accountInsert.rows[0].id],
    );

    await client.query(
      `
      INSERT INTO fraud_predictions
        (transaction_id, model_version, score_probability, decision)
      VALUES
        ($1, 'v0.1', 0.00, 'APPROVE')
      `,
      [transactionInsert1.rows[0].id],
    );

    await client.query(
      `
      INSERT INTO fraud_predictions
        (transaction_id, model_version, score_probability, decision)
      VALUES
        ($1, 'v0.1', 0.80, 'REVIEW')
      `,
      [transactionInsert2.rows[0].id],
    );

    await client.query(
      `
      INSERT INTO fraud_predictions
        (transaction_id, model_version, score_probability, decision)
      VALUES
        ($1, 'v0.2', 0.75, 'REVIEW')
      `,
      [transactionInsert2.rows[0].id],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

insertStatement().catch(console.error);
