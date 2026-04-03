function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function mapToBand(score) {
  if (score < 500) return "high-risk";
  if (score < 700) return "moderate";
  return "strong";
}

function getFraudFlag(signals) {
  // Rule-of-thumb heuristic for circular flow risk indicator.
  return signals.fraudRisk > 65 && signals.upiDiversity < 40;
}

function evaluateScore(input) {
  const gstConsistency = Number(input.gstConsistency || 0);
  const upiDiversity = Number(input.upiDiversity || 0);
  const ewayGrowth = Number(input.ewayGrowth || 0);
  const fraudRisk = Number(input.fraudRisk || 0);

  const weightedRaw =
    gstConsistency * 0.35 +
    upiDiversity * 0.3 +
    clamp(ewayGrowth, 0, 100) * 0.2 +
    (100 - fraudRisk) * 0.15;

  const score = Math.round(300 + clamp(weightedRaw, 0, 100) * 6);
  const confidence = Math.round(clamp(55 + (weightedRaw - 50) * 0.6, 35, 95));

  const loanMinLakhs = Math.round(clamp((score - 300) / 30, 2, 80));
  const loanMaxLakhs = Math.round(loanMinLakhs * 1.8);

  const reasons = [
    `GST consistency at ${gstConsistency}% supports repayment discipline.`,
    `UPI diversity at ${upiDiversity}% indicates broad customer base.`,
    `E-way growth at ${ewayGrowth}% reflects business momentum.`
  ];

  return {
    score,
    band: mapToBand(score),
    confidence,
    fraudDetected: getFraudFlag({ fraudRisk, upiDiversity }),
    loanEligibility: {
      currency: "INR",
      recommendedRangeLakhs: {
        min: loanMinLakhs,
        max: loanMaxLakhs
      },
      interestBand: score >= 700 ? "11.5% - 13.2%" : score >= 500 ? "13.5% - 16.8%" : "17.0% - 21.0%"
    },
    reasons
  };
}

module.exports = {
  evaluateScore
};
