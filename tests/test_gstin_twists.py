"""Focused tests for FT02 twist features.

Twist 1: circular UPI topology detection and graph payload.
Twist 2: GST amnesty window policy applying runtime PD relief without retraining.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.services.gstin_scoring_service import GstinScoringService


def test_twist1_detects_circular_ring_and_exposes_graph_payload():
    service = GstinScoringService()
    result = service.score_gstin("29ABCDE1007Z7")

    assert result["fraud_flag"] is True
    assert result["fraud_score"] >= 0.6

    network = result["fraud_network"]
    assert isinstance(network, dict)
    assert len(network.get("nodes", [])) >= 3
    assert len(network.get("edges", [])) >= 3
    assert network.get("cycle_count", 0) >= 1


def test_twist2_applies_amnesty_runtime_pd_relief(monkeypatch):
    service = GstinScoringService()
    artifacts = service._load_artifacts()

    candidate_rows = artifacts.features_df[artifacts.features_df["late_filing_ratio"] > 0]
    assert not candidate_rows.empty
    gstin = str(candidate_rows.iloc[0]["gstin"])

    monkeypatch.delenv("GST_AMNESTY_START_DATE", raising=False)
    monkeypatch.delenv("GST_AMNESTY_END_DATE", raising=False)
    baseline = service.score_gstin(gstin)

    today = datetime.now(timezone.utc).date()
    monkeypatch.setenv("GST_AMNESTY_START_DATE", (today - timedelta(days=1)).isoformat())
    monkeypatch.setenv("GST_AMNESTY_END_DATE", (today + timedelta(days=1)).isoformat())

    with_amnesty = service.score_gstin(gstin)

    assert with_amnesty["amnesty_policy"]["active"] is True
    assert with_amnesty["amnesty_policy"]["pd_relief"] >= 0
    assert with_amnesty["probability_of_default"] <= baseline["probability_of_default"]
