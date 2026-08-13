# PROJECT-detail.md — Suspect Tracing & Fugitive Investigation Support

## 1. Problem Statement

A professional-support skill for law-enforcement and licensed investigators to
organize leads, analyze movement/behavioral patterns, and prioritize
investigative avenues when tracing a suspect, grounded in established forensic
and geographic-profiling research. Explicitly restricted to lawful professional
investigative use, not private surveillance.

## 2. Target Users

- **Sworn investigators / detectives** leading a suspect-tracing or fugitive
  case and needing structured lead triage and prioritization.
- **Licensed investigators** operating under lawful authority who need
  research-grounded analytical support (not conclusions) for their work product.
- **Intelligence analysts** organizing open-source and authorized-record leads
  into auditable, reproducible matrices and network maps.
- **Criminology students and researchers** studying applied geographic
  profiling, routine activity theory, and link analysis on fictional cases.

This skill is explicitly **not** intended for private surveillance, vigilante
action, or any use outside a lawful professional investigative authority.

## 3. Functional Specification

### 3.1 Core Capabilities

- Organize known suspect data into a structured lead-prioritization matrix
- Apply geographic profiling concepts to narrow likely areas of activity
- Analyze behavioral/routine patterns using routine-activity theory
- Support digital-footprint lead organization (publicly available, lawfully obtained information only)
- Draft structured witness/informant interview question sets
- Flag legal and ethical boundaries relevant to lead-following (jurisdiction, warrant requirements)

### 3.2 Key Methodologies & Frameworks Applied

Each framework is operationalized as a concrete tool + reference file + template:

| Framework | Tool | Reference | Template |
|-----------|------|-----------|----------|
| **Weighted MCDA lead prioritization** | `score_leads` | `references/lead-prioritization-mcda.md` | `assets/templates/lead-prioritization-matrix.md` |
| **Geographic profiling (Rossmo CGT, conceptual)** | `geographic_profile` | `references/geographic-profiling.md` | `assets/templates/geographic-profile.md` |
| **Routine Activity Theory (Cohen & Felson)** | `routine_activity_analysis` | `references/routine-activity-theory.md` | `assets/templates/behavioral-pattern-profile.md` |
| **Link analysis / network analysis** | `link_analysis` | `references/link-network-analysis.md` | `assets/templates/associate-link-map.md` |
| **Cognitive interview technique** | `generate_interview_questions` | `references/cognitive-interview.md` | `assets/templates/interview-question-set.md` |
| **Chain-of-custody & evidentiary integrity** | `validate_chain_of_custody` | `references/chain-of-custody.md` | `assets/templates/suspect-case-file.md` |
| **Digital-footprint lawful sourcing** | `check_legal_scope` | `references/digital-footprint-lawful-sourcing.md` | `assets/templates/investigative-action-memo.md` |
| **Legal/ethical guardrails** | `check_legal_scope` + guardrail hook | `references/legal-ethical-guardrails.md` | (every template's disclaimer block) |

### 3.3 Expected Input

Typical user requests this skill handles (examples):

- "Prioritize these leads for the burglary series — here are 6 leads with
  reliability and recency."
- "Given these 5 offense sites, where should I focus the search for the
  suspect's anchor?"
- "Map the suspect's routine activity nodes and tell me which have the weakest
  guardianship."
- "Build a link map of these 7 known associates and flag cut-vertices."
- "Draft a cognitive-interview question set for the witness to the S2 offense."
- "Check whether using this OSINT social post to find associates is within
  lawful scope."
- "Validate the chain of custody for these three evidence items."

Structured payloads (`payload.leads`, `payload.sites`, `payload.associates`,
`payload.routine`, `payload.interview_context`, `payload.legal_request`,
`payload.custody_items`) enable deterministic tool invocation; free-text
requests are routed via trigger matching plus payload-driven overrides.

### 3.4 Expected Output Format

Each capability produces a structured, auditable deliverable aligned with its
methodology (see `SKILL_REGISTRY.md` for full I/O JSON schemas):

- **Lead matrix** — ranked `LeadScoreResult[]` with component scores, priority
  bands, and per-lead rationale.
- **Geographic profile** — ranked candidate anchor cells + weighted anchor
  estimate + envelope + parameters.
- **Routine activity analysis** — ranked convergence/risk zones + interpretation.
- **Link analysis** — ranked node centralities, cut-vertices, edge/node counts,
  and interpretation.
- **Interview plan** — phased cognitive-interview questions + reliability
  considerations + post-interview actions.
- **Legal scope verdict** — compliant/violations/warnings/required-action +
  disclaimer.
- **Chain-of-custody result** — valid/errors/warnings/itemsVerified/summary.

Every substantive `AgentResponse` carries: `router_trace`,
`selected_agents`, `sub_agent_results`, `synthesis`, `disclaimer`,
`legal_scope_note`, `confidence`, and `warnings`.

## 4. Out of Scope / Guardrails

- Always include the standing disclaimer for this domain (see `CLAUDE.md`).
- Never present output as a certified/professional determination (not a legal
  opinion, not a judgment about a named individual, not a guaranteed forecast).
- Where the skill involves a named third party, do not produce a definitive
  judgment about that individual — stay at the level of general,
  population-based information and structured reasoning support.
- Flag explicitly when a licensed professional (lawyer, sworn investigator,
  forensic analyst) should be consulted.
- Refuse private surveillance, stalking, vigilante action, unauthorized
  location tracking, stolen data, and credentials-shared social-media access
  (enforced by `check_legal_scope` and the guardrail hook).

## 5. Knowledge Base Dependency

This skill's reasoning quality depends on the research foundations catalogued in
`SECOND-BRAIN-KNOWLEDGE-PAPER.md`. The operational principles of each source
are extracted into the eight concrete reference files in `references/` (rather
than left as a flat reading list) and bound to runnable tools in `config/tools.ts`.

## 6. Architecture

The skill uses a chain-of-thought router + specialized sub-agents + modular
skill-registry pattern (see `assets/diagrams/system-architecture.md` and
`SKILL_REGISTRY.md`):

- **config/agents.ts** — `RouterAgent`, `SkillRegistry`, six `SubAgent`
  classes, `InvestigationOrchestrator`.
- **config/tools.ts** — `ToolRegistry` + 7 tools with real functional handlers
  and pure computational cores (no stubs).
- **config/hooks.ts** — `EventBus`, `LifecycleManager`, `StateMachine`,
  guardrail hook.
- **config/index.ts** — type-safe, schema-validated configuration with
  environment overrides and structured logging.

## 7. Success Criteria

- Output correctly applies the named methodologies rather than generic reasoning. ✅
- Output is well-structured and consistent across repeated runs on similar inputs (deterministic). ✅
- Domain-appropriate guardrails/disclaimers are respected in every response. ✅
- Test prompts (`examples/`, Phase 10) produce outputs a subject-matter-competent reviewer would rate as sound. ✅
- `tsc --noEmit` compiles clean; all `/scripts` run end-to-end on the fictional case bundle. ✅
