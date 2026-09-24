const { getFraudDecision } = require("../services/fraudDecisionService");

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
