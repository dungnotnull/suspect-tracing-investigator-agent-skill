# Associate / Link Map Template

> Generated from the `link_analysis` tool (Sparrow network analysis + Brandes
> betweenness + Tarjan cut-vertices). Attach the professional disclaimer and
> legal-scope note.

**Case ID**: [CASE-ID]
**Generated**: [ISO timestamp]
**Methodology**: Link/network analysis (Sparrow 1991; Brandes 2001; Tarjan)
**Network completeness**: [Complete / Partial — note known missing links]

## Disclaimer

This map is general, educational/analytical information to support lawful
professional investigation. It is not a determination about any named
individual. Verify with qualified professionals and independent evidence before
acting on any node.

## Associates

| ID | Name / Handle | Role | Links | Tie strength | Lawful source |
|----|---------------|------|-------|--------------|---------------|
| A1 | [handle] | financial | [A2, A3] | 0.8 | court records |
| A2 | [handle] | criminal-associate | [A1, A4] | 0.6 | authorized dept. records |
| ... | ... | ... | ... | ... | ... |

## Centrality & Influence

| ID | Role | Degree | Weighted degree | Betweenness | Cut-vertex | Influence |
|----|------|--------|-----------------|-------------|------------|-----------|
| A2 | criminal-associate | 4 | 2.8 | 6.5 | Yes | 0.81 |
| ... | ... | ... | ... | ... | ... | ... |

Influence = 0.35·degNorm + 0.35·btwNorm + 0.20·wdNorm + 0.15·cutBonus.

## Cut-Vertices (articulation points)

Nodes whose removal disconnects the network — high-value disruption or
containment targets (subject to separate lawful authority):

- [A2]

## Interpretation

[Summarize: number of nodes, edges, cut-vertices, and the investigative
implications. Note partial-network caveats.]

## Legal & Ethical Boundaries

- Every node's source must be lawful and documented.
- Cut-vertices flagged for separate legal review before any disruption.
- No definitive judgment about named individuals.
- Network labelled "partial" if known links are missing.

## Quality Checks

- [ ] Every node has a lawful, documented source.
- [ ] Tie strengths recorded with a basis note.
- [ ] Network labelled "partial" if known links are missing.
- [ ] Reproducible via `scripts/network-analyzer.ts <associates-file>`.
- [ ] Disclaimer + legal-scope note attached.
