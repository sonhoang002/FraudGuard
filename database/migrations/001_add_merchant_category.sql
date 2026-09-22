ALTER TABLE transactions
ADD COLUMN merchant_category TEXT NOT NULL
DEFAULT 'UNKNOWN'
CHECK (btrim(merchant_category) <> '');

ALTER TABLE transactions
ALTER COLUMN merchant_category DROP DEFAULT;