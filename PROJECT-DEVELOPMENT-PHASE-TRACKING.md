# PROJECT-DEVELOPMENT-PHASE-TRACKING.md — Suspect Tracing & Fugitive Investigation Support

Phased build tracker for the suspect-tracing-investigator skill, maintained to
100% completion. Each phase lists its deliverables and verification status.

> **Status legend**: ✅ complete · 🟡 in progress · ⬜ pending

## Phase 0 — Scaffolding & Knowledge Base
**Goal:** Project scaffolding and curated research foundation.

- ✅ `README.md`, `CLAUDE.md`, `PROJECT-detail.md`, `DEVELOPMENT-TASK-BY-PHASES.md`
- ✅ `SECOND-BRAIN-KNOWLEDGE-PAPER.md` (20-source curated knowledge base)

**Verification:** all orientation files present and consistent.

## Phase 1 — Architecture & Foundation
**Goal:** Flexible agent & skill architecture (chain-of-thought router + specialized sub-agents + modular skill-registry) with hooks, tools, and type-safe config.

- ✅ `config/schema.json` — JSON-schema for configuration validation
- ✅ `config/settings.example.json` — production configuration template
- ✅ `config/index.ts` — type-safe config loader, env overrides, structured logging, validation
- ✅ `config/hooks.ts` — EventBus, LifecycleManager, StateMachine, guardrail hook + factories
- ✅ `config/tools.ts` — ToolRegistry + 7 tools with **real functional handlers** and pure computational cores
- ✅ `config/agents.ts` — RouterAgent, SkillRegistry, 6 sub-agents, InvestigationOrchestrator
- ✅ `assets/diagrams/system-architecture.md` — Mermaid architecture diagram

**Verification:** `tsc --noEmit -p tsconfig.json` exits 0 (clean compile).

## Phase 2 — Geographic & Behavioral Analysis
**Goal:** Pattern-based narrowing.

- ✅ `references/geographic-profiling.md` — Rossmo CGT operationalized
- ✅ `references/routine-activity-theory.md` — Cohen & Felson RAT operationalized
- ✅ `geographic_profile` tool (Rossmo CGT surface + estimated anchor)
- ✅ `routine_activity_analysis` tool (RAT convergence zones)
- ✅ `assets/templates/geographic-profile.md`, `assets/templates/behavioral-pattern-profile.md`
- ✅ `scripts/geo-profiler.ts` — reproducible CLI (profile + routine modes)

**Verification:** `geo-profiler.ts examples/sample-offenses.json` and `--routine` modes produce ranked, sensible output.

## Phase 3 — Lead Organization Engine
**Goal:** Lead-organization matrix.

- ✅ `references/lead-prioritization-mcda.md` — weighted-MCDA model operationalized
- ✅ `score_leads` tool (weighted MCDA, 5 criteria, priority bands P1..P4)
- ✅ `assets/templates/lead-prioritization-matrix.md`
- ✅ `scripts/lead-scorer.ts` — reproducible CLI (markdown + JSON, custom weights)

**Verification:** `lead-scorer.ts examples/sample-leads.json` ranks L4 (P1-High) above L6 (P4-Background), matching domain expectations.

## Phase 4 — Network Analysis
**Goal:** Associate/link mapping.

- ✅ `references/link-network-analysis.md` — Sparrow + Brandes + Tarjan operationalized
- ✅ `link_analysis` tool (degree, weighted degree, Brandes betweenness, Tarjan cut-vertices, composite influence)
- ✅ `assets/templates/associate-link-map.md`
- ✅ `scripts/network-analyzer.ts` — reproducible CLI

**Verification:** `network-analyzer.ts examples/sample-associates.json` identifies cut-vertices A2/A3/A4 and ranks A2 as top-influence node.

## Phase 5 — Interview Support
**Goal:** Informant/witness interviewing.

- ✅ `references/cognitive-interview.md` — Fisher & Geiselman CI operationalized
- ✅ `generate_interview_questions` tool (phased CI question set, 4 components, reliability notes, post-interview actions)
- ✅ `assets/templates/interview-question-set.md`

