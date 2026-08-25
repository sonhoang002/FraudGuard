SELECT 
    transactions.id AS transaction_id, username, account_type, amount, currency, merchant, transaction_status, occurred_at
FROM 
    users
JOIN
    accounts
ON
    users.id = accounts.user_id
JOIN
    transactions
ON
    accounts.id = transactions.account_id
WHERE 
    transactions.transaction_status = 'PENDING'
ORDER BY
    transactions.occurred_at DESC

SELECT
    transactions.id AS transaction_id, fraud_predictions.transaction_id AS prediction_transaction_id, amount, transaction_status, fraud_predictions.id AS prediction_id, model_version, score_probability, decision, fraud_predictions.created_at
FROM
    transactions
JOIN
    fraud_predictions
ON
    fraud_predictions.transaction_id = transactions.id
WHERE
    transactions.id = 4
ORDER BY
    fraud_predictions.created_at DESC

INSERT INTO fraud_predictions(transaction_id, model_version, score_probability, decision)
VALUES (4, 'v0.2', 0.75, 'REVIEW')

SELECT
    t.id AS transaction_id,
    u.username, 
    t.amount, 
    t.transaction_status, 
    fp.id AS prediction_id, 
    fp.model_version, 
    fp.score_probability, 
    fp.decision
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
LEFT JOIN
    fraud_predictions AS fp
ON
    t.id = fp.transaction_id
WHERE
    u.username = 'Customer1'
ORDER BY
    t.occurred_at DESC,
    t.id DESC,
    fp.created_at DESC,
    fp.id DESC;