const pool = require("./pool");

async function createTransaction(data) {
  const { account_id, amount, currency, device, merchant, occurred_at } = data;

  const deviceValue = device ?? null;
  const merchantValue = merchant ?? null;

  const result = await pool.query(
    `
    INSERT INTO 
      transactions (account_id, amount, device, merchant, transaction_status, currency, occurred_at)
    VALUES
      ($1, $2, $3, $4, 'PENDING', $5, $6)
    RETURNING id, account_id, amount, device, merchant, transaction_status, currency, occurred_at, created_at`,
    [account_id, amount, deviceValue, merchantValue, currency, occurred_at],
  );

  return result.rows[0];
}

async function updatePendingTransactionStatus(
  transactionId,
  transactionStatus,
) {
  const result = await pool.query(
    `
    UPDATE
      transactions
    SET
      transaction_status = $1
    WHERE
      id = $2
    AND
      transaction_status = 'PENDING'
    RETURNING
      id, account_id, amount, device, merchant, transaction_status, currency, occurred_at, created_at`,
    [transactionStatus, transactionId],
  );

  return result.rows[0];
}

module.exports = { createTransaction, updatePendingTransactionStatus };
