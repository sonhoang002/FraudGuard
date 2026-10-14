ALTER TABLE fraud_predictions
ADD COLUMN decision_policy_version TEXT;

UPDATE fraud_predictions
SET decision_policy_version = 'legacy_unversioned'
WHERE decision_policy_version IS NULL;

ALTER TABLE fraud_predictions
ADD CONSTRAINT fraud_predictions_decision_policy_version_not_blank
CHECK (btrim(decision_policy_version) <> '');

ALTER TABLE fraud_predictions
ALTER COLUMN decision_policy_version SET NOT NULL;