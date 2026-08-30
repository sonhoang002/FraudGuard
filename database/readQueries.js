const pool = require("./pool");

async function getPendingTransactions(username) {
  let query = `
        SELECT
            t.id AS transaction_id,
            u.username,
            t.amount,
            t.currency,
            t.merchant,
            t.transaction_status,
            t.occurred_at
        FROM
            users AS u
        JOIN
            accounts AS a
        ON
            u.id = a.user_id
        JOIN
            transactions AS t
        ON
            a.id = t.account_id
        WHERE
            t.transaction_status = 'PENDING'
        `;

  const values = [];

  if (username !== undefined) {
    query += ` AND u.username = $1`;
    values.push(username);
  }

  query += ` ORDER BY
             t.occurred_at DESC`;

  const result = await pool.query(query, values);

  return result.rows;
}

async function getTransactionPredictionHistory(transactionId) {
  const result = await pool.query(
    `
        SELECT
            t.id AS transaction_id,
            t.amount,
            t.transaction_status,
            fp.id AS prediction_id,
            fp.model_version,
            fp.score_probability,
            fp.decision,
            fp.created_at AS prediction_created_at
        FROM
            transactions AS t
        JOIN
            fraud_predictions AS fp
        ON
            t.id = fp.transaction_id
        WHERE
            t.id = $1
        ORDER BY
            fp.created_at DESC,
            fp.id DESC`,
    [transactionId],
  );

  return result.rows;
}

async function getTransactionStatusById(transactionId) {
  const result = await pool.query(
    `
    SELECT
        id, transaction_status
    FROM
        transactions
    WHERE
        id = $1`,
    [transactionId],
  );

  return result.rows[0];
}

async function getTransactionById(transactionId) {
  const result = await pool.query(
    `
        SELECT
            t.id AS transaction_id,
            t.account_id,
            u.username,
            t.amount,
            t.device,
            t.merchant,
            t.currency,
            t.transaction_status,
            t.occurred_at,
            t.created_at
        FROM
            transactions AS t
        JOIN
            accounts AS a
        ON
            t.account_id = a.id
        JOIN
            users AS u
        ON
            a.user_id = u.id
        WHERE
            t.id = $1`,
    [transactionId],
  );

  return result.rows[0];
}

module.exports = {
  getPendingTransactions,
  getTransactionPredictionHistory,
  getTransactionStatusById,
  getTransactionById,
};
