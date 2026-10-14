const {
  getFraudDecision,
  getFraudDecisionExplanation,
  getStoredFraudDecisionExplanation,
} = require("../services/fraudDecisionService");

test.each([
  [0, "APPROVE"],
  [0.499999, "APPROVE"],
  [0.5, "REVIEW"],
  [0.899999, "REVIEW"],
  [0.9, "BLOCK"],
  [1, "BLOCK"],
])("score %p returns %s", (score, expected) => {
  expect(getFraudDecision(score)).toBe(expected);
});

test.each(["0.8", undefined, NaN, Infinity])(
  "rejects non-number or non-finite score %p",
  (score) => {
    expect(() => getFraudDecision(score)).toThrow(TypeError);
  },
);

test.each([-0.01, 1.01])("rejects out-of-range score %p", (score) => {
  expect(() => getFraudDecision(score)).toThrow(RangeError);
});

test.each([
  [
    0.49,
    {
      decision: "APPROVE",
      reason_code: "SCORE_BELOW_REVIEW_THRESHOLD",
      summary: "The score is below 0.50, so the transaction is approved.",
      limitation:
        "This score is a ranking signal from a synthetic-data model, not a calibrated real-world fraud probability.",
    },
  ],
  [
    0.5,
    {
      decision: "REVIEW",
      reason_code: "SCORE_IN_REVIEW_RANGE",
      summary:
        "The score is at least 0.50 and below 0.90, so manual review is required.",
      limitation:
        "This score is a ranking signal from a synthetic-data model, not a calibrated real-world fraud probability.",
    },
  ],
  [
    0.89,
    {
      decision: "REVIEW",
      reason_code: "SCORE_IN_REVIEW_RANGE",
      summary:
        "The score is at least 0.50 and below 0.90, so manual review is required.",
      limitation:
        "This score is a ranking signal from a synthetic-data model, not a calibrated real-world fraud probability.",
    },
  ],
  [
    0.9,
    {
      decision: "BLOCK",
      reason_code: "SCORE_AT_OR_ABOVE_BLOCK_THRESHOLD",
      summary: "The score is at least 0.90, so the transaction is blocked.",
      limitation:
        "This score is a ranking signal from a synthetic-data model, not a calibrated real-world fraud probability.",
    },
  ],
])("returns an explanation for score %p", (score, expected) => {
  expect(getFraudDecisionExplanation(score)).toEqual(expected);
});

test("current policy returns threshold explanation", () => {
  expect(getStoredFraudDecisionExplanation(0.8, "fraud_thresholds_v1")).toEqual(
    {
      decision: "REVIEW",
      reason_code: "SCORE_IN_REVIEW_RANGE",
      summary:
        "The score is at least 0.50 and below 0.90, so manual review is required.",
      limitation:
        "This score is a ranking signal from a synthetic-data model, not a calibrated real-world fraud probability.",
    },
  );
});

test("legacy policy returns unavailable explanation", () => {
  expect(getStoredFraudDecisionExplanation(0.8, "legacy_unversioned")).toEqual({
    reason_code: "DECISION_POLICY_UNVERSIONED",
    summary:
      "This prediction predates decision-policy version tracking, so its original threshold explanation is unavailable.",
    limitation:
      "The stored score and decision are preserved, but FraudGuard cannot verify which thresholds produced that historical decision.",
  });
});

test("unknown policy throws RangeError", () => {
  expect(() =>
    getStoredFraudDecisionExplanation(0.8, "fraud_thresholds_v2"),
  ).toThrow(RangeError);
});
