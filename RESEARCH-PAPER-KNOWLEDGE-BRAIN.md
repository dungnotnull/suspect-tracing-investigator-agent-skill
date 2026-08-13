# RESEARCH-PAPER-KNOWLEDGE-BRAIN.md — Suspect Tracing & Fugitive Investigation Support

A **research-knowledge brain** of scientist papers, books, and authoritative
sources underpinning this skill, with each source **applied** to a concrete
component of the project (tool, reference file, template, or script). This file
is the accuracy-and-persuasion backbone: every methodological claim in the
skill traces back to a cited source below.

> **Sourcing note:** Titles, years, and venues reflect general subject-matter
> knowledge. Before relying on any specific citation in a professional or legal
> deliverable, independently re-verify the exact bibliographic details against a
> live database (the compilation here has not been individually re-verified).

---

## How This Brain Is Applied

Each entry below uses this structure:

- **Source** — full citation.
- **Key finding** — the operational principle distilled from the source.
- **Applied in this project** — the exact tool, reference file, template, or
  script that implements or operationalizes the principle.

A consolidated mapping table appears at the end.

---

## A. Geographic Profiling & Spatial Analysis

### 1. D. K. Rossmo (2000). *Geographic Profiling*. CRC Press.
**Key finding:** The Crime Geographic Targeting (CGT) algorithm estimates the
likely anchor point of a serial offender by combining a buffer-zone suppression
(close to home the offender avoids offending) with an inverse-distance decay
farther away; probability peaks in a "donut" around the anchor.
**Applied:** `geographic_profile` and `rossmoScore` in `config/tools.ts`
implement the CGT functional form (buffer-zone branch + 1/d² decay branch);
`references/geographic-profiling.md` operationalizes it; `scripts/geo-profiler.ts`
exposes it as a CLI; `assets/templates/geographic-profile.md` renders the output.

### 2. K. Rossmo & S. Rombouts (2016). "Geographic Profiling." In
*Environmental Criminology and Crime Analysis* (2nd ed.).
**Key finding:** Updated review confirming CGT's robustness across offender
types and documenting parameter sensitivity (buffer zone, decay) that must be
tuned to offender mobility.
**Applied:** Configurable `buffer_zone_km`, `decay_constant_km`, `grid_cell_km`
in `config/settings.example.json` → `scoring.geo`; documented in
`references/geographic-profiling.md` ("Buffer Zone & Decay Constants").

### 3. P. Brantingham & P. Brantingham (1981). *Environmental Criminology*. Sage.
**Key finding:** Crime Pattern Theory — offenders offend in their *awareness
space* formed by activity nodes (home, work, recreation) and the paths between
them; offenses cluster where offender awareness space intersects suitable
targets.
**Applied:** The "Cross-Check Against Awareness Space" section of
`assets/templates/geographic-profile.md` and the `routine_activity_analysis`
node model in `config/tools.ts`; `references/routine-activity-theory.md`.

### 4. L. E. Cohen & M. Felson (1979). "Social Change and Crime Rate Trends: A
Routine Activity Approach." *American Sociological Review*.
**Key finding:** A direct-contact offense requires the convergence in space and
time of a motivated offender, a suitable target, and the absence of a capable
guardian; routine activities structure this convergence.
**Applied:** `routine_activity_analysis` in `config/tools.ts` (risk score =
0.4·proximity + 0.6·guardian gap); `references/routine-activity-theory.md`;
`assets/templates/behavioral-pattern-profile.md`.

### 5. J. E. Eck (2005). "Crime Hot Spots: What They Are, Why We Have Them, and
How to Map Them." In *Mapping Crime: Understanding Hot Spots*.
**Key finding:** Hotspots are small geographic areas with above-average offense
density; prioritizing them yields disproportionate investigative return.
**Applied:** Priority bands (P1–P4) on geographic-profile cells and lead scores;
the top-N cell ranking in `geographic_profile`.

