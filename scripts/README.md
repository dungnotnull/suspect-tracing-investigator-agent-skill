# Scripts Directory

Production-grade automation utilities for the **Suspect Tracing & Fugitive
Investigation Support** skill. Each script reuses the pure computational cores
in `config/tools.ts` and the validated configuration in `config/index.ts` â€” no
duplicate or stubbed logic.

## Prerequisites

The scripts are TypeScript and import from `../config`. Run them with `ts-node`
(or compile with `tsc` first and run the emitted JS with `node`):

```bash
# one-time (optional, for type checking / build)
npm install -D typescript ts-node @types/node
npx tsc              # uses tsconfig.json in the project root
# or run directly without a build step:
npx ts-node scripts/validate.ts examples/sample-case.json
```

All scripts exit `0` on success and `1` on error, print to stdout (markdown by
default, JSON with `--json`), and never perform destructive filesystem or
network operations.

## Scripts

### validate.ts

Validates investigation data files against structural and business-rule checks,
with automatic schema detection (leads / offenses / associates / custody /
case-bundle). Also runs a smoke-test of the relevant computational core.

```bash
npx ts-node scripts/validate.ts examples/sample-case.json
npx ts-node scripts/validate.ts examples/sample-leads.json
npx ts-node scripts/validate.ts examples/sample-offenses.json
npx ts-node scripts/validate.ts examples/sample-associates.json
npx ts-node scripts/validate.ts examples/sample-custody.json --quiet
```

**Checks:**
- Required fields, id uniqueness, enum and range validation.
- ISO-8601 timestamp format.
- Cross-reference integrity (e.g., associate link targets must exist).
- Count limits from `config` (`max_leads`, `max_offense_sites`, `max_associates`).
- Smoke-tests `scoreLeads`, `geographicProfile`, `linkAnalysis`,
  `validateChainOfCustody` and warns on suspicious outputs.

### lead-scorer.ts

Weighted-MCDA lead prioritization. Reads a JSON array of `LeadInput` and prints
a ranked lead-prioritization matrix.

```bash
npx ts-node scripts/lead-scorer.ts examples/sample-leads.json
npx ts-node scripts/lead-scorer.ts examples/sample-leads.json --json
npx ts-node scripts/lead-scorer.ts examples/sample-leads.json --weights examples/custom-weights.json
```

### geo-profiler.ts

Conceptual Rossmo CGT geographic profiling surface from offense sites. With
`--routine`, runs Routine Activity Theory convergence analysis instead.

```bash
npx ts-node scripts/geo-profiler.ts examples/sample-offenses.json
npx ts-node scripts/geo-profiler.ts examples/sample-offenses.json --json
npx ts-node scripts/geo-profiler.ts examples/sample-offenses.json --routine examples/sample-routine.json
```

### network-analyzer.ts

Associate link analysis: degree, weighted degree, Brandes betweenness,
Tarjan cut-vertices, and composite influence ranking.

```bash
npx ts-node scripts/network-analyzer.ts examples/sample-associates.json
npx ts-node scripts/network-analyzer.ts examples/sample-associates.json --json
```

## Data Schemas

### LeadInput
```typescript
interface LeadInput {
  id: string;
  description: string;
  source: string;                 // must be on config.guardrails.allowed_data_sources
  source_reliability: 'High' | 'Medium' | 'Low';
  proximity: number;              // 0..1
  temporal_recency: number;       // 0..1
  corroborating_items: number;    // non-negative integer
  actionability: number;          // 0..1
  captured_at?: string;           // ISO 8601
}
```

### OffenseSiteInput
```typescript
interface OffenseSiteInput {
  id: string;
  label?: string;
  lat: number;   // -90..90
  lon: number;   // -180..180
  timestamp?: string;
  weight?: number;
}
```

### AssociateInput
```typescript
interface AssociateInput {
  id: string;
  name?: string;
  links: string[];        // ids of other associates
  strength?: number;      // 0..1
  role?: string;          // family | financial | criminal-associate | coworker | social
}
```

### CustodyItem
```typescript
interface CustodyItem {
  id: string;
  description?: string;
  collector: string;
  acquired_at: string;    // ISO 8601
  storage_location?: string;
  chain: Array<{ from: string; to: string; timestamp: string; note?: string }>;
}
```

### Case Bundle
```typescript
interface CaseBundle {
  caseId: string;
  leads?: LeadInput[];
  sites?: OffenseSiteInput[];
  associates?: AssociateInput[];
  custody_items?: CustodyItem[];
}
```

## Error Handling

- Non-zero exit codes on errors.
- Descriptive messages; JSON parse and file-not-found handled separately.
- No destructive filesystem or network operations.
- All computations validate inputs before processing.

## Security

- Inputs validated before processing.
- No execution of arbitrary code from data files.
- File access restricted to the specified path argument.
- No hardcoded credentials or secrets.
- Disallowed data sources (per `config`) are flagged during validation.

## Reproducibility

All scoring is deterministic given the same input and config. Record the
config version (`config.version`) and the input file hash alongside any
analytical output for auditability.

### investigate.ts

Full end-to-end pipeline: runs the router + all selected sub-agents + guardrails
on a case bundle and emits a complete investigative support report (markdown by
default, JSON with `--json`). Exits `2` when the guardrail layer flags
non-compliance (for CI), `1` on file/parse error, `0` otherwise.

```bash
npx ts-node scripts/investigate.ts examples/sample-case.json
npx ts-node scripts/investigate.ts examples/sample-case.json --json
npx ts-node scripts/investigate.ts examples/sample-case.json --no-trace
```

### export-schemas.ts

Regenerates the OpenAPI document and per-tool JSON-Schema artifacts in
`assets/schemas/` (openapi.json, config.schema.json, case-bundle.schema.json,
and `tools/<name>.{input,output}.json` for every registered tool).

```bash
npx ts-node scripts/export-schemas.ts
```

### fix-mojibake.js

Maintenance utility that reverses CP1252->UTF-8 mojibake in `.md` and `.ts`
files (box-drawing, em-dash, checkmarks, emoji). Idempotent; safe to re-run
after editing files with editors that mis-handle UTF-8.

```bash
node scripts/fix-mojibake.js
```