# Reference — Link Analysis / Network Analysis for Associate Mapping

## Purpose

Map known associates of a suspect, quantify their structural importance in the
associate network, and identify high-value targets for intelligence
development or disruption.

## Research Foundation

- M. K. Sparrow (1991). "The Application of Network Analysis to Criminal
  Intelligence: An Assessment of the Prospects." *Social Networks* —
  foundational link-analysis methodology for investigations.
- M. Bouchard, R. Nash (2015). "Researching Terrorism and Counter-Terrorism
  through a Network Lens." In *Social Networks, Terrorism and
  Counter-terrorism* — network-analysis methodology for investigations.
- U. Brandes (2001). "A Faster Algorithm for Betweenness Centrality."
  *Journal of Mathematical Sociology* — the betweenness algorithm implemented
  in `brandesBetweenness` (`config/tools.ts`).
- R. Tarjan (articulation-point / lowlink algorithm) — used in
  `findCutVertices` to detect nodes whose removal disconnects the network.

## Centrality Measures Used

| Measure | What it captures | Investigative meaning |
|---------|------------------|-----------------------|
| **Degree** | Number of direct associates. | Breadth of a person's contact surface. |
| **Weighted degree** | Sum of tie strengths. | Volume of contact (with strength weighting). |
| **Betweenness** (Brandes) | Frequency on shortest paths between others. | Broker / gatekeeper; controls information flow. |
| **Cut-vertex** (articulation point) | Removal disconnects the network. | Single point of failure — high-value disruption target. |

The tool computes a composite **influence score**:

```
influence = 0.35 * degNorm + 0.35 * btwNorm + 0.20 * wdNorm + (0.15 if cutVertex else 0)
```

Normalized so each term lies in 0..1. The 0.15 cut-vertex bonus is a flat
priority bump for articulation points, consistent with Sparrow's disruption
focus. Weights are documented; re-weighting is allowed with a case-file note.

## Procedure

1. Enumerate **associates** with `id`, optional `name`, `role`
   (family / financial / criminal-associate / coworker / social), `links`
   (array of associate ids), and optional `strength` (0..1) per tie.
2. Run `link_analysis` (`config/tools.ts`). The tool:
   - Builds an undirected adjacency with tie-strength averaging on duplicates.
   - Computes degree, weighted degree, Brandes betweenness.
   - Detects cut-vertices via Tarjan's lowlink DFS.
   - Ranks nodes by composite influence.
3. Interpret the output:
   - High-influence nodes → prioritize for intelligence development
     (lawful interviews, subpoenaed records with authorization).
   - Cut-vertices → high-value disruption or containment targets.
   - Low-degree, low-betweenness "leaf" nodes → low priority unless they
     bridge to a separate cluster.

## Output Schema (excerpt)

```json
{
  "nodes": [
    { "id": "A2", "name": "...", "role": "financial", "degree": 4, "weightedDegree": 2.8, "betweenness": 6.5, "isCutVertex": true, "influenceScore": 0.81 }
  ],
  "cutVertices": ["A2"],
  "edgeCount": 9,
  "nodeCount": 7,
  "interpretation": "Identified 1 cut-vertex node(s) ..."
}
```

## Pitfalls

- **Incomplete graph**: a missing associate link changes betweenness
  substantially; mark the network as "partial" in the case file.
- **Strength subjectivity**: tie strength is an analyst judgment; record the
  basis (frequency, duration, joint criminal history).
- **Direction**: the model treats ties as undirected. For one-way
  dependencies (e.g., a supplier relationship), annotate and reason
  separately; do not infer reciprocal trust.
- **De-anonymization risk**: do not act on network analysis alone to target
  named individuals; combine with independent corroborating evidence and
  lawful basis.

## Integration

- Feeds `assets/templates/associate-link-map.md`.
- Pair with **Lead Prioritization**: high-influence associates often appear as
  leads; cross-reference `influence_score` with `priority_band`.
- Run `scripts/network-analyzer.ts examples/sample-associates.json` to
  reproduce the analysis deterministically.

## Quick Checklist

- [ ] Every node has a lawful, documented source (open-source, court records,
      authorized department records, lawfully obtained statements).
- [ ] Tie strengths recorded with a basis note.
- [ ] Network labelled "partial" if known links are missing.
- [ ] Cut-vertices flagged for separate legal review before any disruption.
- [ ] Disclaimer + lawful-scope note attached; no definitive judgment about
      named individuals.

---

**Research citation indices** (see RESEARCH-PAPER-KNOWLEDGE-BRAIN.md): #11, #12, #13, #14. Each cited source is applied to a concrete tool, reference, template, or script — see the consolidated mapping table in that file.
