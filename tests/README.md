# Tests

Automated test suite for the suspect-tracing-investigator skill, using Node's
built-in `node:test` runner executed under `ts-node` (CommonJS) — no separate
test-framework dependency required.

## Running

```bash
npx ts-node tests/run.ts        # or: npm test
```

Exit code `0` = all tests pass; non-zero on any failure.

## What is covered

### `cores.test.ts` (pure computational cores)
- `scoreLeads` ranking, P1–P4 banding, [0,1] normalization, empty-input grace.
- `haversineKm` known-distance sanity (zero, LA→NY ~3940 km).
- `rossmoScore` peaks near the cluster, not at a far point.
- `geographicProfile` estimated-anchor containment + empty-input handling.
- `routineActivityAnalysis` low-guardianship ranking.
- `linkAnalysis` cut-vertex detection + leaf zero-betweenness.
- `generateInterviewQuestions` covers all four CI components + cap + known-facts.
- `checkLegalScope` disallowed-source/missing-warrant + lawful-OSINT paths.
- `validateChainOfCustody` continuity-break + clean-chain + missing-collector.

### `orchestrator.test.ts` (router + agents + guardrails)
- `bootstrapSkillRegistry` registers all six sub-agents (idempotent).
- `SkillRegistry.resolveByText` trigger matching.
- `InvestigationOrchestrator` compliant request → disclaimer attached.
- Legal non-compliance → confidence lowered to `Low` + halt warning.
- Router chain-of-thought trace emitted.

## Design notes

- `node --test` cannot load `.ts` directly (ESM loader); running tests via
  `ts-node tests/run.ts` (CommonJS) sidesteps this with zero extra dependencies.
- `bootstrapSkillRegistry()` is idempotent so it is safe to call across tests.
