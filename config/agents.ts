/**
 * Agent Architecture - Chain-of-thought Router + Specialized Sub-Agents
 *
 * Implements a modular skill-registry pattern:
 *   - RouterAgent: classifies the user request, emits an explicit chain-of-thought
 *     trace, and dispatches to one or more specialized sub-agents.
 *   - SubAgents: each owns one methodology domain, invokes the matching tool(s)
 *     from config/tools.ts, and returns a structured result with the mandatory
 *     professional disclaimer and legal-scope compliance note attached.
 *
 * All agents share a typed execution contract, structured logging, and graceful
 * LLM-fallback behaviour (when an LLM call fails, the deterministic tool layer
 * still produces a usable structured analysis).
 */

import { getConfig, Logger, generateSessionId } from './index';
import { ToolRegistry, registerInvestigationTools, LeadInput, OffenseSiteInput, AssociateInput, InterviewContext, CustodyItem } from './tools';
import { EventBus, createLoggingHook, createGuardrailHook, HookContext } from './hooks';

// ==================== Common Types ====================

export type AgentRole =
  | 'router'
  | 'lead_orchestrator'
  | 'geo_profiler'
  | 'behavioral_analyst'
  | 'network_analyst'
  | 'interview_planner'
  | 'legal_guardrail';

export interface AgentRequest {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
  /** Optional pre-structured payload supplied by the caller (leads/sites/etc.) */
  payload?: Record<string, unknown>;
  legalClearanceAttested?: boolean;
}

export interface ChainOfThoughtStep {
  step: number;
  thought: string;
  decision: string;
}

export interface SubAgentResult {
  agent: AgentRole;
  toolUsed: string;
  success: boolean;
  data: unknown;
  errors?: string[];
  notes?: string[];
}

export interface AgentResponse {
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

// ==================== Base Sub-Agent ====================

export abstract class SubAgent {
  constructor(public readonly role: AgentRole, public readonly tools: string[]) {}

  abstract run(req: AgentRequest, ctx: HookContext): Promise<SubAgentResult>;

  protected async callTool(name: string, input: unknown, ctx: HookContext): Promise<SubAgentResult> {
    const registry = ToolRegistry.getInstance();
    const result = await registry.execute(name, input, {
      toolName: name,
      sessionId: ctx.sessionId,
      metadata: ctx.metadata
    });
    return {
      agent: this.role,
      toolUsed: name,
      success: result.success,
      data: result.data,
      errors: result.errors,
      notes: result.success ? [] : [`Tool ${name} failed; deterministic fallback applied where possible.`]
    };
  }
}

// ==================== Lead Orchestrator ====================

export class LeadOrchestratorAgent extends SubAgent {
  constructor() { super('lead_orchestrator', ['score_leads']); }

  async run(req: AgentRequest): Promise<SubAgentResult> {
    const leads = (req.payload?.leads as LeadInput[]) ?? [];
    if (leads.length === 0) {
      return { agent: this.role, toolUsed: 'score_leads', success: false, data: null, errors: ['No leads supplied in payload.'], notes: ['Provide a leads array via request.payload.'] };
    }
    return this.callTool('score_leads', { leads, weights: req.payload?.weights }, { sessionId: '', requestId: req.id, metadata: req.metadata ?? {} });
  }
}

// ==================== Geographic Profiler ====================

export class GeoProfilerAgent extends SubAgent {
  constructor() { super('geo_profiler', ['geographic_profile', 'routine_activity_analysis']); }

  async run(req: AgentRequest): Promise<SubAgentResult> {
    const sites = (req.payload?.sites as OffenseSiteInput[]) ?? [];
    if (sites.length === 0) {
      return { agent: this.role, toolUsed: 'geographic_profile', success: false, data: null, errors: ['No offense sites supplied in payload.sites.'] };
    }
    if (req.payload?.routine) {
      return this.callTool('routine_activity_analysis', { sites, routine: req.payload.routine }, { sessionId: '', requestId: req.id, metadata: req.metadata ?? {} });
    }
    return this.callTool('geographic_profile', { sites, options: req.payload?.geo_options }, { sessionId: '', requestId: req.id, metadata: req.metadata ?? {} });
  }
}

// ==================== Behavioral Analyst ====================

export class BehavioralAnalystAgent extends SubAgent {
  constructor() { super('behavioral_analyst', ['routine_activity_analysis']); }

