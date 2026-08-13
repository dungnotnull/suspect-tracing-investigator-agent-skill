# Behavioral / Routine Activity Profile Template

> Generated from the `routine_activity_analysis` tool (Cohen & Felson RAT).
> Attach the professional disclaimer and legal-scope note.

**Case ID**: [CASE-ID]
**Generated**: [ISO timestamp]
**Methodology**: Routine Activity Theory (Cohen & Felson, 1979)
**Anchor used**: [lat, lon] (source: geographic profile / known address / authorized record)

## Disclaimer

This profile is general, educational/analytical information to support lawful
professional investigation. It identifies prioritization zones, not predictions
of a specific individual's future behavior. Verify with qualified professionals.

## Routine Activity Nodes

| Node ID | Label | Lat | Lon | Guardian strength (0..1) | Lawful source |
|---------|-------|-----|-----|--------------------------|---------------|
| N1 | suspect gym | [lat] | [lon] | 0.15 | court records |
| N2 | workplace | [lat] | [lon] | 0.60 | authorized employment record |
| ... | ... | ... | ... | ... | ... |

## Top Risk Zones (convergence points)

| Rank | Node ID | Label | Distance to anchor (km) | Guardian gap | Risk score |
|------|---------|-------|-------------------------|--------------|------------|
| 1 | N1 | suspect gym | 3.2 | 0.85 | 0.72 |
| ... | ... | ... | ... | ... | ... |

Risk score = 0.4 × proximityFactor + 0.6 × guardianGap (document any re-weighting).

## Interpretation

Per Cohen & Felson (1979), offenses cluster where motivated offender, suitable
target, and absence of capable guardian converge. The zones above are
prioritization candidates for canvass, authorized surveillance, and
lead-following — subject to lawful basis.

## Limitations

- Routines shift across days/seasons; re-run with temporal sub-slices.
- "Busy" ≠ "capable guardian"; capable guardianship requires willingness + ability to intervene.
- A cluster near a node does not by itself prove the suspect's routine passes through it.

## Legal & Ethical Boundaries

- Every node's source must be lawful and documented.
- Authorized surveillance requires its own lawful basis; this profile does not grant one.
- No definitive judgment about a named individual.

## Quality Checks

- [ ] Each node has a lawful, documented source.
- [ ] Guardian strength scored with explicit justification.
- [ ] Anchor source documented (geographic profile / known address / authorized record).
- [ ] Reproducible via `scripts/geo-profiler.ts --routine <offenses-file>`.
- [ ] Disclaimer + legal-scope note attached.
