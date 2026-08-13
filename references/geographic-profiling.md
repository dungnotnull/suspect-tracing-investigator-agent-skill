# Reference — Geographic Profiling (Rossmo, conceptual application)

## Purpose

Narrow the likely area of a suspect's anchor point (residence, workplace, or
social base) from a set of known offense sites. Used to prioritize patrol,
canvass, and lead-following effort.

## Research Foundation

- D. K. Rossmo (2000). *Geographic Profiling*. CRC Press — foundational
  methodology and the Crime Geographic Targeting (CGT) score.
- K. Rossmo, S. Rombouts (2016). "Geographic Profiling." In *Environmental
  Criminology and Crime Analysis* (2nd ed.) — updated methodology review.
- P. Brantingham, P. Brantingham (1981). *Environmental Criminology*. Sage —
  crime pattern theory: awareness space, activity nodes, and paths.
- K. Bennell, S. Corey (2007). "Geographic Profiling of Terrorist Attacks." In
  *Criminal Profiling: International Theory, Research, and Practice* — applied
  geographic profiling to non-serial-offense datasets.
- J. E. Eck (2005). "Crime Hot Spots: What They Are, Why We Have Them, and How
  to Map Them." In *Mapping Crime: Understanding Hot Spots* — hotspot analysis
  methodology.
- D. Weisburd, L. Green (1995). "Policing Drug Hot Spots." *Justice Quarterly*
  — empirical hotspot-based investigative strategy.
- J. Ratcliffe (2004). "Geocoding Crime and a First Estimate of a Minimum
  Acceptable Hit Rate." *IJGIS* — methodological standard for geographic crime
  analysis (geocoding accuracy).

## Conceptual CGT Score

For a candidate anchor point `s` and a set of offense sites `{c_i}` with buffer
zone radius `B`:

```
P(s) = Σ_i  φ_i / d_i^2         when d_i > B        (inverse-distance decay)
        Σ_i  φ_i * (1 - d_i / B)  when 0 < d_i ≤ B   (buffer-zone suppression)
        Σ_i  φ_i                 when d_i = 0
```

where `d_i` is the great-circle distance (km) from `s` to `c_i` (Haversine) and
`φ_i` is an offense weight (default 1). Higher `P(s)` ⇒ higher prior probability
the anchor lies at `s`.

This is a **conceptual** application, not a calibrated probabilistic model.
It is appropriate for prioritizing search areas; it is **not** a warrant-grade
locator and must be combined with corroborating evidence.

## Procedure (operationalized in `geographicProfile`, `config/tools.ts`)

1. Collect offense sites with `lat`, `lon`, optional `timestamp`, `weight`.
2. Define a bounding box padded by `gridPaddingKm` (default 2 km).
3. Discretize the box into a grid at `gridCellKm` resolution (default 0.5 km).
4. Compute `rossmoScore` at each cell.
5. Normalize each cell's raw score by the grid maximum → `normalizedScore`
   in 0..1; assign priority bands (P1..P4) as in the lead model.
6. Rank cells; the **weighted centroid of the top-10 cells** is the estimated
   anchor point.
7. Cross-check the estimated anchor against the suspect's known awareness space
   (activity nodes, commute paths, prior addresses).

## Buffer Zone & Decay Constants

Defaults (overridable via `config`):

- `buffer_zone_km`: 1.5 — the "don't-offend-too-close-to-home" buffer.
- `decay_constant_km`: 4.0 — controls how rapidly probability falls with
  distance (the exponent is fixed at 2 here for portability).
- `grid_cell_km`: 0.5 — search grid resolution.
- `grid_padding_km`: 2.0 — how far beyond the offense envelope to extend the
  grid.

Tune these for the offender type and geography (urban vs. rural, mobility
profile). Document any deviation in the case file.

## Output Schema (excerpt)

```json
{
  "cells": [ { "lat": 34.0522, "lon": -118.2437, "rawScore": 1.4231, "normalizedScore": 1.0, "priorityBand": "P1-High" } ],
  "topCells": [ ... 10 highest ... ],
  "estimatedAnchor": { "lat": 34.0523, "lon": -118.2430 },
  "envelope": { "minLat": ..., "maxLat": ..., "minLon": ..., "maxLon": ... },
  "parameters": { "bufferZoneKm": 1.5, "decayConstantKm": 4.0, "gridCellKm": 0.5 }
}
```

## Pitfalls

- **Single-site profiling is unreliable**: with one offense site the surface
  collapses to a circular band; require ≥3 sites for a meaningful profile.
- **Geocoding error**: a site mis-located by even a few hundred meters can
  shift the estimated anchor. Follow Ratcliffe's geocoding-quality standard.
- **Anchored mobility**: a mobile offender (long-haul trucker, rideshare
  driver) violates the buffer-zone assumption; document mobility before
  trusting the profile.
- **Road-network vs. Euclidean distance**: this model uses great-circle
  distance; real travel follows road networks. Use the profile to
  prioritize, then validate with a road-network analysis.

## Integration

- Output feeds `assets/templates/geographic-profile.md`.
- Combine with **Routine Activity Theory** to weight candidate nodes by
  guardianship gaps (`routine_activity_analysis`).
- Run `scripts/geo-profiler.ts examples/sample-offenses.json` to reproduce the
  surface.

## Quick Checklist

- [ ] ≥3 geocoded offense sites with verified coordinates.
- [ ] Buffer/decay constants documented for the offender mobility profile.
- [ ] Grid resolution is fine enough to localize but coarse enough to compute
      (0.5 km is a sane default for urban cases).
- [ ] Estimated anchor cross-checked against known awareness space.
- [ ] Disclaimer attached; profile framed as prioritization, not proof.

---

**Research citation indices** (see RESEARCH-PAPER-KNOWLEDGE-BRAIN.md): #1, #2, #5, #6, #7, #8, #9, #10. Each cited source is applied to a concrete tool, reference, template, or script — see the consolidated mapping table in that file.