**Verification:** tool produces a phased plan covering all four CI components and is capped by `validation.max_interview_questions`.

## Phase 6 — Digital Footprint & Evidentiary Integrity
**Goal:** Lawful digital sourcing + chain of custody.

- ✅ `references/digital-footprint-lawful-sourcing.md` — allowed/disallowed sources operationalized
- ✅ `references/chain-of-custody.md` — continuity rules operationalized
- ✅ `check_legal_scope` tool (guardrail compliance verdict)
- ✅ `validate_chain_of_custody` tool (continuity validator)
- ✅ `assets/templates/investigative-action-memo.md`

**Verification:** `check_legal_scope` flags disallowed sources and missing warrant; `validate_chain_of_custody` detects continuity breaks. Smoke-tested via the orchestrator.

## Phase 7 — Legal & Ethical Guardrails
**Goal:** Standing guardrail layer.

- ✅ `references/legal-ethical-guardrails.md` — jurisdiction-agnostic guardrails
- ✅ `createGuardrailHook` (config/hooks.ts) — pre/post execution guardrail enforcement
- ✅ Orchestrator always appends `legal_guardrail` pass (cascade strategy) and lowers confidence to `Low` on non-compliance
- ✅ Mandatory disclaimer + legal-scope note on every `AgentResponse`

**Verification:** orchestrator blocked-path smoke test surfaces non-compliance and sets `confidence: Low`.

## Phase 8 — Skill Definition & Registry
**Goal:** Runnable Claude Skill packaging.

- ✅ `SKILL.md` — full skill definition (name, description, body, decision tree, output structures, quality checks)
- ✅ `SKILL_REGISTRY.md` — registration, resolution, execution, and input/output JSON schemas

**Verification:** SKILL.md description covers all trigger surfaces; SKILL_REGISTRY.md documents every tool's I/O schema.

## Phase 9 — Examples & Reproducibility
**Goal:** Offline validation and auditability.

- ✅ `examples/sample-leads.json`, `sample-offenses.json`, `sample-associates.json`, `sample-routine.json`, `sample-custody.json`, `sample-case.json`, `custom-weights.json`
- ✅ `scripts/validate.ts` — multi-schema validator with smoke-tests
- ✅ `scripts/README.md` — usage and data-schema documentation
- ✅ `package.json` + `tsconfig.json` — buildable, type-checked project

**Verification:** `validate.ts` passes on all example files; all four scorer scripts run end-to-end.

## Phase 10 — Testing & Documentation
**Goal:** Validate against fictional scenarios; final docs.

- ✅ Fictional case bundle (`examples/sample-case.json`, CASE-2026-0417) exercises all sub-agents
- ✅ Legal/ethical disclaimers present in SKILL.md, every template, and every AgentResponse
- ✅ `README.md` updated to reflect the completed, production-ready state
- ✅ `memory/DEVELOPMENT-TRACKING.md` records the session
- ✅ No TODO / placeholder / stub code (grep-verified)

**Verification:** `tsc --noEmit` clean; `validate.ts` exit 0 on all examples; orchestrator smoke test green.

## Final Step — Packaging

- ✅ SKILL.md written from the PROJECT-detail.md specification
- ✅ `references/`, `scripts/`, `assets/`, `config/` built
- ✅ Skill-creator evaluation loop applied (draft → test → evaluate → iterate → package)
- ✅ Packaged for distribution (buildable TS project + docs)


## Phase 11 — Research Brain, Test Suite & End-to-End Pipeline ✅
**Goal:** Accuracy/persuasion backbone + automated verification + full-pipeline CLI.

- ✅ `RESEARCH-PAPER-KNOWLEDGE-BRAIN.md` — 31-source research brain, each source explicitly applied to a concrete project component, with a consolidated source→component mapping table.
- ✅ Citation indices cross-referenced into all 8 `references/*.md` files.
- ✅ `SKILL.md` Further Reading updated to cite the research brain + Reproducibility & Testing section.
- ✅ `tests/cores.test.ts` + `tests/orchestrator.test.ts` — 21 node:test cases (MCDA, Haversine, Rossmo, RAT, Brandes, Tarjan, CI generator, chain-of-custody, legal scope, router, guardrail path) — all green.
- ✅ `tests/run.ts` — single test runner (`npm test`).
- ✅ `scripts/investigate.ts` — full-pipeline CLI emitting a complete report (markdown + `--json`); exit 2 on guardrail non-compliance for CI.
- ✅ `package.json` scripts: `typecheck`, `test`, `investigate`.

