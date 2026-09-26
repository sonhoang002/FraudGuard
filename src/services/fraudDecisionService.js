const REVIEW_THRESHOLD = 0.5;
const BLOCK_THRESHOLD = 0.9;

function getFraudDecision(score) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    throw new TypeError("score must be a finite number");
  }

  if (score < 0 || score > 1) {
    throw new RangeError("score must be between 0 and 1");
  }

  if (score >= BLOCK_THRESHOLD) {
    return "BLOCK";
  }
  if (score >= REVIEW_THRESHOLD) {
    return "REVIEW";
  }
  return "APPROVE";
}

function getFraudDecisionExplanation(score) {
  const fraudDecision = getFraudDecision(score);

  return {
    decision: fraudDecision,
    reason_code:
      fraudDecision === "REVIEW"
        ? "SCORE_IN_REVIEW_RANGE"
        : fraudDecision === "APPROVE"
          ? "SCORE_BELOW_REVIEW_THRESHOLD"
          : "SCORE_AT_OR_ABOVE_BLOCK_THRESHOLD",
    summary:
      fraudDecision === "REVIEW"
        ? `The score is at least ${REVIEW_THRESHOLD.toFixed(2)} and below ${BLOCK_THRESHOLD.toFixed(2)}, so manual review is required.`
        : fraudDecision === "APPROVE"
          ? `The score is below ${REVIEW_THRESHOLD.toFixed(2)}, so the transaction is approved.`
          : `The score is at least ${BLOCK_THRESHOLD.toFixed(2)}, so the transaction is blocked.`,
    limitation:
      "This score is a ranking signal from a synthetic-data model, not a calibrated real-world fraud probability.",
  };
}

module.exports = { getFraudDecision, getFraudDecisionExplanation };
