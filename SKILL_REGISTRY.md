# SKILL_REGISTRY.md — Skill Registration, Resolution, Execution & Validation

This document specifies how the suspect-tracing-investigator skill's
sub-agents are **registered**, **resolved**, **executed**, and **validated**,
including their input/output JSON schemas. It is the contract reference for the
modular skill-registry pattern implemented in `config/agents.ts`.

## 1. Architecture Summary

A **chain-of-thought router + specialized sub-agents + modular skill-registry**
pattern:

```
AgentRequest ──► RouterAgent.route()
                   │  1. emit chain-of-thought trace
                   │  2. resolve sub-agents via SkillRegistry.resolveByText
                   │  3. apply payload-driven overrides
                   │  4. enforce max_sub_agents_per_request budget
                   │  5. append Legal Guardrail pass (cascade strategy)
                   ▼
             InvestigationOrchestrator.handle()
                   │  dispatch selected sub-agents
                   │  each sub-agent invokes a tool via ToolRegistry
                   │  synthesize results
                   │  apply guardrail hook (createGuardrailHook)
                   ▼
             AgentResponse (or blockedResponse on guardrail violation)
```

## 2. Skill Registration

`bootstrapSkillRegistry()` (in `config/agents.ts`) registers each sub-agent
via `SkillRegistry.register(entry)` where:

```typescript
interface SkillRegistryEntry {
  role: AgentRole;          // 'lead_orchestrator' | 'geo_profiler' | ...
  description: string;      // human-readable purpose
  triggers: string[];       // lowercase keyword triggers for text resolution
  factory: () => SubAgent;  // constructs a fresh sub-agent instance
}
```

Registered skills (default):

| Role | Triggers (subset) | Tool(s) |
|------|-------------------|---------|
| `lead_orchestrator` | lead, priorit, tip, organize, matrix, triage | `score_leads` |
| `geo_profiler` | geographic, rossmo, where, search area, anchor, hotspot | `geographic_profile`, `routine_activity_analysis` |
| `behavioral_analyst` | routine, behavior, movement, pattern, convergence, guardian | `routine_activity_analysis` |
| `network_analyst` | associate, network, link, connection, contact, relationship | `link_analysis` |
| `interview_planner` | interview, question, witness, informant, cognitive | `generate_interview_questions` |
| `legal_guardrail` | legal, warrant, custody, ethical, jurisdiction, compliance | `check_legal_scope`, `validate_chain_of_custody` |

## 3. Skill Resolution

`SkillRegistry.resolveByText(text)` returns the roles whose `triggers` match
any substring of the lowercased request text. The router then:

1. Adds payload-driven overrides — if `payload.leads` is present, ensure
   `lead_orchestrator` is selected; `payload.sites` ⇒ `geo_profiler`;
   `payload.associates` ⇒ `network_analyst`; `payload.interview_context` ⇒
   `interview_planner`; `payload.legal_request` or `payload.custody_items` ⇒
   `legal_guardrail`.
2. Falls back to `lead_orchestrator` as the default intake skill when nothing
   matched.
3. Truncates to `router.max_sub_agents_per_request` (default 4).
4. Appends `legal_guardrail` (cascade strategy) when budget allows, so
   lawful-scope is enforced on every substantive response.

## 4. Skill Execution Contract

Each sub-agent implements:

```typescript
abstract class SubAgent {
  constructor(role: AgentRole, tools: string[]);
  run(req: AgentRequest, ctx: HookContext): Promise<SubAgentResult>;
}
```

with:

```typescript
interface AgentRequest {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  legalClearanceAttested?: boolean;
}

interface SubAgentResult {
  agent: AgentRole;
  toolUsed: string;
  success: boolean;
  data: unknown;
  errors?: string[];
  notes?: string[];
}

interface AgentResponse {
  request_id: string;
  session_id: string;
  router_trace: ChainOfThoughtStep[];
  selected_agents: AgentRole[];
  sub_agent_results: SubAgentResult[];
  synthesis: string;
  disclaimer: string;
  legal_scope_note: string;
  confidence: 'Low' | 'Medium' | 'High';
  warnings: string[];
}
```