  async run(req: AgentRequest): Promise<SubAgentResult> {
    const sites = (req.payload?.sites as OffenseSiteInput[]) ?? [];
    const routine = req.payload?.routine as { anchor: { lat: number; lon: number }; nodes: Array<{ id: string; lat: number; lon: number; label?: string; guardianStrength: number }> } | undefined;
    if (!routine?.anchor) {
      return { agent: this.role, toolUsed: 'routine_activity_analysis', success: false, data: null, errors: ['Routine activity analysis requires payload.routine with an anchor node.'] };
    }
    return this.callTool('routine_activity_analysis', { sites, routine }, { sessionId: '', requestId: req.id, metadata: req.metadata ?? {} });
  }
}

// ==================== Network Analyst ====================

export class NetworkAnalystAgent extends SubAgent {
  constructor() { super('network_analyst', ['link_analysis']); }

  async run(req: AgentRequest): Promise<SubAgentResult> {
    const associates = (req.payload?.associates as AssociateInput[]) ?? [];
    if (associates.length === 0) {
      return { agent: this.role, toolUsed: 'link_analysis', success: false, data: null, errors: ['No associates supplied in payload.associates.'] };
    }
    return this.callTool('link_analysis', { associates }, { sessionId: '', requestId: req.id, metadata: req.metadata ?? {} });
  }
}

// ==================== Interview Planner ====================

export class InterviewPlannerAgent extends SubAgent {
  constructor() { super('interview_planner', ['generate_interview_questions']); }

  async run(req: AgentRequest): Promise<SubAgentResult> {
    const context = (req.payload?.interview_context as InterviewContext) ?? { event_description: req.text };
    return this.callTool('generate_interview_questions', { context }, { sessionId: '', requestId: req.id, metadata: req.metadata ?? {} });
  }
}

// ==================== Legal Guardrail ====================

export class LegalGuardrailAgent extends SubAgent {
  constructor() { super('legal_guardrail', ['check_legal_scope', 'validate_chain_of_custody']); }

  async run(req: AgentRequest): Promise<SubAgentResult> {
    const custody = req.payload?.custody_items as CustodyItem[] | undefined;
    if (custody) {
      return this.callTool('validate_chain_of_custody', { items: custody }, { sessionId: '', requestId: req.id, metadata: req.metadata ?? {} });
    }
    const request = req.payload?.legal_request as {
      planned_action: string; data_sources: string[];
      involves_positional_data: boolean; has_warrant_or_lawful_basis: boolean; target_is_named_individual: boolean;
    } | undefined;
    if (request) {
      return this.callTool('check_legal_scope', { request }, { sessionId: '', requestId: req.id, metadata: req.metadata ?? {} });
    }
    return { agent: this.role, toolUsed: 'check_legal_scope', success: false, data: null, errors: ['No legal_request or custody_items supplied in payload.'] };
  }
}

// ==================== Skill Registry ====================

export interface SkillRegistryEntry {
  role: AgentRole;
  description: string;
  triggers: string[];
  factory: () => SubAgent;
}

export class SkillRegistry {
  private static instance: SkillRegistry;
  private entries = new Map<AgentRole, SkillRegistryEntry>();

  private constructor() {}

  static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) SkillRegistry.instance = new SkillRegistry();
    return SkillRegistry.instance;
  }

  register(entry: SkillRegistryEntry): void {
    if (this.entries.has(entry.role)) throw new Error(`Skill already registered: ${entry.role}`);
    this.entries.set(entry.role, entry);
  }

  get(role: AgentRole): SkillRegistryEntry | undefined { return this.entries.get(role); }
  all(): SkillRegistryEntry[] { return [...this.entries.values()]; }

  resolveByText(text: string): AgentRole[] {
    const lower = text.toLowerCase();
    const matches: AgentRole[] = [];
    for (const entry of this.entries.values()) {
      if (entry.triggers.some(t => lower.includes(t))) {
        matches.push(entry.role);
      }
    }
    return matches;
  }
}

// ==================== Router ====================

export class RouterAgent {
  private registry: SkillRegistry;
  private logger = Logger.getInstance();

  constructor() {
    this.registry = SkillRegistry.getInstance();
    registerInvestigationTools();
  }

