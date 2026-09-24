function getFraudDecision(score) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    throw new TypeError("score must be a finite number");
  }

  if (score < 0 || score > 1) {
    throw new RangeError("score must be between 0 and 1");
  }

  if (score >= 0.9) {
    return "BLOCK";
  }
  if (score >= 0.5) {
    return "REVIEW";
  }
  return "APPROVE";
}

module.exports = { getFraudDecision };