## 5. Tool Input/Output JSON Schemas

All tools are registered in `ToolRegistry` (`config/tools.ts`) and exposed via
JSON-schema `inputSchema` / `outputSchema`. The pure computational cores are
exported for reuse by `/scripts`.

### 5.1 `score_leads` — Weighted MCDA lead prioritization

**Input**
```json
{
  "leads": [
    {
      "id": "L1",
      "description": "Witness: subject seen near 4th & Main on night of S2.",
      "source": "lawfully-obtained-witness-statements",
      "source_reliability": "Medium",
      "proximity": 0.85,
      "temporal_recency": 0.90,
      "corroborating_items": 2,
      "actionability": 0.80,
      "captured_at": "2026-04-18T09:15:00"
    }
  ],
  "weights": { "proximity": 0.2, "temporal_recency": 0.2, "source_reliability": 0.25, "corroborative_strength": 0.2, "actionability": 0.15 }
}
```
`weights` is optional and normalized at runtime.

**Output**
```json
{
  "model": "weighted-mcda-v1",
  "ranked_leads": [
    {
      "lead_id": "L1", "description": "...", "source": "...", "source_reliability": "Medium",
      "component_scores": { "proximity": 0.85, "temporal_recency": 0.90, "source_reliability": 0.60, "corroborative_strength": 0.55, "actionability": 0.80 },
      "weighted_score": 0.72, "normalized_score": 1.0,
      "priority_band": "P1-High", "rank": 1,
      "rationale": "source reliability Medium (0.60); strong suspect-anchor proximity; immediately actionable."
    }
  ]
}
```

### 5.2 `geographic_profile` — Rossmo CGT surface

**Input**
```json
{
  "sites": [ { "id": "S1", "lat": 34.051, "lon": -118.245, "timestamp": "2026-03-05T01:20:00", "weight": 1.0 } ],
  "options": { "bufferZoneKm": 1.5, "decayConstantKm": 4.0, "gridCellKm": 0.5, "gridPaddingKm": 2.0 }
}
```
**Output**
```json
{
  "cells": [ { "lat": 34.0522, "lon": -118.2437, "rawScore": 1.4231, "normalizedScore": 1.0, "priorityBand": "P1-High" } ],
  "topCells": [ ... ],
  "estimatedAnchor": { "lat": 34.0523, "lon": -118.2430 },
  "envelope": { "minLat": 34.04, "maxLat": 34.06, "minLon": -118.25, "maxLon": -118.23 },
  "parameters": { "bufferZoneKm": 1.5, "decayConstantKm": 4.0, "gridCellKm": 0.5 }
}
```

### 5.3 `routine_activity_analysis` — Cohen & Felson RAT

**Input**
```json
{
  "sites": [ { "id": "S1", "lat": 34.051, "lon": -118.245 } ],
  "routine": {
    "anchor": { "lat": 34.0523, "lon": -118.243 },
    "nodes": [ { "id": "N1", "lat": 34.0495, "lon": -118.24, "label": "suspect gym", "guardianStrength": 0.15 } ]
  }
}
```
**Output**
```json
{
  "convergencePoints": [ { "nodeId": "N1", "label": "suspect gym", "distanceKm": 3.2, "guardianGap": 0.85, "riskScore": 0.72 } ],
  "topRiskZones": [ ... top 5 ... ],
  "interpretation": "Per Cohen & Felson (1979) ..."
}
```

### 5.4 `link_analysis` — Associate network centrality

**Input**
```json
{
  "associates": [
    { "id": "A1", "name": "Delta", "role": "subject", "links": ["A2", "A3"], "strength": 0.9 },
    { "id": "A2", "name": "Associate-2", "role": "financial", "links": ["A1", "A3"], "strength": 0.8 }
  ]
}
```
**Output**
```json
{
  "nodes": [ { "id": "A2", "name": "Associate-2", "role": "financial", "degree": 2, "weightedDegree": 1.7, "betweenness": 1.0, "isCutVertex": false, "influenceScore": 0.62 } ],
  "cutVertices": [], "edgeCount": 2, "nodeCount": 2,
  "interpretation": "No single cut-vertex; network is resilient ..."
}
```

