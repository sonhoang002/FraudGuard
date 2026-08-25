CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    account_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    amount NUMERIC(12, 2) NOT NULL
        CHECK (amount > 0),
    device TEXT,
    merchant TEXT,
    transaction_status TEXT NOT NULL 
        CHECK (
            transaction_status IN (
                'PENDING',
                'COMPLETED',
                'DECLINED',
                'REFUNDED'
            )
        ),
    currency CHAR(3) NOT NULL
        CHECK (currency ~ '^[A-Z]{3}$'),
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fraud_predictions (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id),
    model_version TEXT NOT NULL,
    score_probability NUMERIC NOT NULL 
        CHECK (score_probability >= 0 AND score_probability <= 1),
    decision TEXT NOT NULL
        CHECK (decision IN ('APPROVE', 'REVIEW', 'BLOCK')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_user_id
ON accounts(user_id);

CREATE INDEX idx_transactions_account_id
ON transactions(account_id);

CREATE INDEX idx_fraud_predictions_transaction_id
ON fraud_predictions(transaction_id);

INSERT INTO users (username, password_hash, created_at)
VALUES ('Customer1', 'Some_random_password', now());

INSERT INTO accounts (user_id, account_type, created_at)
VALUES ('')