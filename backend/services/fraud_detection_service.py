"""Mock fraud detection service for circular MSME transaction patterns.

The service models UPI counterparties as a directed graph where:
- nodes are GSTINs
- edges are monthly fund flows between GSTINs

It detects closed-loop money rotation through strongly-connected components,
then returns both risk flags and graph payload for dashboard visualization.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Set


@dataclass(frozen=True)
class TransactionEdge:
    from_gstin: str
    to_gstin: str
    monthly_flow_inr: float


class FraudDetectionService:
    """Assess mocked circular transaction behavior for a GSTIN."""

    def __init__(self) -> None:
        self._edges: List[TransactionEdge] = [
            # Normal operating network.
            TransactionEdge("29ABCDE1000Z0", "29ABCDE1001Z1", 185000.0),
            TransactionEdge("29ABCDE1001Z1", "29ABCDE1004Z4", 91000.0),
            TransactionEdge("29ABCDE1004Z4", "29ABCDE1000Z0", 43000.0),
            # Circular high-risk ring.
            TransactionEdge("29ABCDE1007Z7", "29ABCDE1011Z1", 410000.0),
            TransactionEdge("29ABCDE1011Z1", "29ABCDE1019Z9", 388000.0),
            TransactionEdge("29ABCDE1019Z9", "29ABCDE1024Z4", 362000.0),
            TransactionEdge("29ABCDE1024Z4", "29ABCDE1007Z7", 377000.0),
            TransactionEdge("29ABCDE1019Z9", "29ABCDE1007Z7", 401000.0),
            TransactionEdge("29ABCDE1011Z1", "29ABCDE1007Z7", 405000.0),
            # Benign external links.
            TransactionEdge("29ABCDE1015Z5", "29ABCDE1028Z8", 76000.0),
            TransactionEdge("29ABCDE1028Z8", "29ABCDE1033Z3", 54000.0),
        ]

    def _adjacency(self) -> Dict[str, List[TransactionEdge]]:
        graph: Dict[str, List[TransactionEdge]] = {}
        for edge in self._edges:
            graph.setdefault(edge.from_gstin, []).append(edge)
        return graph

    def _reverse_adjacency(self) -> Dict[str, List[TransactionEdge]]:
        graph: Dict[str, List[TransactionEdge]] = {}
        for edge in self._edges:
            graph.setdefault(edge.to_gstin, []).append(edge)
        return graph

    def _reachable_component(self, root: str, max_hops: int = 3) -> Set[str]:
        out_graph = self._adjacency()
        in_graph = self._reverse_adjacency()
        visited: Set[str] = {root}
        frontier = [(root, 0)]
        while frontier:
            node, depth = frontier.pop(0)
            if depth >= max_hops:
                continue
            for edge in out_graph.get(node, []):
                if edge.to_gstin not in visited:
                    visited.add(edge.to_gstin)
                    frontier.append((edge.to_gstin, depth + 1))
            for edge in in_graph.get(node, []):
                if edge.from_gstin not in visited:
                    visited.add(edge.from_gstin)
                    frontier.append((edge.from_gstin, depth + 1))
        return visited

    def _strongly_connected_components(self, nodes: Set[str]) -> List[Set[str]]:
        graph = self._adjacency()
        reverse_graph = self._reverse_adjacency()

        order: List[str] = []
        seen: Set[str] = set()

        def dfs(node: str) -> None:
            seen.add(node)
            for edge in graph.get(node, []):
                nxt = edge.to_gstin
                if nxt in nodes and nxt not in seen:
                    dfs(nxt)
            order.append(node)

        for node in nodes:
            if node not in seen:
                dfs(node)

        components: List[Set[str]] = []
        seen.clear()

        def reverse_dfs(node: str, bucket: Set[str]) -> None:
            seen.add(node)
            bucket.add(node)
            for edge in reverse_graph.get(node, []):
                nxt = edge.from_gstin
                if nxt in nodes and nxt not in seen:
                    reverse_dfs(nxt, bucket)

        for node in reversed(order):
            if node in seen:
                continue
            component: Set[str] = set()
            reverse_dfs(node, component)
            components.append(component)

        return components

    def _severity_score(
        self,
        recirculation_ratio: float,
        concentrated_counterparty_ratio: float,
        repeated_round_trip_count: int,
    ) -> float:
        round_trip_component = min(repeated_round_trip_count / 10.0, 1.0)
        score = (
            0.45 * recirculation_ratio
            + 0.30 * concentrated_counterparty_ratio
            + 0.25 * round_trip_component
        )
        return round(score, 3)

    def _build_summary(self, fraud_score: float, linked_gstins: List[str]) -> str:
        counterparties = ", ".join(linked_gstins[:3])
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

    def _network_payload(self, subject_gstin: str, component_nodes: Set[str], cycle_nodes: Set[str]) -> Dict[str, object]:
        if not component_nodes:
            component_nodes = {subject_gstin}
        edges = [
            edge for edge in self._edges
            if edge.from_gstin in component_nodes and edge.to_gstin in component_nodes
        ]
        cycle_edges = [
            edge for edge in edges
            if edge.from_gstin in cycle_nodes and edge.to_gstin in cycle_nodes
        ]
        return {
            "nodes": [
                {
                    "gstin": gstin,
                    "role": "subject" if gstin == subject_gstin else ("ring_member" if gstin in cycle_nodes else "linked"),
                }
                for gstin in sorted(component_nodes)
            ],
            "edges": [
                {
                    "from_gstin": edge.from_gstin,
                    "to_gstin": edge.to_gstin,
                    "monthly_flow_inr": edge.monthly_flow_inr,
                    "in_cycle": edge in cycle_edges,
                }
                for edge in edges
            ],
            "cycle_count": len(cycle_edges),
        }

    def analyze_gstin(self, gstin: str) -> Dict[str, object]:
        component_nodes = self._reachable_component(gstin)
        if gstin not in component_nodes:
            component_nodes.add(gstin)

        sccs = self._strongly_connected_components(component_nodes)
        cycle_components = [component for component in sccs if len(component) >= 3 and gstin in component]
        cycle_nodes: Set[str] = set().union(*cycle_components) if cycle_components else set()

        component_edges = [
            edge for edge in self._edges
            if edge.from_gstin in component_nodes and edge.to_gstin in component_nodes
        ]
        cycle_edges = [
            edge for edge in component_edges
            if edge.from_gstin in cycle_nodes and edge.to_gstin in cycle_nodes
        ]

        if not cycle_nodes:
            return {
                "fraud_flag": False,
                "fraud_score": 0.08,
                "fraud_summary": "No suspicious linked-GSTIN transaction loop was detected in the mocked network.",
                "linked_gstins": sorted(node for node in component_nodes if node != gstin),
                "fraud_network": self._network_payload(gstin, component_nodes, cycle_nodes),
            }

        subject_outflow = sum(edge.monthly_flow_inr for edge in component_edges if edge.from_gstin == gstin)
        subject_cycle_outflow = sum(edge.monthly_flow_inr for edge in cycle_edges if edge.from_gstin == gstin)
        recirculation_ratio = min(subject_cycle_outflow / max(subject_outflow, 1.0), 1.0)

        subject_counterparty_flows: Dict[str, float] = {}
        for edge in component_edges:
            if edge.from_gstin != gstin:
                continue
            subject_counterparty_flows[edge.to_gstin] = subject_counterparty_flows.get(edge.to_gstin, 0.0) + edge.monthly_flow_inr

        concentrated_counterparty_ratio = 0.0
        if subject_counterparty_flows and subject_outflow > 0:
            concentrated_counterparty_ratio = max(subject_counterparty_flows.values()) / subject_outflow

        repeated_round_trip_count = len(cycle_edges)
        fraud_score = self._severity_score(
            recirculation_ratio=recirculation_ratio,
            concentrated_counterparty_ratio=concentrated_counterparty_ratio,
            repeated_round_trip_count=repeated_round_trip_count,
        )
        linked_gstins = sorted(node for node in cycle_nodes if node != gstin)

        return {
            "fraud_flag": fraud_score >= 0.6,
            "fraud_score": fraud_score,
            "fraud_summary": self._build_summary(fraud_score, linked_gstins),
            "linked_gstins": linked_gstins,
            "fraud_network": self._network_payload(gstin, component_nodes, cycle_nodes),
        }
