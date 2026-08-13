# Lead Prioritization Matrix

Model: weighted-mcda-v1
Weights (normalized): proximity=0.2, temporal_recency=0.2, source_reliability=0.25, corroborative_strength=0.2, actionability=0.15

| Rank | ID | Description | Source | Reliability | Weighted | Normalized | Band | Rationale |
|------|----|-------------|--------|-------------|----------|------------|------|-----------|
| 1 | L4 | Department record (authorized query): subject's known associate A2 shares a residential lease near the estimated anchor. | department-records-with-authorization | High | 0.8604 | 1.0000 | P1-High | source reliability High (1); strong suspect-anchor proximity; 3 corroborating item(s); immediately actionable. |
| 2 | L1 | Witness statement: subject seen near 4th & Main convenience store on the night of offense S2. | lawfully-obtained-witness-statements | Medium | 0.7673 | 0.8596 | P1-High | source reliability Medium (0.6); strong suspect-anchor proximity; temporally recent; 2 corroborating item(s); immediately actionable. |
| 3 | L5 | Public record: vehicle registration for a blue sedan matches the witness description in L1. | public-records | High | 0.6723 | 0.7162 | P2-Medium | source reliability High (1); immediately actionable. |
| 4 | L2 | Public court record: subject has a prior burglary conviction in 2021 in the same district. | court-records | High | 0.6573 | 0.6936 | P2-Medium | source reliability High (1); strong suspect-anchor proximity. |
| 5 | L3 | Open-source public social-media post (publicly viewable): photo at a gym 3 km from offense cluster, timestamped between S2 and S3. | open-source-intelligence-public | Medium | 0.5748 | 0.5692 | P2-Medium | source reliability Medium (0.6); temporally recent. |
| 6 | L6 | Unsourced tip from anonymous caller; no corroboration; low reliability. | lawfully-obtained-witness-statements | Low | 0.1975 | 0.0000 | P4-Background | source reliability Low (0.3). |

## Component Scores

| ID | proximity | temporal | sourceRel | corroboration | actionability |
|----|-----------|----------|-----------|---------------|---------------|
| L4 | 0.90 | 0.65 | 1.00 | 0.86 | 0.85 |
| L1 | 0.85 | 0.90 | 0.60 | 0.74 | 0.80 |
| L5 | 0.60 | 0.50 | 1.00 | 0.49 | 0.70 |
| L2 | 0.70 | 0.40 | 1.00 | 0.49 | 0.60 |
| L3 | 0.55 | 0.75 | 0.60 | 0.49 | 0.45 |
| L6 | 0.30 | 0.20 | 0.30 | 0.00 | 0.15 |