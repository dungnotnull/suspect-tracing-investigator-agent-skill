# System Architecture — Suspect Tracing & Fugitive Investigation Support

```mermaid
flowchart TD
  U[User Request<br/>text + optional payload] --> Router[RouterAgent<br/>chain-of-thought trace]
  Router -->|route| Reg[(SkillRegistry<br/>trigger resolution)]
  Reg --> Sub1[Lead Orchestrator<br/>score_leads]
  Reg --> Sub2[Geo Profiler<br/>geographic_profile<br/>routine_activity_analysis]
  Reg --> Sub3[Behavioral Analyst<br/>routine_activity_analysis]
  Reg --> Sub4[Network Analyst<br/>link_analysis]
  Reg --> Sub5[Interview Planner<br/>generate_interview_questions]
  Reg --> Sub6[Legal Guardrail<br/>check_legal_scope<br/>validate_chain_of_custody]

  Sub1 --> Tools[(ToolRegistry)]
  Sub2 --> Tools
  Sub3 --> Tools
  Sub4 --> Tools
  Sub5 --> Tools
  Sub6 --> Tools

  Tools --> Core[Pure Computational Cores<br/>MCDA / Rossmo / Brandes / Tarjan / CI / Guardrails]
  Core --> Results[SubAgentResult[]]

  Results --> Orch[InvestigationOrchestrator]
  Orch --> Guard[Guardrail Hook<br/>disclaimer + lawful-scope]
  Guard -->|violation| Blocked[Blocked Response<br/>structured refusal]
  Guard -->|ok| Synth[Synthesis + Confidence]
  Synth --> Resp[AgentResponse<br/>disclaimer + legal-scope note]
  Blocked --> Resp

  CFG[config/<br/>index.ts · hooks.ts · tools.ts · agents.ts<br/>schema.json · settings.json] -.-> Router
  CFG -.-> Tools
  CFG -.-> Guard
  REF[references/<br/>8 methodology files] -.-> Core
  ASSETS[assets/templates<br/>7 output templates] -.-> Resp
  SCRIPTS[scripts/<br/>validate · lead-scorer · geo-profiler · network-analyzer] -.-> Core
```

## Layers

1. **Config layer** (`config/`): type-safe configuration, schema validation,
   environment overrides, structured logging, EventBus, LifecycleManager,
   StateMachine, guardrail hook.
2. **Tool layer** (`config/tools.ts`): `ToolRegistry` + 7 tools with real
   functional handlers and pure computational cores (MCDA, Haversine + Rossmo
   CGT, Brandes betweenness, Tarjan cut-vertices, CI question builder,
   guardrail checker, chain-of-custody validator).
3. **Agent layer** (`config/agents.ts`): `RouterAgent` (chain-of-thought),
   `SkillRegistry`, six specialized `SubAgent`s, and the
   `InvestigationOrchestrator` that dispatches, synthesizes, and enforces
   guardrails with a graceful blocked-response path.
4. **Reference layer** (`references/`): 8 methodology files operationalizing
   the knowledge base into procedures, schemas, pitfalls, and checklists.
5. **Asset layer** (`assets/`): 7 output templates + this architecture diagram.
6. **Script layer** (`scripts/`): reproducible CLI tools that reuse the pure
   computational cores for offline validation and scoring.

## Data Flow

A request enters the `RouterAgent`, which emits an auditable chain-of-thought
trace and resolves sub-agents via the `SkillRegistry` (keyword triggers +
payload-driven overrides). Selected sub-agents invoke tools from the
`ToolRegistry`; each tool runs a pure computational core and returns a typed
result. The `InvestigationOrchestrator` synthesizes results, applies the
guardrail hook, and either emits a structured `AgentResponse` (with
disclaimer + legal-scope note) or a structured refusal when a guardrail
violation is detected.

## Graceful Degradation

- If an LLM call fails, the deterministic tool layer still produces a usable
  structured analysis; the orchestrator records reduced confidence and a
  documented degradation note.
- If a sub-agent throws, the orchestrator catches, logs, and returns a
  per-agent failure entry rather than aborting the whole response.
- If a guardrail violation is detected, the orchestrator returns a blocked
  response instead of emitting an out-of-scope answer.
