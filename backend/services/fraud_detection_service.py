"""
Mock fraud detection service for circular MSME transaction patterns.

The service simulates a near-real-time network view of GSTIN-linked UPI flows.
It flags GSTINs that appear in tightly connected circular fund movement loops.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class CounterpartyLink:
    gstin: str
    monthly_flow_inr: float
    reverse_flow_ratio: float


@dataclass(frozen=True)
class FraudProfile:
    linked_gstins: List[CounterpartyLink]
    recirculation_ratio: float
    concentrated_counterparty_ratio: float
    repeated_round_trip_count: int


class FraudDetectionService:
    """Assess mocked circular transaction behavior for a GSTIN."""

    def __init__(self) -> None:
        self._profiles: Dict[str, FraudProfile] = {
            "29ABCDE1000Z0": FraudProfile(
                linked_gstins=[
                    CounterpartyLink("29ABCDE1001Z1", 185000.0, 0.14),
                    CounterpartyLink("29ABCDE1004Z4", 122000.0, 0.09),
                ],
                recirculation_ratio=0.18,
                concentrated_counterparty_ratio=0.21,
                repeated_round_trip_count=1,
            ),
            "29ABCDE1007Z7": FraudProfile(
                linked_gstins=[
                    CounterpartyLink("29ABCDE1011Z1", 410000.0, 0.84),
                    CounterpartyLink("29ABCDE1019Z9", 395000.0, 0.81),
                    CounterpartyLink("29ABCDE1024Z4", 372000.0, 0.79),
                ],
                recirculation_ratio=0.78,
                concentrated_counterparty_ratio=0.67,
                repeated_round_trip_count=9,
            ),
            "29ABCDE1011Z1": FraudProfile(
                linked_gstins=[
                    CounterpartyLink("29ABCDE1007Z7", 405000.0, 0.86),
                    CounterpartyLink("29ABCDE1019Z9", 388000.0, 0.82),
                ],
                recirculation_ratio=0.74,
                concentrated_counterparty_ratio=0.63,
                repeated_round_trip_count=8,
            ),
            "29ABCDE1019Z9": FraudProfile(
                linked_gstins=[
                    CounterpartyLink("29ABCDE1007Z7", 401000.0, 0.8),
                    CounterpartyLink("29ABCDE1011Z1", 384000.0, 0.78),
                    CounterpartyLink("29ABCDE1024Z4", 362000.0, 0.76),
                ],
                recirculation_ratio=0.72,
                concentrated_counterparty_ratio=0.61,
                repeated_round_trip_count=7,
            ),
            "29ABCDE1024Z4": FraudProfile(
                linked_gstins=[
                    CounterpartyLink("29ABCDE1007Z7", 377000.0, 0.77),
                    CounterpartyLink("29ABCDE1019Z9", 359000.0, 0.75),
                ],
                recirculation_ratio=0.69,
                concentrated_counterparty_ratio=0.58,
                repeated_round_trip_count=6,
            ),
        }

    def _severity_score(self, profile: FraudProfile) -> float:
        round_trip_component = min(profile.repeated_round_trip_count / 10.0, 1.0)
        score = (
            0.45 * profile.recirculation_ratio
            + 0.30 * profile.concentrated_counterparty_ratio
            + 0.25 * round_trip_component
        )
        return round(score, 3)

    def _build_summary(self, fraud_score: float, profile: FraudProfile) -> str:
        counterparties = ", ".join(link.gstin for link in profile.linked_gstins[:3])
        if fraud_score >= 0.7:
            return (
                "High-risk circular transaction topology detected. "
                f"Funds appear to rotate repeatedly between linked GSTINs ({counterparties}), "
                "which may indicate score inflation through synthetic UPI activity."
            )
        if fraud_score >= 0.45:
            return (
                "Moderate circular-flow risk detected. "
                f"A meaningful share of transactions returns through linked GSTINs ({counterparties}), "
                "so this case should be manually reviewed."
            )
        return (
            "No strong circular transaction pattern detected in the mocked network. "
            "Counterparty flows appear reasonably distributed."
        )

    def analyze_gstin(self, gstin: str) -> Dict[str, object]:
        profile = self._profiles.get(gstin)
        if profile is None:
            return {
                "fraud_flag": False,
                "fraud_score": 0.08,
                "fraud_summary": "No suspicious linked-GSTIN transaction loop was detected in the mocked network.",
                "linked_gstins": [],
            }

        fraud_score = self._severity_score(profile)
        return {
            "fraud_flag": fraud_score >= 0.6,
            "fraud_score": fraud_score,
            "fraud_summary": self._build_summary(fraud_score, profile),
            "linked_gstins": [link.gstin for link in profile.linked_gstins],
        }
