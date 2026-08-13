# Lead Prioritization Matrix Template

> Generated from the `score_leads` tool (weighted MCDA model). Replace bracketed
> placeholders with case data. Attach the professional disclaimer and legal-scope
> note on every copy.

**Case ID**: [CASE-ID]
**Analyst**: [name / badge]
**Generated**: [ISO timestamp]
**Model**: weighted-mcda-v1
**Weights used**: proximity=`w1`, temporal_recency=`w2`, source_reliability=`w3`, corroborative_strength=`w4`, actionability=`w5` (normalized to sum 1)

## Disclaimer

This output is general, educational/analytical information produced to support
lawful professional investigation. It is not legal advice, not a professional
determination, and not a judgment about any named individual. Always verify with
a qualified professional before acting on any lead.

## Ranked Leads

| Rank | Lead ID | Description | Source | Reliability | Weighted | Normalized | Band | Rationale |
|------|---------|-------------|--------|-------------|----------|------------|------|-----------|
| 1    | [L1]    | [desc]      | [src]  | High        | 0.88     | 1.00       | P1-High | source reliability High; strong proximity; actionable. |
| 2    | [L2]    | [desc]      | [src]  | Medium      | 0.62     | 0.55       | P2-Medium | ... |
| ...  | ...     | ...         | ...    | ...         | ...      | ...        | ...  | ... |

## Component Scores (per lead)

| Lead ID | proximity | temporal_recency | source_reliability | corroborative_strength | actionability |
|---------|-----------|------------------|--------------------|------------------------|---------------|
| L1      | 0.90      | 0.80             | 1.00               | 0.70                   | 0.85          |
| ...     | ...       | ...              | ...                | ...                    | ...           |

## Priority Bands — Action Guidance

- **P1-High (≥0.75)**: pursue immediately; document lawful basis; assign investigator.
- **P2-Medium (0.50–0.74)**: schedule within current operational cycle; corroborate.
- **P3-Low (0.25–0.49)**: background queue; revisit if corroborating evidence emerges.
- **P4-Background (<0.25)**: retain for record; do not resource unless re-scored upward.

## Legal & Ethical Boundaries

- Every lead's `source` must be on the allowed data-source list (see
  `references/digital-footprint-lawful-sourcing.md`).
- Run `check_legal_scope` before any action that uses positional/communications/
  financial/third-party data.
- No definitive judgment about named individuals.

## Quality Checks

- [ ] Weights documented and normalized.
- [ ] Each lead has stable id, description, source, reliability.
- [ ] Corroborating-item count avoids double-counting the same observation.
- [ ] Disclaimer and legal-scope note attached.
- [ ] Output reproducible via `scripts/lead-scorer.ts <leads-file>`.