### 5.5 `generate_interview_questions` — Cognitive interview plan

**Input**
```json
{
  "context": {
    "interviewee_role": "witness",
    "event_description": "the incident at the 4th & Main convenience store on 2026-03-05",
    "known_facts": ["the blue sedan", "the pry marks on the rear door"]
  }
}
```
**Output**
```json
{
  "interviewee_role": "witness",
  "event_description": "...",
  "methodology": "Cognitive Interview (Fisher & Geiselman, 1992)",
  "components_addressed": [ "Context reinstatement", "Recall everything", "Varied recall order", "Changed perspectives" ],
  "questions": [ { "phase": "Rapport", "question": "..." }, { "phase": "Focused Follow-Up", "question": "Focused follow-up 1: ... the blue sedan." } ],
  "reliability_considerations": [ "Avoid leading or suggestive questions; ..." ],
  "post_interview_actions": [ "Transcribe and store the recorded interview per chain-of-custody protocol.", ... ]
}
```

### 5.6 `check_legal_scope` — Guardrail compliance check

**Input**
```json
{
  "request": {
    "planned_action": "Use OSINT social post to identify associates of the subject.",
    "data_sources": ["open-source-intelligence-public"],
    "involves_positional_data": false,
    "has_warrant_or_lawful_basis": true,
    "target_is_named_individual": true
  }
}
```
**Output**
```json
{
  "compliant": true,
  "violations": [],
  "warnings": ["Target is a named individual — output must remain ..."],
  "required_action": "Proceed with documented lawful basis; address warnings before acting.",
  "disclaimer": "This compliance check is general analytical guidance, not legal advice. ..."
}
```

### 5.7 `validate_chain_of_custody` — Continuity validator

**Input**
```json
{
  "items": [
    {
      "id": "E1", "collector": "INV-1042", "acquired_at": "2026-03-19T03:30:00", "storage_location": "locker-B12",
      "chain": [
        { "from": "INV-1042", "to": "LAB-7", "timestamp": "2026-03-19T09:00:00" },
        { "from": "LAB-7", "to": "INV-1042", "timestamp": "2026-03-22T14:00:00" }
      ]
    }
  ]
}
```
**Output**
```json
{ "valid": true, "errors": [], "warnings": [], "itemsVerified": 1, "summary": "All 1 custody item(s) passed continuity verification." }
```

## 6. Validation & Guardrails

- **Input shape validation**: `ToolRegistry.validateInputShape` checks required
  fields before handler execution.
- **Computational validation**: each handler throws on invalid data (e.g., empty
  arrays, missing anchor); the registry wraps errors into `ToolResult.errors`.
- **Guardrail hook** (`createGuardrailHook`): runs before execution to reject
  disallowed data sources, and after execution to verify the disclaimer is
  present in output.
- **`check_legal_scope` tool**: programmatic lawful-scope compliance verdict.
- **`validate_chain_of_custody` tool**: programmatic continuity verification.
- **Blocked-response path**: when a guardrail violation is detected, the
  orchestrator returns a structured refusal instead of an out-of-scope answer.

## 7. Reproducibility & Auditability

- All scoring is deterministic given identical input and config.
- Every `AgentResponse` carries a `router_trace` (chain-of-thought),
  `selected_agents`, `confidence`, and `warnings`.
- `/scripts` provide offline reproduction of each tool's output.
- Record `config.version` and the input file hash alongside any analytical
  output for auditability.

## 8. Extending the Registry

To add a new sub-agent:

1. Implement a class extending `SubAgent` with a `run` method that invokes a
   registered tool.
2. Register the tool in `config/tools.ts` (`investigationTools`) with a real
   handler and JSON schemas.
3. Register the skill in `bootstrapSkillRegistry()` with `role`, `description`,
   `triggers`, and `factory`.
4. Add a reference file under `/references` and a template under
   `assets/templates` if the skill produces a structured deliverable.
5. Add example data under `/examples` and a CLI under `/scripts` if the
   computational core is reusable offline.
6. Update this registry document and `SKILL.md`.