**Verification:**
- `tsc --noEmit` clean.
- `npm test` → 21/21 pass (exit 0).
- `npx ts-node scripts/investigate.ts examples/sample-case.json` → 4 agents succeed, confidence High, 0 warnings.
- Guardrail path: non-compliant `legal_request` → confidence Low + halt warning (tested).

## Phase 12 — Production-Grade Upgrades ✅
**Goal:** CI, containerization, snapshot tests, road-network profiling, schema-strict validation, PEACE variant, OpenAPI export, encoding repair.

- ✅ **CI workflow** `.github/workflows/ci.yml` — type-check, tests, example validation, CLI smoke, full pipeline (compliant + guardrail exit-2), schema export.
- ✅ **Dockerfile + .devcontainer/devcontainer.json + .dockerignore** — reproducible runtime; entrypoint = full-pipeline CLI.
- ✅ **Snapshot golden tests** `tests/snapshot.test.ts` — 4 golden-file comparisons for lead-scorer, geo-profiler, network-analyzer, investigate (normalized). 33 total tests pass.
- ✅ **Road-network distance mode** `config/distance.ts` — `HaversineProvider` (default, offline) + `OsrmProvider` (OSRM `/table`, graceful fallback); `geographicProfile` async with `distance_mode` config flag + env override. 6 distance tests.
- ✅ **Schema-strict validation** `config/validation.ts` (ajv + ajv-formats) — runtime validation of every tool input and the configuration; `scripts/validate.ts` JSON-Schema-validates case bundles against `assets/schemas/case-bundle.schema.json`.
- ✅ **PEACE interview variant** — `interview.default_model` config + `InterviewContext.model: 'peace'`; `generatePeaceInterviewQuestions`; `references/peace-interview.md`; `assets/templates/interview-question-set-peace.md`. 2 tests.
- ✅ **OpenAPI / JSON-Schema export** `scripts/export-schemas.ts` → `assets/schemas/openapi.json`, per-tool `tools/<name>.{input,output}.json`, `config.schema.json`, `case-bundle.schema.json`.
- ✅ **Encoding repair** — all `.md` box-drawing / em-dash / checkmark / emoji mojibake reversed; zero remaining mojibake runs.

**Verification:** `tsc --noEmit` clean; `npm test` → 33/33 pass; all 5 example validations exit 0; investigate compliant (exit 0) and non-compliant (exit 2); export-schemas regenerates assets.
## Overall Status

**Completion: 100% · Production-ready · Open-source standard.**

| Phase | Goal | Status |
|-------|------|--------|
| 0 | Scaffolding & knowledge base | ✅ |
| 1 | Architecture & foundation | ✅ |
| 2 | Geographic & behavioral analysis | ✅ |
| 3 | Lead organization engine | ✅ |
| 4 | Network analysis | ✅ |
| 5 | Interview support | ✅ |
| 6 | Digital footprint & evidentiary integrity | ✅ |
| 7 | Legal & ethical guardrails | ✅ |
| 8 | Skill definition & registry | ✅ |
| 9 | Examples & reproducibility | ✅ |
| 10 | Testing & documentation | ✅ |

## Verification Commands

```bash
yarn install            # or npm install
npx tsc --noEmit -p tsconfig.json
npx ts-node scripts/validate.ts examples/sample-case.json
npx ts-node scripts/lead-scorer.ts examples/sample-leads.json
npx ts-node scripts/geo-profiler.ts examples/sample-offenses.json
npx ts-node scripts/geo-profiler.ts examples/sample-offenses.json --routine examples/sample-routine.json
npx ts-node scripts/network-analyzer.ts examples/sample-associates.json
```
