const pool = require("./pool");

async function getPendingTransactionsByUsername(username) {
  const result = await pool.query(
    `
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
            u.username = $1
        AND
            t.transaction_status = 'PENDING'
        ORDER BY
            t.occurred_at DESC`,
    [username],
  );

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

module.exports = {
  getPendingTransactionsByUsername,
  getTransactionPredictionHistory,
};
