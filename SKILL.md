---
name: suspect-tracing-investigator
description: A professional-support skill for law-enforcement and licensed investigators that organizes investigative leads into a weighted-MCDA prioritization matrix, applies geographic profiling (Rossmo CGT, conceptual), analyzes movement and behavioral patterns using Routine Activity Theory (Cohen & Felson), maps known associates via link/network analysis (Brandes betweenness, cut-vertices), drafts cognitive-interview question sets (Fisher & Geiselman), organizes lawfully-sourced digital-footprint leads, validates chain-of-custody continuity, and flags legal and ethical boundaries (jurisdiction, warrant requirements). Use this skill whenever the user requests lead organization, lead prioritization, geographic narrowing, behavioral/routine pattern analysis, associate or network mapping, witness/informant interview preparation, digital-footprint lead organization, chain-of-custody checks, or legal/ethical boundary flagging for lead-following — even if they do not name the skill explicitly. Explicitly restricted to lawful professional investigative use; refuses private surveillance or vigilante requests. Applies research-grounded methodologies to support (not replace) professional investigative judgment.
---

# Suspect Tracing & Fugitive Investigation Support

## Purpose

A **research-grounded** professional-support skill for law-enforcement and
licensed investigators to organize leads, analyze movement and behavioral
patterns, and prioritize investigative avenues when tracing a suspect or
fugitive. Integrates established forensic, geographic-profiling, and
behavioral-science methodologies. Explicitly restricted to lawful professional
investigative use — not private surveillance.

**Research Foundation**: D. K. Rossmo (Geographic Profiling, 2000); Cohen &
Felson (Routine Activity Theory, 1979); Sparrow (Network Analysis for Criminal
Intelligence, 1991); Fisher & Geiselman (Cognitive Interview, 1992); Brandes
(Betweenness Centrality, 2001); NRC (Strengthening Forensic Science, 2009).
See `SECOND-BRAIN-KNOWLEDGE-PAPER.md` and `references/` for the operationalized
extracts.

## Mandatory Disclaimer

**This skill provides general, educational/analytical information only. It is
not a substitute for advice from a qualified professional (legal, law
enforcement, forensic, or otherwise, as applicable). Always verify conclusions
with appropriate qualified professionals before making decisions based on its
output. This skill does not provide certified determinations, legal opinions,
or judgments about named individuals.** Every substantive response produced
under this skill carries this disclaimer; do not soften or drop it even if the
user asks.

## Scope

### What This Skill Does

- Organize known suspect data into a structured **lead-prioritization matrix**
  (weighted MCDA) with priority bands P1..P4.
- Apply **geographic profiling** (Rossmo CGT, conceptual) to narrow likely
  anchor areas from offense sites.
- Analyze movement/behavioral patterns using **Routine Activity Theory**
  (Cohen & Felson) to identify space/time convergence zones.
- Map known associates via **link/network analysis** (degree, weighted degree,
  Brandes betweenness, Tarjan cut-vertices) and rank investigative influence.
- Draft structured **cognitive-interview** question sets (Fisher & Geiselman)
  for witnesses/informants.
- Organize **digital-footprint** leads restricted to publicly available,
  lawfully obtained information.
- Validate **chain-of-custody** continuity for evidence items.
- Flag **legal and ethical boundaries** relevant to lead-following
  (jurisdiction, warrant requirements, no-definitive-judgment rule).

### What This Skill Does Not Do

- Provide legal advice or definitive determinations about individuals.
- Support private surveillance, stalking, or vigilante action.
- Use unauthorized location tracking, stolen data, or credentials-shared
  social-media access.
- Replace professional investigative judgment, forensic analysis, or legal
  review.
- Predict a specific individual's future behavior.

## Architecture

This skill uses a **chain-of-thought router + specialized sub-agents + modular
skill-registry** pattern (see `assets/diagrams/system-architecture.md`):

1. **RouterAgent** (`config/agents.ts`) classifies the request, emits an
   auditable chain-of-thought trace, and selects sub-agents by trigger
   matching plus payload-driven overrides.
2. **SkillRegistry** registers six specialized sub-agents, each owning one
   methodology domain.
3. **InvestigationOrchestrator** dispatches the selected sub-agents in cascade
   strategy, synthesizes their results, applies the guardrail hook, and emits
   a structured `AgentResponse` (or a structured refusal on guardrail
   violation).
