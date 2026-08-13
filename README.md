# Suspect Tracing & Fugitive Investigation Support

> Professional investigative-lead generation grounded in forensic and behavioral-science research

**Category:** Forensic Investigation Support (Professional Tool)
**Status:** ✅ Production-ready · 100% complete · Open-source standard · v1.0.0

> **Disclaimer:** This skill provides general, educational/analytical information only. It is not a substitute for advice from a qualified professional (legal, law enforcement, forensic, or otherwise). Always verify with a qualified professional before making decisions based on its output. This skill does not provide certified determinations, legal opinions, or judgments about named individuals.

## Overview

A professional-support skill for law-enforcement and licensed investigators to
organize leads, analyze movement and behavioral patterns, and prioritize
investigative avenues when tracing a suspect or fugitive, grounded in
established forensic and geographic-profiling research. Explicitly restricted
to lawful professional investigative use — not private surveillance.

## Architecture

Chain-of-thought router + specialized sub-agents + modular skill-registry
pattern (see `assets/diagrams/system-architecture.md`):

- **RouterAgent** classifies the request, emits an auditable chain-of-thought
  trace, and dispatches sub-agents.
- **Six sub-agents** each own one methodology domain and invoke tools from a
  shared `ToolRegistry`.
- **InvestigationOrchestrator** synthesizes results, enforces guardrails, and
  emits a structured `AgentResponse` (or a blocked response on guardrail
  violation).

## Core Capabilities

- Organize known suspect data into a structured **lead-prioritization matrix** (weighted MCDA, P1–P4 bands)
- Apply **geographic profiling** (Rossmo CGT, conceptual) to narrow likely anchor areas
- Analyze behavioral/routine patterns using **Routine Activity Theory** (Cohen & Felson)
- Map known associates via **link/network analysis** (Brandes betweenness, Tarjan cut-vertices)
- Draft structured **cognitive-interview** question sets (Fisher & Geiselman)
- Support **digital-footprint** lead organization (publicly available, lawfully obtained only)
- Validate **chain-of-custody** continuity
- Flag **legal and ethical boundaries** (jurisdiction, warrant requirements, no-definitive-judgment)

## Key Methodologies & Frameworks

| Methodology | Reference |
|-------------|-----------|
| Weighted MCDA lead prioritization | `references/lead-prioritization-mcda.md` |
| Geographic profiling (Rossmo CGT) | `references/geographic-profiling.md` |
| Routine Activity Theory (Cohen & Felson) | `references/routine-activity-theory.md` |
| Link/network analysis (Sparrow, Brandes, Tarjan) | `references/link-network-analysis.md` |
| Cognitive Interview (Fisher & Geiselman) | `references/cognitive-interview.md` |
| Chain of custody & evidentiary integrity | `references/chain-of-custody.md` |
| Digital-footprint lawful sourcing | `references/digital-footprint-lawful-sourcing.md` |
| Legal & ethical guardrails | `references/legal-ethical-guardrails.md` |

## Project Structure

```
suspect-tracing-investigator/
├── SKILL.md                    # Skill definition (name + description + body)
├── SKILL_REGISTRY.md           # Registration, resolution, execution, I/O schemas
├── CLAUDE.md                   # Operating instructions for Claude
├── PROJECT-detail.md           # Functional & technical specification
├── SECOND-BRAIN-KNOWLEDGE-PAPER.md  # 20-source curated knowledge base
├── DEVELOPMENT-TASK-BY-PHASES.md    # Phased build plan (all complete)
├── PROJECT-DEVELOPMENT-PHASE-TRACKING.md  # Verified phase tracker
├── README.md
├── package.json · tsconfig.json # Buildable, type-checked project
├── config/                     # Type-safe config, hooks, tools, agents
│   ├── index.ts · hooks.ts · tools.ts · agents.ts
│   └── schema.json · settings.example.json
├── references/                 # 8 operationalized methodology files
├── assets/
│   ├── templates/              # 7 output templates
│   └── diagrams/system-architecture.md
├── scripts/                    # validate, lead-scorer, geo-profiler, network-analyzer + README
├── examples/                   # Fictional case data (CASE-2026-0417)
└── memory/DEVELOPMENT-TRACKING.md
```

## Quickstart

`

## Production-Grade Features

- **Automated test suite** (`tests/`, `node:test` + `ts-node`) — 33 cases covering every computational core, the validator, the orchestrator guardrail path, the distance providers, the PEACE interview variant, and CLI snapshot (golden-file) tests. Run `npm test`.
- **CI workflow** (`.github/workflows/ci.yml`) — type-check, tests, example validation, CLI smoke, full pipeline (compliant + guardrail exit-code-2), and schema export on every push/PR.
- **Docker** (`Dockerfile`, `.devcontainer/devcontainer.json`, `.dockerignore`) — reproducible runtime; `docker run --rm -v "$PWD/my-case.json:/case.json" image /case.json`.
- **Schema-strict validation** (`ajv` + `config/validation.ts`) — every tool input and the configuration are validated against JSON Schema at runtime; `scripts/validate.ts` also JSON-Schema-validates case bundles against `assets/schemas/case-bundle.schema.json`.
- **Road-network distance mode** (`config/distance.ts`) — geographic profiling supports `distance_mode: 'osrm'` (OSRM `/table` service) with automatic Haversine fallback; default `'haversine'` works fully offline.
- **PEACE interview variant** — `interview.default_model: 'peace'` or `InterviewContext.model: 'peace'` produces a PEACE-model (Milne & Bull) question set alongside the Cognitive Interview; see `references/peace-interview.md` and `assets/templates/interview-question-set-peace.md`.
- **OpenAPI + JSON-Schema export** (`scripts/export-schemas.ts`) — generates `assets/schemas/openapi.json`, per-tool input/output schemas, `config.schema.json`, and `case-bundle.schema.json` for third-party integration.
- **Full-pipeline CLI** (`scripts/investigate.ts`) — runs the router + all sub-agents + guardrails on a case bundle and emits a complete report (markdown or `--json`); exits `2` on guardrail non-compliance for CI.

## Reproducibility Commands

```bash
yarn install
yarn typecheck                # tsc --noEmit (strict)
yarn test                     # 33 node:test cases (cores, validator, orchestrator, distance, PEACE, snapshots)
yarn export-schemas           # regenerate assets/schemas/*
yarn investigate examples/sample-case.json --json   # full pipeline
docker build -t sti . && docker run --rm sti examples/sample-case.json
`````bash
yarn install            # or: npm install
npx tsc --noEmit -p tsconfig.json   # type-check (clean)

# Validate example data
npx ts-node scripts/validate.ts examples/sample-case.json

# Run the analyzers
npx ts-node scripts/lead-scorer.ts examples/sample-leads.json
npx ts-node scripts/geo-profiler.ts examples/sample-offenses.json
npx ts-node scripts/geo-profiler.ts examples/sample-offenses.json --routine examples/sample-routine.json
npx ts-node scripts/network-analyzer.ts examples/sample-associates.json

# Full end-to-end pipeline on a case bundle
npx ts-node scripts/investigate.ts examples/sample-case.json

# Test suite (node:test + ts-node)
npx ts-node tests/run.ts
```

All scripts exit `0` on success and `1` on error; markdown by default, JSON
with `--json`. See `scripts/README.md` for full data schemas.

## Status

✅ Built as a runnable Claude Skill. All phases complete — see
`PROJECT-DEVELOPMENT-PHASE-TRACKING.md`. No placeholder/stub code; `tsc` clean;
scripts run end-to-end on the fictional case bundle.
