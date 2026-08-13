# Suspect Case File Template

> Master organizing document for a tracing/investigation effort. Sections map to
> the skill's sub-agents. Replace bracketed placeholders with case data.

**Case ID**: [CASE-ID]
**Case type**: [fugitive tracing | suspect identification | pattern linkage]
**Date opened**: [ISO date]
**Status**: [Active | Suspended | Closed]
**Lead investigator**: [name / badge]
**Jurisdiction**: [jurisdiction(s)]
**Lawful-use attestation**: [Yes — authority documented | Pending legal review]

## Disclaimer

This case file contains general, educational/analytical information produced to
support lawful professional investigation. It is not legal advice and not a
determination about any named individual. Verify with qualified professionals
before acting.

## 1. Summary

One-paragraph narrative of what is known, what is being traced, and the current
leading hypothesis (without asserting it as fact).

## 2. Known Subject Information

- **Subject reference**: [alias / case-only handle — avoid publishing PII]
- **Known anchor points**: [addresses / workplaces / frequent locations, with lawful source per item]
- **Known routines**: [work hours, recurring routes, social nodes]

## 3. Lead Inventory (link to lead-prioritization matrix)

Reference the `lead-prioritization-matrix` output. Do not duplicate leads here;
record only cross-lead observations (e.g., "L3 and L7 both reference the blue
sedan").

## 4. Geographic Profile (link)

Reference the `geographic-profile` output. Record:
- Estimated anchor: [lat, lon]
- Buffer zone / decay constants used
- Cross-check against awareness space

## 5. Behavioral / Routine Activity Profile (link)

Reference the `behavioral-pattern-profile` output. Record top risk zones and
the guardianship-gap reasoning per zone.

## 6. Associate / Link Map (link)

Reference the `associate-link-map` output. Record:
- Cut-vertices identified
- High-influence nodes flagged for lawful intelligence development

## 7. Interview Plans (link)

Reference one `interview-question-set` per planned interview (witness /
informant / associate). Record interviewee role, event description, and the
date the plan was generated.

## 8. Digital Footprint (lawful)

- Sources used (must be on allowed list)
- Artifacts captured (URL / archive hash / timestamp)
- `check_legal_scope` result for any planned action using this footprint

## 9. Evidentiary Integrity (Chain of Custody)

For each evidence item, record id, collector, acquired_at, storage location,
and the transfer chain. Attach the `validate_chain_of_custody` result.

| Item ID | Description | Collector | Acquired | Storage | Chain valid |
|---------|-------------|-----------|----------|---------|-------------|
| E1      | [desc]      | [id]      | [ISO]    | [loc]   | Yes / No    |

## 10. Legal & Ethical Boundaries

- Warrant / lawful-basis status for any positional/communications/financial data use
- Disallowed sources excluded (attest)
- No definitive judgment about named individuals
- Jurisdiction-specific legal review status

## 11. Next Actions

Ordered list of lawful next steps, each with an assigned investigator, a
lawful basis, and a target completion date.

## Quality Checks

- [ ] Lawful-use attestation recorded.
- [ ] Every linked sub-output carries its own disclaimer.
- [ ] Chain of custody validated (`valid: true`) for all relied-upon evidence.
- [ ] No disallowed data sources referenced.
- [ ] No definitive judgment about a named individual.
