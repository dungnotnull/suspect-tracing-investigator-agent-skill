# Reference — Lead Prioritization (Weighted MCDA)

## Purpose

Operationalizes the lead-organization engine: turn a disorganized pile of tips,
witness statements, and open-source leads into a ranked, auditable
lead-prioritization matrix. This is the intake skill's core methodology.

## Research Foundation

- Association of Chief Police Officers (UK) (2012). *Practice Advice on
  Analytical Techniques for Financial Investigators*. NPIA — applied
  lead-prioritization methodology for investigative work.
- R. Innes (2003). *Investigating Murder: Detective Work and the Police Response
  to Criminal Homicide*. Oxford University Press — empirical study of real-world
  investigative decision processes; documents how leads are triaged in practice.
- National Research Council (2009). *Strengthening Forensic Science in the
  United States*. National Academies Press — standards/limitations of forensic
  investigative methods, including the need for documented, repeatable reasoning.

## The MCDA Model

A **Multi-Criteria Decision Analysis (MCDA)** model combines normalized criteria
scores with normalized weights into a single weighted score per lead. The model
implemented in `config/tools.ts` (`score_leads`) uses five criteria:

| Criterion | Symbol | Range | Notes |
|-----------|--------|-------|-------|
| Proximity | `proximity` | 0..1 | How directly the lead ties to the suspect anchor (1 = direct). |
| Temporal recency | `temporal_recency` | 0..1 | 1 = most recent relative to the investigation window. |
| Source reliability | `source_reliability` | High=1.0, Medium=0.6, Low=0.3 | Mirrors evidence-reliability conventions. |
| Corroborative strength | `corroborative_strength` | 0..1 | Saturating function `1 - exp(-k)` of corroborating-item count. |
| Actionability | `actionability` | 0..1 | Can an investigative step be taken *now* (subpoena, interview, canvass)? |

Default weights (see `config/settings.example.json` → `scoring.lead_criteria_weights`):

```
proximity: 0.20, temporal_recency: 0.20, source_reliability: 0.25,
corroborative_strength: 0.20, actionability: 0.15
```

Weights are normalized at runtime so they sum to 1 (`normalizeWeights` in
`config/index.ts`).

## Scoring Procedure

1. **Capture** each lead with: `id`, `description`, `source`,
   `source_reliability`, `proximity` (0..1), `temporal_recency` (0..1),
   `corroborating_items` (integer), `actionability` (0..1), optional
   `captured_at` (ISO timestamp).
2. **Normalize** each criterion to 0..1 (source reliability is mapped; others
   are clamped).
3. **Combine** via the weighted sum → `weighted_score`.
4. **Normalize across the set** (min-max) → `normalized_score` in 0..1.
5. **Assign priority band**: ≥0.75 `P1-High`, ≥0.50 `P2-Medium`, ≥0.25
   `P3-Low`, else `P4-Background`.
6. **Rank** descending by `normalized_score`; attach a `rationale` string
   summarizing the dominant contributing factors.

## Output Schema (excerpt)

```json
{
  "ranked_leads": [
    {
      "lead_id": "L1",
      "description": "...",
      "source": "...",
      "source_reliability": "High",
      "component_scores": { "proximity": 0.90, "temporal_recency": 0.80, "source_reliability": 1.0, "corroborative_strength": 0.70, "actionability": 0.85 },
      "weighted_score": 0.8815,
      "normalized_score": 1.0,
      "priority_band": "P1-High",
      "rank": 1,
      "rationale": "source reliability High (1.00); strong suspect-anchor proximity; immediately actionable."
    }
  ],
  "model": "weighted-mcda-v1"
}
```

## Common Pitfalls

- **Weight drift**: do not tune weights to force a desired ranking; document
  the rationale for any weight change in the case file.
- **Over-counting corroboration**: two witness statements about the *same*
  observation count as one corroborating item, not two.
- **Treating Low-reliability leads as background**: a Low-reliability lead with
  high proximity and actionability may still warrant a P3 band, not P4.

## Integration

- Feeds the **lead-prioritization matrix template** in
  `assets/templates/lead-prioritization-matrix.md`.
- Top-ranked leads feed the **geographic profiler** (sites) and **network
  analyst** (associates) sub-agents.
- Run `scripts/lead-scorer.ts examples/sample-leads.json` to reproduce the
  ranking deterministically.

## Quick Checklist

- [ ] Every lead has a stable `id` and a human-readable `description`.
- [ ] `source_reliability` is one of `High | Medium | Low` with justification.
- [ ] Weights sum to 1 (system normalizes anyway, but document intent).
- [ ] Output includes the priority band and a one-line rationale per lead.
- [ ] A professional disclaimer and lawful-scope note are attached.

---

**Research citation indices** (see RESEARCH-PAPER-KNOWLEDGE-BRAIN.md): #25, #29, #30, #31. Each cited source is applied to a concrete tool, reference, template, or script — see the consolidated mapping table in that file.
