const pool = require("./pool");

async function createTransaction(data) {
  const {
    account_id,
    amount,
    currency,
    device,
    merchant_category,
    merchant,
    occurred_at,
  } = data;

  const deviceValue = device ?? null;
  const merchantValue = merchant ?? null;

  const result = await pool.query(
    `
    INSERT INTO 
      transactions (account_id, amount, device, merchant, merchant_category, transaction_status, currency, occurred_at)
    VALUES
      ($1, $2, $3, $4, $5, 'PENDING', $6, $7)
    RETURNING id, account_id, amount, device, merchant, merchant_category, transaction_status, currency, occurred_at, created_at`,
    [
      account_id,
      amount,
      deviceValue,
      merchantValue,
      merchant_category,
      currency,
      occurred_at,
    ],
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
      id, account_id, amount, device, merchant, merchant_category, transaction_status, currency, occurred_at, created_at`,
    [transactionStatus, transactionId],
  );

  return result.rows[0];
}

async function createFraudPrediction(data) {
  const { transaction_id, model_version, score_probability, decision } = data;
  const result = await pool.query(
    `
    INSERT INTO
      fraud_predictions (transaction_id, model_version, score_probability, decision)
    VALUES
      ($1, $2, $3, $4)
    RETURNING
      id AS prediction_id,
      transaction_id,
      model_version,
      score_probability,
      decision,
      created_at AS prediction_created_at
    `,
    [transaction_id, model_version, score_probability, decision],
  );

  return result.rows[0];
}

module.exports = {
  createTransaction,
  updatePendingTransactionStatus,
  createFraudPrediction,
};
