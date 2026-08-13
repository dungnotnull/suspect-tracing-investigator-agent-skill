# Reference — Routine Activity Theory (Cohen & Felson)

## Purpose

Analyze movement and behavioral/routine patterns to find the space/time
convergence points where a motivated offender, a suitable target, and the
absence of a capable guardian coincide. Used to predict where leads and patrols
will pay off and to explain offense-site clustering.

## Research Foundation

- L. E. Cohen, M. Felson (1979). "Social Change and Crime Rate Trends: A
  Routine Activity Approach." *American Sociological Review* — the
  foundational statement of Routine Activity Theory (RAT).
- P. Brantingham, P. Brantingham (1981). *Environmental Criminology*. Sage —
  crime pattern theory: activity nodes (home, work, recreation) and the paths
  connecting them form the offender's *awareness space*.
- R. V. Clarke, D. B. Cornish (1985). "Modeling Offenders' Decisions: A
  Framework for Research and Policy." *Crime and Justice* — rational-choice
  framework that complements RAT for behavior-pattern analysis.
- H. Copes, A. Hochstetler (2003). "Situational Construction of Masculinity
  Among Male Street Thieves." *Journal of Contemporary Ethnography* — used
  cautiously as behavioral-pattern context.

## The Convergence Principle

Cohen & Felson: a direct-contact predatory offense occurs when, in space and
time, three minimum elements converge:

1. **A motivated offender** — the suspect with capacity and inclination.
2. **A suitable target** — person or property the offender values (VIVA:
   value, inertia, access, visibility).
3. **Absence of a capable guardian** — no person, device, or condition
   effectively discourages the offense.

The *routine activities* of offenders and targets (daily travel, work,
recreation schedules) structure when and where these three elements meet.
Offense sites therefore cluster around the offender's routine activity nodes.

## Operationalization (`routineActivityAnalysis`, `config/tools.ts`)

Given a suspect **anchor** (e.g., estimated from geographic profiling or a known
address) and a set of **routine activity nodes** (home, work, gym, associate
addresses, frequent transit hubs), each with a `guardianStrength` (0..1), the
tool computes per-node:

```
distanceKm       = haversine(anchor, node)
siteProximity    = min over offense sites of haversine(node, site)
proximityFactor  = 1 / (1 + siteProximity)         (closer to sites => higher)
guardianGap      = 1 - guardianStrength            (less guardianship => higher)
riskScore        = 0.4 * proximityFactor + 0.6 * guardianGap
```

Nodes are ranked by `riskScore`; the top 5 are returned as `topRiskZones`.

The weights (0.4 proximity, 0.6 guardian gap) reflect the RAT priority on
guardianship absence. Document any re-weighting.

## Procedure

1. Identify the suspect's **routine activity nodes** from lawful sources:
   known addresses, employment records (with authorization), publicly
   disclosed associations, court records.
2. Score each node's `guardianStrength`:
   - 0.0 — unattended, no surveillance, low foot traffic.
   - 0.5 — intermittent guardianship (e.g., daytime occupancy only).
   - 1.0 — continuous capable guardianship (24/7 occupancy + alarms).
3. Run `routine_activity_analysis` against the offense sites.
4. Use `topRiskZones` to prioritize canvass, surveillance authorization
   requests, and lead-following in those nodes.

## Output Schema (excerpt)

```json
{
  "convergencePoints": [
    { "nodeId": "N1", "label": "suspect gym", "distanceKm": 3.2, "guardianGap": 0.85, "riskScore": 0.72 }
  ],
  "topRiskZones": [ ... top 5 ... ],
  "interpretation": "Per Cohen & Felson (1979) ..."
}
```

## Pitfalls

- **Assuming a static anchor**: routines shift across days of the week and
  seasons; re-run with temporal sub-slices for time-varying analysis.
- **Mis-scoring guardianship**: a "busy" location is not always a "capable
  guardian" — capable guardianship requires the willingness *and* ability to
  intervene.
- **Reverse causation**: a cluster of offenses near a node does not by itself
  prove the suspect's routine passes through it; corroborate independently.

## Integration

- Feeds `assets/templates/behavioral-pattern-profile.md`.
- Pair with **Geographic Profiling**: geographic profile suggests the anchor;
  RAT explains why offense sites cluster near specific nodes around it.
- Run `scripts/geo-profiler.ts --routine examples/sample-offenses.json` (when a
  routine payload is supplied) for reproducible results.

## Quick Checklist

- [ ] Every routine node has a lawful, documented source.
- [ ] `guardianStrength` scored with explicit justification per node.
- [ ] Top risk zones cross-referenced against the geographic profile's
      estimated anchor.
- [ ] Output framed as prioritization support, not prediction of a specific
      individual's future behavior.
- [ ] Disclaimer attached.

---

**Research citation indices** (see RESEARCH-PAPER-KNOWLEDGE-BRAIN.md): #3, #4, #21, #22. Each cited source is applied to a concrete tool, reference, template, or script — see the consolidated mapping table in that file.
