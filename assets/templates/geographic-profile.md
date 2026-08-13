# Geographic Profile Template

> Generated from the `geographic_profile` tool (conceptual Rossmo CGT score).
> Attach the professional disclaimer and legal-scope note.

**Case ID**: [CASE-ID]
**Generated**: [ISO timestamp]
**Methodology**: Rossmo-style CGT (conceptual application)
**Parameters**: buffer_zone_km=`B`, decay_constant_km=`D`, grid_cell_km=`G`, grid_padding_km=`P`

## Disclaimer

This profile is general, educational/analytical information to support lawful
professional investigation. It is a prioritization aid, not a warrant-grade
locator, and not a determination about any named individual. Verify with
qualified professionals and corroborating evidence before acting.

## Offense Sites

| # | Label | Lat | Lon | Timestamp | Weight |
|---|-------|-----|-----|-----------|--------|
| S1 | [label] | [lat] | [lon] | [ISO] | 1.0 |
| ... | ... | ... | ... | ... | ... |

Minimum recommended: ≥3 geocoded sites for a meaningful profile.

## Top Candidate Anchor Cells

| Rank | Lat | Lon | Raw score | Normalized | Band |
|------|-----|-----|-----------|------------|------|
| 1 | [lat] | [lon] | [raw] | 1.00 | P1-High |
| ... | ... | ... | ... | ... | ... |

## Estimated Anchor (weighted centroid of top-10 cells)

- **Lat**: [lat]
- **Lon**: [lon]

## Envelope

- minLat / maxLat: [..] / [..]
- minLon / maxLon: [..] / [..]

## Cross-Check Against Awareness Space

| Known node | Distance to estimated anchor (km) | Consistent? |
|------------|-----------------------------------|-------------|
| Home address | [d] | Yes / No / Unknown |
| Workplace | [d] | ... |
| Prior address | [d] | ... |

## Interpretation & Limitations

- The CGT surface is conceptual, not a calibrated probability; it prioritizes
  search areas.
- Single-site inputs produce a circular band — require ≥3 sites.
- Great-circle distance is used; road-network analysis may refine.
- Geocoding quality must meet Ratcliffe's minimum acceptable hit rate standard.

## Legal & Ethical Boundaries

- Act on the profile only with a lawful basis for the planned action.
- Positional-data use requires a warrant or explicit lawful basis.
- No definitive judgment about a named individual's residence.

## Quality Checks

- [ ] ≥3 geocoded offense sites.
- [ ] Buffer/decay constants documented for offender mobility.
- [ ] Estimated anchor cross-checked against known awareness space.
- [ ] Reproducible via `scripts/geo-profiler.ts <offenses-file>`.
- [ ] Disclaimer + legal-scope note attached.