4. **ToolRegistry** (`config/tools.ts`) exposes seven tools with **real
   functional handlers** (no stubs) and pure computational cores reused by
   `/scripts`.

## Sub-Agents & Tools

| Sub-agent | Tool(s) | Methodology |
|-----------|---------|-------------|
| Lead Orchestrator | `score_leads` | Weighted MCDA lead prioritization |
| Geographic Profiler | `geographic_profile`, `routine_activity_analysis` | Rossmo CGT; Cohen & Felson RAT |
| Behavioral Analyst | `routine_activity_analysis` | Routine Activity Theory |
| Network Analyst | `link_analysis` | Sparrow network analysis + Brandes + Tarjan |
| Interview Planner | `generate_interview_questions` | Fisher & Geiselman cognitive interview |
| Legal Guardrail | `check_legal_scope`, `validate_chain_of_custody` | Guardrails; chain of custody |

See `SKILL_REGISTRY.md` for input/output JSON schemas, registration, and
execution contracts.

## Decision Tree for Methodology Selection

```
Is the user organizing or prioritizing leads/tips?
├── Yes → Lead Orchestrator (score_leads)
└── No → continue

Is the user narrowing where to search from offense sites?
├── Yes → Geographic Profiler (geographic_profile)
└── No → continue

Is the user analyzing routines/movement/convergence/guardianship?
├── Yes → Behavioral Analyst (routine_activity_analysis)
└── No → continue

Is the user mapping associates / connections / influence?
├── Yes → Network Analyst (link_analysis)
└── No → continue

Is the user planning a witness/informant interview?
├── Yes → Interview Planner (generate_interview_questions)
└── No → continue

Is the user checking legality / lawful basis / chain of custody?
├── Yes → Legal Guardrail (check_legal_scope / validate_chain_of_custody)
└── No → Lead Orchestrator as default intake, with a Legal Guardrail pass
```

The router always appends a **Legal Guardrail** pass in cascade strategy when
budget allows, so lawful-scope is enforced on every substantive response.

## Output Structures

### Lead Prioritization Matrix (`score_leads`)
```json
{
  "model": "weighted-mcda-v1",
  "ranked_leads": [
    {
      "lead_id": "L1", "description": "...", "source": "...", "source_reliability": "High",
      "component_scores": { "proximity": 0.90, "temporal_recency": 0.80, "source_reliability": 1.0, "corroborative_strength": 0.70, "actionability": 0.85 },
      "weighted_score": 0.88, "normalized_score": 1.0,
      "priority_band": "P1-High", "rank": 1,
      "rationale": "source reliability High (1.00); strong suspect-anchor proximity; immediately actionable."
    }
  ]
}
```
Template: `assets/templates/lead-prioritization-matrix.md`.

### Geographic Profile (`geographic_profile`)
```json
{
  "cells": [ { "lat": 34.0522, "lon": -118.2437, "rawScore": 1.4231, "normalizedScore": 1.0, "priorityBand": "P1-High" } ],
  "topCells": [ ... ],
  "estimatedAnchor": { "lat": 34.0523, "lon": -118.2430 },
  "envelope": { "minLat": ..., "maxLat": ..., "minLon": ..., "maxLon": ... },
  "parameters": { "bufferZoneKm": 1.5, "decayConstantKm": 4.0, "gridCellKm": 0.5 }
}
```
Template: `assets/templates/geographic-profile.md`.

### Routine Activity Analysis (`routine_activity_analysis`)
```json
{
  "convergencePoints": [ { "nodeId": "N1", "label": "suspect gym", "distanceKm": 3.2, "guardianGap": 0.85, "riskScore": 0.72 } ],
  "topRiskZones": [ ... top 5 ... ],
  "interpretation": "Per Cohen & Felson (1979) ..."
}
```
Template: `assets/templates/behavioral-pattern-profile.md`.

### Link Analysis (`link_analysis`)
```json
{
  "nodes": [ { "id": "A2", "name": "...", "role": "financial", "degree": 4, "weightedDegree": 2.8, "betweenness": 6.5, "isCutVertex": true, "influenceScore": 0.81 } ],
  "cutVertices": ["A2"], "edgeCount": 9, "nodeCount": 7,
  "interpretation": "Identified 1 cut-vertex node(s) ..."
}
```
Template: `assets/templates/associate-link-map.md`.

