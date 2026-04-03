const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { evaluateScore } = require("../services/score.service");

const router = express.Router();

router.post("/evaluate", requireAuth, (req, res) => {
  const { businessId, gstConsistency, upiDiversity, ewayGrowth, fraudRisk } = req.body;

  if (!businessId) {
    return res.status(400).json({ error: { message: "businessId is required" } });
  }

  const result = evaluateScore({ gstConsistency, upiDiversity, ewayGrowth, fraudRisk });

  return res.status(200).json({
    businessId,
    generatedAt: new Date().toISOString(),
    result
  });
});

module.exports = router;