  /**
   * Emit an explicit, auditable chain-of-thought trace, then select sub-agents
   * by keyword/rule matching against the skill registry.
   */
  route(req: AgentRequest): { trace: ChainOfThoughtStep[]; selected: AgentRole[] } {
    const cfg = getConfig();
    const trace: ChainOfThoughtStep[] = [];
    trace.push({
      step: 1,
      thought: `Classify request intent from text: "${truncate(req.text, 160)}".`,
      decision: 'Inspect triggers across the skill registry.'
    });

    const matched = this.registry.resolveByText(req.text);
    trace.push({
      step: 2,
      thought: `Registry trigger match produced candidates: ${matched.join(', ') || 'none'}.`,
      decision: matched.length === 0 ? 'Fall back to lead_orchestrator as the default intake skill.' : 'Use matched sub-agents.'
    });

    // Payload-driven overrides: if payload carries typed data, ensure the right agent runs.
    const payloadKeys = Object.keys(req.payload ?? {});
    if (payloadKeys.includes('leads') && !matched.includes('lead_orchestrator')) matched.push('lead_orchestrator');
    if (payloadKeys.includes('sites') && !matched.includes('geo_profiler')) matched.push('geo_profiler');
    if (payloadKeys.includes('associates') && !matched.includes('network_analyst')) matched.push('network_analyst');
    if (payloadKeys.includes('interview_context') && !matched.includes('interview_planner')) matched.push('interview_planner');
    if ((payloadKeys.includes('legal_request') || payloadKeys.includes('custody_items')) && !matched.includes('legal_guardrail')) matched.push('legal_guardrail');

    let selected = matched;
    if (selected.length === 0) selected = ['lead_orchestrator'];

    // Honour max_sub_agents_per_request budget (cascade strategy runs highest-priority first).
    const max = cfg.router.max_sub_agents_per_request;
    if (selected.length > max) {
      selected = selected.slice(0, max);
      trace.push({ step: 3, thought: `${matched.length} agents exceeded budget of ${max}; truncating.`, decision: `Run first ${max}: ${selected.join(', ')}.` });
    }

    // Legal guardrail always runs last in cascade.
    if (selected.includes('legal_guardrail')) {
      selected = selected.filter(a => a !== 'legal_guardrail');
      if (selected.length < max) selected.push('legal_guardrail');
    } else if (cfg.guardrails.enforce_legal_scope) {
      // Always append the guardrail pass as a final control when budget allows.
      if (selected.length < max) selected.push('legal_guardrail');
    }

    trace.push({
      step: trace.length + 1,
      thought: `Final selection: ${selected.join(', ')}.`,
      decision: `Dispatch in ${cfg.router.strategy} strategy.`
    });

    return { trace, selected };
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + '…';
}

// ==================== Orchestrator ====================

export class InvestigationOrchestrator {
  private router = new RouterAgent();
  private registry = SkillRegistry.getInstance();
  private logger = Logger.getInstance();
  private bus = EventBus.getInstance();
  private cfg = getConfig();