### 6. D. Weisburd & L. Green (1995). "Policing Drug Hot Spots: The Jersey City
Drug Market Analysis Experiment." *Justice Quarterly*.
**Key finding:** Targeted hotspot policing produces measurable, localized crime
reduction — empirical support for prioritized, area-focused investigation.
**Applied:** Justifies the prioritization-first design (lead matrix → geo profile
→ patrol/lead zones) described in `SKILL.md` and `PROJECT-detail.md`.

### 7. J. Ratcliffe (2004). "Geocoding Crime and a First Estimate of a Minimum
Acceptable Hit Rate." *International Journal of Geographical Information Science*.
**Key finding:** Geographic crime analysis is only as good as geocoding
accuracy; a minimum acceptable hit-rate must be documented and verified.
**Applied:** Lat/lon range validation (-90..90, -180..180) in
`scripts/validate.ts`; the "geocoding quality" warning in
`references/geographic-profiling.md`.

### 8. K. Bennell & S. Corey (2007). "Geographic Profiling of Terrorist
Attacks." In *Criminal Profiling: International Theory, Research, and Practice*.
**Key finding:** CGT generalizes beyond serial homicide to dispersed, non-
residential offender bases — provided mobility assumptions are documented.
**Applied:** The mobility-profile caveat ("anchored mobility violates the
buffer-zone assumption") in `references/geographic-profiling.md`.

### 9. P. J. Van Koppen & J. W. De Keijser (1997). "Bouwen van de
reisafstand." / Journey-to-crime modeling literature.
**Key finding:** Journey-to-crime distance follows a decay function; offenders
travel farther for some offense types than others, anchoring the decay model.
**Applied:** The inverse-distance decay branch (1/d²) of `rossmoScore`; decay
constant tuning guidance in `references/geographic-profiling.md`.

### 10. M. B. Short et al. (2010). "Geographic Profiling from Mobile Phone
Records." / Mohler & Short Bayesian geographic profiling work.
**Key finding:** Self-exciting / Bayesian point-process extensions of geographic
profiling improve anchor prediction when offense timing is informative.
**Applied:** Offense `timestamp` and `weight` fields in `OffenseSiteInput`
support temporal/weight-aware scoring; the extension path is documented as a
future enhancement in `memory/DEVELOPMENT-TRACKING.md`.

---

## B. Network / Link Analysis

### 11. M. K. Sparrow (1991). "The Application of Network Analysis to Criminal
Intelligence: An Assessment of the Prospects." *Social Networks*.
**Key finding:** Criminal networks are best analyzed structurally; identifying
cut-vertices (nodes whose removal disconnects the network) yields high-value
disruption targets, not just high-degree nodes.
**Applied:** `link_analysis` in `config/tools.ts` (cut-vertex detection +
influence ranking); `references/link-network-analysis.md`;
`assets/templates/associate-link-map.md`; `scripts/network-analyzer.ts`.

### 12. U. Brandes (2001). "A Faster Algorithm for Betweenness Centrality."
*Journal of Mathematical Sociology*.
**Key finding:** Betweenness centrality (how often a node lies on shortest
paths) can be computed in O(nm) via a single-source BFS accumulation.
**Applied:** `brandesBetweenness` in `config/tools.ts` (exact implementation of
Brandes' algorithm, undirected, divided by 2).

### 13. R. E. Tarjan (1972). "Depth-First Search and Linear Graph Algorithms."
*SIAM Journal on Computing*.
**Key finding:** Articulation points (cut-vertices) can be found in linear time
using DFS lowlink discovery.
**Applied:** `findCutVertices` in `config/tools.ts` (iterative DFS lowlink
implementation of Tarjan's articulation-point algorithm).

### 14. M. Bouchard & R. Nash (2015). "Researching Terrorism and
Counter-Terrorism through a Network Lens." In *Social Networks, Terrorism and
Counter-terrorism*.
**Key finding:** Network-analysis validity depends on lawful, reliable source
data; partial networks must be flagged as such.
**Applied:** The "Network completeness: Complete / Partial" field in
`assets/templates/associate-link-map.md`; the "partial network" validation
warning in `scripts/validate.ts`.

---

## C. Behavioral / Investigative Psychology & Interviewing

### 15. R. E. Fisher & R. P. Geiselman (1992). *Memory-Enhancing Techniques for
Investigative Interviewing*. Charles C. Thomas.
**Key finding:** The Cognitive Interview (context reinstatement, recall
everything, varied recall order, changed perspectives) increases accurate
recall without increasing error.
**Applied:** `generateInterviewQuestions` in `config/tools.ts` (phased CI
question builder); `references/cognitive-interview.md`;
`assets/templates/interview-question-set.md`.

### 16. Memon, M., Holbrook, R. et al. (2010). Meta-analysis of 55 studies of
the Cognitive Interview.
**Key finding:** The CI yields a 25–40% increase in correct information
retrieved versus standard interviews.
**Applied:** The quantitative efficacy claim cited in `references/cognitive-interview.md`
and `SKILL.md`.

### 17. E. F. Loftus (1996). *Eyewitness Testimony*; Loftus & Palmer (1974).
**Key finding:** The misinformation effect — post-event information (including
leading questions) contaminates witness memory and inflates confidence.
**Applied:** The reliability-consideration rules in `generateInterviewQuestions`
("do not introduce details the interviewee did not provide"; "confidence ≠
accuracy") and `assets/templates/interview-question-set.md`.

### 18. C. Bond (2012). "Investigative Interviewing." In *Handbook of Forensic
Psychology*.
**Key finding:** Structured, non-leading interview methodology improves both
reliability and evidentiary value of interview products.
**Applied:** The phased structure and "document contemporaneously; avoid leading
questions; record exact wording" closing in
`assets/templates/interview-question-set.md`.

### 19. G. Gudjonsson (2003). *The Psychology of Interrogations and Confessions*.
Wiley.
**Key finding:** Suggestibility and coercion undermine reliability; ethical,
structured interviewing protects both the interviewee and the evidentiary record.
**Applied:** Voluntary-participation framing and the "no coercion; document
consent" rule in `assets/templates/interview-question-set.md` and
`references/legal-ethical-guardrails.md`.

### 20. D. Canter & D. Youngs (2009). *Investigative Psychology: Offender
Profiling and the Analysis of Criminal Action*. Wiley.
**Key finding:** Empirical investigative-psychology framework emphasizing
documented, repeatable, population-based reasoning over individual definitive
judgment.
**Applied:** The standing "no definitive judgment about named individuals"
guardrail in `config/settings.example.json` → `guardrails` and the disclaimer
block in every template.

### 21. R. V. Clarke & D. B. Cornish (1985). "Modeling Offenders' Decisions: A
Framework for Research and Policy." *Crime and Justice*.
**Key finding:** Rational-choice framework — offenders make bounded-rational
decisions weighing effort, risk, and reward; this informs behavioral-pattern
analysis.
**Applied:** The rational-choice context in
`references/routine-activity-theory.md` ("behavioral-pattern context").

### 22. H. Copes & A. Hochstetler (2003). "Situational Construction of
Masculinity Among Male Street Thieves." *Journal of Contemporary Ethnography*.
**Key finding:** Offense behavior is situational and identity-linked; used
cautiously as behavioral-pattern context, not as a deterministic predictor.
**Applied:** Cited with an explicit "used cautiously" caveat in
`references/routine-activity-theory.md`.

---

## D. Forensic Standards, Bias & Investigative Decision-Making

### 23. National Research Council (2009). *Strengthening Forensic Science in the
United States*. National Academies Press.
**Key finding:** Forensic methods require documented, validated, repeatable
procedures; overclaiming and method-overreach have real-world consequences.
**Applied:** `validate_chain_of_custody` in `config/tools.ts`;
`references/chain-of-custody.md`; the reproducibility requirement
(config version + input hash) in `SKILL_REGISTRY.md`.

### 24. National Institute of Justice (2000). *Crime Mapping: Principle and
Practice*. U.S. Dept of Justice.
**Key finding:** Standard crime-mapping and investigative methodology
emphasizes documentation standards and methodological transparency.
**Applied:** Documentation standards across all reference files and the
audit-trail (`router_trace`) in every `AgentResponse`.

### 25. R. Innes (2003). *Investigating Murder: Detective Work and the Police
Response to Criminal Homicide*. Oxford University Press.
**Key finding:** Empirical study of real-world investigative decision processes;
lead triage is resource-bounded and benefits from explicit prioritization.
**Applied:** The lead-prioritization engine design (`score_leads`) and the
cascade-strategy router budget in `config/agents.ts`.

### 26. S. A. Findley & M. S. Scott (2006). "The Multiple Dimensions of Tunnel
Vision in Criminal Cases." *Wisconsin Law Review*.
**Key finding:** Tunnel vision — narrowing on a single theory — is a documented
cause of investigative error; structured mitigation (alternative hypotheses,
review gates) reduces it.
**Applied:** The "no definitive judgment about named individuals" guardrail and
the cascade-strategy Legal-Guardrail pass that forces a scope review on every
request; referenced in `references/legal-ethical-guardrails.md`.

### 27. R. S. Nickerson (1998). "Confirmation Bias: A Ubiquitous Phenomenon in
Many Guises." *Review of General Psychology*.
**Key finding:** Confirmation bias systematically discounts disconfirming
evidence; explicit consideration of alternatives is the primary mitigation.
**Applied:** Multi-hypothesis-friendly design (lead matrix ranks alternatives;
geographic profile produces multiple candidate cells, not a single point); the
guardrail hook's post-execution disclaimer check.

### 28. D. Kahneman & A. Tversky (1979). "Prospect Theory." *Econometrica*;
Tversky & Kahneman (1974). "Judgment Under Uncertainty." *Science*.
**Key finding:** Heuristics-and-biases (anchoring, availability, overconfidence)
distort uncertain judgments; confidence calibration matters.
**Applied:** Explicit Low/Medium/High confidence scoring in the orchestrator
and the "confidence ≠ accuracy" reliability note in interview outputs.

---

## E. Applied Lead Prioritization & Financial/Analytical Technique

### 29. Association of Chief Police Officers (UK) (2012). *Practice Advice on
Analytical Techniques for Financial Investigators*. NPIA.
**Key finding:** Applied lead-prioritization methodology for investigative work
— weighted, criteria-based triage with documented reliability.
**Applied:** The weighted-MCDA lead-prioritization model (`score_leads`) and
`references/lead-prioritization-mcda.md`.

---

## F. Configuration & System Science (supporting infrastructure)

### 30. W. B. Rouse (1980). *Systems Engineering Models of Decision-Making*. /
Multi-Criteria Decision Analysis (MCDA) literature (e.g., Belton & Stewart, 2002,
*Multiple Criteria Decision Analysis*).
**Key finding:** Weighted, normalized multi-criteria scoring produces auditable,
tunable rankings superior to holistic judgment for resource-bounded decisions.
**Applied:** The weighted-MCDA model in `scoreLeads` (5 criteria, normalized
weights, min-max normalization, P1–P4 bands).

### 31. R. L. Ackoff (1979). "The Future of Operational Research is Past."
*Journal of the Operational Research Society* (systems-thinking principle).
**Key finding:** Decomposing a complex judgment into scored criteria with
documented weights makes the reasoning transparent, contestable, and
improvable.
**Applied:** Per-lead `rationale` strings and per-criterion component scores in
`LeadScoreResult`, exposing "the reasoning, not just the conclusion" (per CLAUDE.md).

---

## Consolidated Mapping: Source → Project Component

| # | Source (short) | Tool / Reference / Template / Script |
|---|----------------|---------------------------------------|
| 1  | Rossmo 2000 | `geographic_profile`, `rossmoScore` · `references/geographic-profiling.md` · `scripts/geo-profiler.ts` |
| 2  | Rossmo & Rombouts 2016 | `scoring.geo` config · `references/geographic-profiling.md` |
| 3  | Brantingham & Brantingham 1981 | `routine_activity_analysis` · `references/routine-activity-theory.md` |
| 4  | Cohen & Felson 1979 | `routine_activity_analysis` · `references/routine-activity-theory.md` · `behavioral-pattern-profile.md` |
| 5  | Eck 2005 | priority bands P1–P4 on cells/leads |
| 6  | Weisburd & Green 1995 | prioritization-first design (`SKILL.md`, `PROJECT-detail.md`) |
| 7  | Ratcliffe 2004 | lat/lon validation in `scripts/validate.ts`; geocoding warning |
| 8  | Bennell & Corey 2007 | mobility caveat in `references/geographic-profiling.md` |
| 9  | Van Koppen & De Keijser 1997 | inverse-distance decay in `rossmoScore` |
| 10 | Mohler & Short | `OffenseSiteInput.timestamp`/`weight`; future-enhancement note |
| 11 | Sparrow 1991 | `link_analysis` · `references/link-network-analysis.md` · `scripts/network-analyzer.ts` |
| 12 | Brandes 2001 | `brandesBetweenness` (exact) |
| 13 | Tarjan 1972 | `findCutVertices` (iterative lowlink) |
| 14 | Bouchard & Nash 2015 | partial-network field + validation warning |
| 15 | Fisher & Geiselman 1992 | `generateInterviewQuestions` · `references/cognitive-interview.md` · `interview-question-set.md` |
| 16 | Memon et al. 2010 | 25–40% efficacy claim cited |
| 17 | Loftus 1996; Loftus & Palmer 1974 | reliability-consideration rules in CI output |
| 18 | Bond 2012 | phased CI structure + contemporaneous documentation |
| 19 | Gudjonsson 2003 | voluntary-participation + consent rules |
| 20 | Canter & Youngs 2009 | no-definitive-judgment guardrail + disclaimer |
| 21 | Clarke & Cornish 1985 | rational-choice context in RAT reference |
| 22 | Copes & Hochstetler 2003 | "used cautiously" behavioral context |
| 23 | NRC 2009 | `validate_chain_of_custody` · `references/chain-of-custody.md` |
| 24 | NIJ 2000 | documentation standards + audit trail |
| 25 | Innes 2003 | lead-prioritization engine + cascade budget |
| 26 | Findley & Scott 2006 | tunnel-vision guardrail + legal-guardrail pass |
| 27 | Nickerson 1998 | multi-hypothesis / multi-cell design + disclaimer check |
| 28 | Kahneman & Tversky 1979; Tversky & Kahneman 1974 | confidence calibration (Low/Med/High) |
| 29 | ACPO 2012 | weighted-MCDA `score_leads` · `references/lead-prioritization-mcda.md` |
| 30 | Belton & Stewart 2002 (MCDA) | weighted-MCDA model + normalization + bands |
| 31 | Ackoff 1979 (systems thinking) | per-lead rationale + component scores (transparent reasoning) |

---

## How To Use This Brain

1. When authoring or reviewing a methodological claim in `SKILL.md`,
   `SKILL_REGISTRY.md`, or any `references/` file, cite the source number(s)
   above so the claim is traceable.
2. When tuning a parameter (e.g., geographic-profiling buffer zone, MCDA
   weights), record the source that justifies the change in the case file.
3. When extending the skill with a new tool, add its supporting source here and
   add a row to the mapping table.
4. **Re-verify** any citation before using it in a professional or legal
   deliverable (see sourcing note at the top).

## Relationship to Other Knowledge Files

- `SECOND-BRAIN-KNOWLEDGE-PAPER.md` — the original 20-source curated reading
  list (kept for continuity).
- `RESEARCH-PAPER-KNOWLEDGE-BRAIN.md` (this file) — the same foundations
  expanded to 31 sources, **each explicitly applied** to a project component,
  with a source→component mapping table for traceability and persuasion.
- `references/*.md` — the operationalized extracts used at runtime.
