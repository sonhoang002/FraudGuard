INSERT INTO users (username, password_hash, created_at)
VALUES ('Customer1', 'Some_random_password', NOW())
RETURNING id

INSERT INTO transactions
(account_id, amount, device, merchant, transaction_status, currency, occurred_at)
VALUES
(1, -50.00, 'Phone', 'Someone', 'COMPLETED', 'CAD', NOW())
RETURNING id

INSERT INTO transactions
(account_id, amount, device, merchant, transaction_status, currency, occurred_at)
VALUES
(1, 100.00, 'Phone', 'Someone', 'COMPLETED', 'cad', NOW())
RETURNING id

INSERT INTO transactions
(account_id, amount, device, merchant, transaction_status, currency, occurred_at)
VALUES
(1, 100.00, 'Phone', 'Someone', 'COMPLETED', 'CA', NOW())
RETURNING id

INSERT INTO fraud_predictions
(transaction_id, model_version, score_probability, decision)
VALUES
(1, 'v0.1', 1.20, 'REVIEW')

INSERT INTO fraud_predictions
(transaction_id, model_version, score_probability, decision)
VALUES
(1, 'v0.1', 0.20, 'HOLD')

INSERT INTO accounts (user_id, account_type, created_at)
VALUES (3, 'transfer', NOW())
RETURNING id

SELECT username, account_type, amount, merchant, transaction_status, occurred_at, model_version, score_probability, decision
FROM users
JOIN accounts
ON users.id = accounts.user_id
JOIN transactions
ON accounts.id = transactions.account_id
JOIN fraud_predictions
ON transactions.id = fraud_predictions.transaction_id
WHERE username = 'Customer1'
ORDER BY occurred_at DESC