### Interview Plan (`generate_interview_questions`)
```json
{
  "methodology": "Cognitive Interview (Fisher & Geiselman, 1992)",
  "components_addressed": [ "Context reinstatement", "Recall everything", "Varied recall order", "Changed perspectives" ],
  "questions": [ { "phase": "Rapport", "question": "..." }, { "phase": "Open Narrative", "question": "..." } ],
  "reliability_considerations": [ "Avoid leading or suggestive questions; ..." ],
  "post_interview_actions": [ "Transcribe and store the recorded interview per chain-of-custody protocol.", ... ]
}
```
Template: `assets/templates/interview-question-set.md`.

### Legal Scope (`check_legal_scope`)
```json
{
  "compliant": true, "violations": [], "warnings": [ "Target is a named individual — ..." ],
  "required_action": "Proceed with documented lawful basis; address warnings before acting.",
  "disclaimer": "This compliance check is general analytical guidance, not legal advice. ..."
}
```
Template: `assets/templates/investigative-action-memo.md`.

### Chain of Custody (`validate_chain_of_custody`)
```json
{ "valid": true, "errors": [], "warnings": [ "Item E2: storage_location not specified." ], "itemsVerified": 3, "summary": "All 3 custody item(s) passed continuity verification." }
```

## Quality Checks (before delivering any output)

1. **Methodology named** — explicitly state the framework used.
2. **Disclaimer present** — the mandatory professional disclaimer is attached.
3. **Legal-scope note present** — lawful-sourcing, warrant, and
   no-definitive-judgment rules are surfaced.
4. **Evidence-grounded** — conclusions follow from provided data, not
   assumptions; confidence is stated (Low/Medium/High).
5. **Limitations acknowledged** — note what the analysis cannot determine
   (e.g., geographic profile is prioritization, not a warrant-grade locator).
6. **Reproducible** — record the config version and the input file/hash for
   auditability; prefer running the matching `/scripts` tool.

## Tone

Professional, precise, honest about uncertainty. Use probabilistic language
("appears", "suggests", "consistent with") rather than definitive claims.
Where the evidence base is contested, say so.

## Configuration

The skill is driven by `/config`:
- `schema.json` — JSON schema for configuration validation.
- `settings.example.json` — production configuration template (copy to
  `settings.json` for deployment).
- `index.ts` — type-safe configuration loader with environment overrides,
  structured logging, and validation.
- `hooks.ts` — EventBus, LifecycleManager, StateMachine, guardrail hook.
- `tools.ts` — ToolRegistry + 7 tools with real functional handlers and pure
  computational cores.
- `agents.ts` — RouterAgent, SkillRegistry, 6 sub-agents, orchestrator.

## Hooks, Tools, and Scripts

- **Hooks** (`config/hooks.ts`): lifecycle management, state synchronization,
  event emission, guardrail enforcement.
- **Tools** (`config/tools.ts`): rich JSON-schema tool definitions with
  execution handlers; pure cores reused by `/scripts`.
- **Scripts** (`scripts/`): `validate.ts`, `lead-scorer.ts`, `geo-profiler.ts`,
  `network-analyzer.ts` — reproducible CLI tools for offline validation.

## References

Eight methodology files in `/references` operationalize the knowledge base:
`lead-prioritization-mcda.md`, `geographic-profiling.md`,
`routine-activity-theory.md`, `link-network-analysis.md`,
`cognitive-interview.md`, `chain-of-custody.md`,
`digital-footprint-lawful-sourcing.md`, `legal-ethical-guardrails.md`.

## Further Reading

See `RESEARCH-PAPER-KNOWLEDGE-BRAIN.md` for the **31-source research brain** (each source applied to a concrete project component, with a source-to-component mapping table). See also `SECOND-BRAIN-KNOWLEDGE-PAPER.md` for the original curated reading list, and
and `references/` for the operationalized extracts.

## Reproducibility & Testing

- scripts/investigate.ts runs the full pipeline (router + sub-agents + guardrails) on a case bundle and emits a complete report (markdown or --json).
- 	ests/ contains a node:test suite (run via 
px ts-node tests/run.ts or 
pm test) covering all computational cores, the validator, and the orchestrator guardrail path.
- 
pm run typecheck runs 	sc --noEmit; 
pm test runs the test suite; 
pm run investigate runs the full pipeline on a case file.