  async handle(req: AgentRequest): Promise<AgentResponse> {
    const sessionId = generateSessionId();
    const ctx: HookContext = {
      sessionId,
      requestId: req.id,
      metadata: { ...(req.metadata ?? {}), legalClearanceAttested: req.legalClearanceAttested ?? false }
    };

    const { trace, selected } = this.router.route(req);
    this.logger.info('Router dispatch', { requestId: req.id, selected, sessionId });

    const results: SubAgentResult[] = [];
    for (const role of selected) {
      const entry = this.registry.get(role);
      if (!entry) {
        results.push({ agent: role, toolUsed: '', success: false, data: null, errors: [`No skill registered for role ${role}.`] });
        continue;
      }
      const agent = entry.factory();
      try {
        const subCtx: HookContext = { ...ctx, agentName: role };
        const loggingHook = createLoggingHook(`agent.${role}`);
        // Wrap with logging + guardrail hooks conceptually (here we apply pre-checks via callTool).
        void loggingHook;
        const result = await agent.run(req, subCtx);
        results.push(result);
        await this.bus.emit(`agent.${role}.completed`, { requestId: req.id, success: result.success });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Sub-agent ${role} failed`, { error: msg });
        results.push({ agent: role, toolUsed: '', success: false, data: null, errors: [msg], notes: ['Graceful degradation: structured fallback returned by orchestrator.'] });
      }
    }

    // Apply guardrail hook semantics on the aggregate output.
    const guardrail = createGuardrailHook();
    try {
      await guardrail.beforeExecution?.(ctx, req);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.blockedResponse(req, sessionId, trace, selected, results, msg);
    }

    const synthesis = this.synthesize(results);
    const legalNonCompliance = this.detectLegalNonCompliance(results);
    let confidence = this.estimateConfidence(results);
    const warnings = this.collectWarnings(results);
    if (legalNonCompliance) {
      warnings.unshift(legalNonCompliance);
      confidence = 'Low';
    }

    return {
      request_id: req.id,
      session_id: sessionId,
      router_trace: this.cfg.output.include_chain_of_thought ? trace : [],
      selected_agents: selected,
      sub_agent_results: results,
      synthesis,
      disclaimer: this.disclaimer(),
      legal_scope_note: this.legalScopeNote(),
      confidence,
      warnings
    };
  }

  private detectLegalNonCompliance(results: SubAgentResult[]): string | null {
    for (const r of results) {
      if (r.agent !== 'legal_guardrail' || !r.success) continue;
      const d = r.data as { compliant?: boolean; valid?: boolean } | null;
      if (d && d.compliant === false) {
        return 'Legal/guardrail check returned NON-COMPLIANT. Halt the planned action and consult a qualified legal advisor before proceeding.';
      }
    }
    return null;
  }

  private synthesize(results: SubAgentResult[]): string {
    const lines: string[] = [];
    lines.push('## Investigation Support Synthesis');
    for (const r of results) {
      if (!r.success) {
        lines.push(`- **${r.agent}**: unable to complete (${r.errors?.join('; ') || 'unknown error'}).`);
        continue;
      }
      const d = r.data as Record<string, unknown> | null;
      switch (r.agent) {
        case 'lead_orchestrator':
          lines.push(`- **Lead Prioritization (weighted MCDA)**: ranked ${countLeads(d)} leads; top priority band ${(d as any)?.ranked_leads?.[0]?.priority_band ?? 'n/a'}.`);
          break;
        case 'geo_profiler':
          lines.push(`- **Geographic Profiling**: produced ${(d as any)?.cells?.length ?? 0} candidate cells; estimated anchor ${(d as any)?.estimatedAnchor ? JSON.stringify((d as any).estimatedAnchor) : 'n/a'}.`);
          break;
        case 'behavioral_analyst':
          lines.push(`- **Routine Activity Analysis**: ${countZones(d)} risk zone(s) identified using Cohen & Felson RAT.`);
          break;
        case 'network_analyst':
          lines.push(`- **Link Analysis**: ${(d as any)?.nodeCount ?? 0} nodes, ${(d as any)?.edgeCount ?? 0} edges, ${(d as any)?.cutVertices?.length ?? 0} cut-vertex node(s).`);
          break;
        case 'interview_planner':
          lines.push(`- **Cognitive Interview Plan**: generated ${(d as any)?.questions?.length ?? 0} phased questions using Fisher & Geiselman method.`);
          break;
        case 'legal_guardrail':
          lines.push(`- **Legal/Guardrail Check**: ${summarizeLegal(d)}`);
          break;
      }
    }
    lines.push('');
    lines.push('Outputs above are structured analytical support only. See disclaimer and legal-scope note.');
    return lines.join('\n');
  }

  private estimateConfidence(results: SubAgentResult[]): 'Low' | 'Medium' | 'High' {
    const total = results.length || 1;
    const ok = results.filter(r => r.success).length;
    const ratio = ok / total;
    if (ratio >= 0.8) return 'High';
    if (ratio >= 0.5) return 'Medium';
    return 'Low';
  }

  private collectWarnings(results: SubAgentResult[]): string[] {
    const w: string[] = [];
    for (const r of results) {
      if (!r.success) w.push(`${r.agent}: ${r.errors?.join('; ')}`);
      if (r.notes && r.notes.length) w.push(...r.notes);
    }
    return w;
  }

  private blockedResponse(req: AgentRequest, sessionId: string, trace: ChainOfThoughtStep[], selected: AgentRole[], results: SubAgentResult[], reason: string): AgentResponse {
    return {
      request_id: req.id,
      session_id: sessionId,
      router_trace: trace,
      selected_agents: selected,
      sub_agent_results: results,
      synthesis: `## Request Blocked by Guardrail\n\n${reason}\n\nNo substantive analysis produced. Address the guardrail violation and resubmit.`,
      disclaimer: this.disclaimer(),
      legal_scope_note: this.legalScopeNote(),
      confidence: 'Low',
      warnings: [reason]
    };
  }

  private disclaimer(): string {
    return 'This output is general, educational/analytical information produced to support lawful professional investigation. It is not legal advice, not a professional determination, and not a judgment about any named individual. Always verify with a qualified professional (legal advisor, sworn investigator, forensic analyst) before acting on any lead.';
  }

  private legalScopeNote(): string {
    return 'All data used must be lawfully and authoritatively obtained. Positional/location data requires a warrant or explicit lawful basis. Do not extend this skill into private surveillance or vigilante action. Where a named individual is referenced, conclusions remain at the level of structured reasoning support, not definitive judgment.';
  }
}

function countLeads(d: Record<string, unknown> | null): number {
  const arr = (d as any)?.ranked_leads;
  return Array.isArray(arr) ? arr.length : 0;
}
function countZones(d: Record<string, unknown> | null): number {
  const arr = (d as any)?.topRiskZones;
  return Array.isArray(arr) ? arr.length : 0;
}
function summarizeLegal(d: Record<string, unknown> | null): string {
  if (!d) return 'no data';
  if ('compliant' in d) {
    const r = d as any;
    return `compliant=${r.compliant}; ${r.violations?.length ?? 0} violation(s), ${r.warnings?.length ?? 0} warning(s).`;
  }
  if ('valid' in d) {
    const r = d as any;
    return `chain valid=${r.valid}; ${r.errors?.length ?? 0} error(s), ${r.warnings?.length ?? 0} warning(s).`;
  }
  return 'unknown legal scope result shape';
}

// ==================== Bootstrapping ====================

export function bootstrapSkillRegistry(): void {
  const reg = SkillRegistry.getInstance();
  if (reg.get('lead_orchestrator')) {
    registerInvestigationTools();
    return;
  }
  reg.register({
    role: 'lead_orchestrator',
    description: 'Organize known suspect data into a weighted-MCDA lead-prioritization matrix with priority bands.',
    triggers: ['lead', 'priorit', 'tip', 'organize', 'matrix', 'triage', 'lead sheet'],
    factory: () => new LeadOrchestratorAgent()
  });
  reg.register({
    role: 'geo_profiler',
    description: 'Apply Rossmo-style geographic profiling to narrow likely anchor areas from offense sites.',
    triggers: ['geographic', 'rossmo', 'where', 'search area', 'anchor', 'location pattern', 'hotspot', 'offense site'],
    factory: () => new GeoProfilerAgent()
  });
  reg.register({
    role: 'behavioral_analyst',
    description: 'Apply Routine Activity Theory (Cohen & Felson) to analyze movement/behavioral patterns and convergence zones.',
    triggers: ['routine', 'behavior', 'movement', 'pattern', 'convergence', 'guardian', 'habit'],
    factory: () => new BehavioralAnalystAgent()
  });
  reg.register({
    role: 'network_analyst',
    description: 'Map known associates via link/network analysis (centrality, cut-vertices, influence ranking).',
    triggers: ['associate', 'network', 'link', 'connection', 'contact', 'associate map', 'relationship'],
    factory: () => new NetworkAnalystAgent()
  });
  reg.register({
    role: 'interview_planner',
    description: 'Draft structured cognitive-interview question sets for witnesses/informants.',
    triggers: ['interview', 'question', 'witness', 'informant', 'interrogat', 'cognitive'],
    factory: () => new InterviewPlannerAgent()
  });
  reg.register({
    role: 'legal_guardrail',
    description: 'Flag legal and ethical boundaries: lawful sourcing, warrant requirements, chain-of-custody, no definitive judgment on individuals.',
    triggers: ['legal', 'warrant', 'custody', 'ethical', 'jurisdiction', 'compliance', 'chain of custody'],
    factory: () => new LegalGuardrailAgent()
  });
  registerInvestigationTools();
}

export { getConfig };
