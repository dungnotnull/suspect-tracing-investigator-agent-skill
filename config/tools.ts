/**
 * Tool System - Rich tool definitions with JSON schemas and REAL execution handlers.
 *
 * Every handler below is a functional implementation (no stubs, no placeholders):
 *   - score_leads          : weighted MCDA lead prioritization
 *   - geographic_profile   : conceptual Rossmo-style probability surface
 *   - routine_activity_analysis : Cohen & Felson RAT convergence mapping
 *   - link_analysis        : associate network centrality + cut-vertex detection
 *   - generate_interview_questions : cognitive-interview question set builder
 *   - check_legal_scope    : guardrail / lawful-source compliance check
 *   - validate_chain_of_custody : evidentiary-integrity sequence validator
 *
 * The pure computational cores are exported so /scripts can reuse them.
 */

import { getConfig, normalizeWeights, LeadCriteriaWeights, Logger } from './index';
import { JsonValidator } from './validation';
import { createDistanceProvider, DistanceProvider, rossmoScoreFromDistances } from './distance';

// ==================== Types ====================

export type ToolCategory = 'analysis' | 'validation' | 'transformation' | 'output' | 'utility';

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: { type: 'object'; properties: Record<string, object>; required?: string[] };
  outputSchema: { type: 'object'; description: string };
  handler: (input: unknown) => Promise<unknown>;
  version: string;
  deprecated?: boolean;
  rateLimit?: { maxCalls: number; windowMs: number };
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  errors?: string[];
  metadata?: { executionTimeMs: number; timestamp: string; version: string };
}

export interface ToolExecutionContext {
  toolName: string;
  sessionId: string;
  userId?: string;
  metadata: Record<string, unknown>;
}

// ==================== Domain Input Types ====================

export interface LeadInput {
  id: string;
  description: string;
  source: string;
  source_reliability: 'High' | 'Medium' | 'Low';
  /** Proximity score 0..1 (1 = directly relevant to suspect anchor) */
  proximity: number;
  /** Temporal recency 0..1 (1 = most recent) */
  temporal_recency: number;
  /** Number of independent corroborating items */
  corroborating_items: number;
  /** 0..1 — can an actionable step be taken now? */
  actionability: number;
  /** Datetime the lead was captured (ISO) */
  captured_at?: string;
}

export interface OffenseSiteInput {
  id: string;
  label?: string;
  lat: number;
  lon: number;
  timestamp?: string;
  weight?: number;
}

export interface AssociateInput {
  id: string;
  name?: string;
  /** IDs of associates this node is linked to */
  links: string[];
  /** tie strength 0..1 */
  strength?: number;
  /** role label e.g. "family", "financial", "criminal-associate" */
  role?: string;
}

// ==================== Tool Registry ====================

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ToolDefinition> = new Map();
  private rateTracker: Map<string, number[]> = new Map();

  private constructor() {}

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) ToolRegistry.instance = new ToolRegistry();
    return ToolRegistry.instance;
  }

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
    this.validateDefinition(tool);
    this.tools.set(tool.name, tool);
  }

  private validateDefinition(tool: ToolDefinition): void {
    if (!tool.name?.trim()) throw new Error('Tool name is required');
    if (!tool.description?.trim()) throw new Error('Tool description is required');
    if (!tool.inputSchema?.properties) throw new Error('Tool inputSchema.properties required');
    if (typeof tool.handler !== 'function') throw new Error('Tool handler must be a function');
  }

  async execute(toolName: string, input: unknown, ctx: ToolExecutionContext): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) return { success: false, data: null, errors: [`Tool not found: ${toolName}`] };
    if (tool.deprecated) Logger.getInstance().warn(`Tool ${toolName} is deprecated`);
    if (tool.rateLimit && !this.checkRate(toolName, tool.rateLimit)) {
      return { success: false, data: null, errors: [`Rate limit exceeded for tool: ${toolName}`] };
    }
    const start = Date.now();
    try {
      (this as any).currentToolName = toolName;
      this.validateInputShape(tool.inputSchema, input);
      const data = await tool.handler(input);
      const ms = Date.now() - start;
      return { success: true, data, metadata: { executionTimeMs: ms, timestamp: new Date().toISOString(), version: tool.version } };
    } catch (err) {
      const ms = Date.now() - start;
      return {
        success: false,
        data: null,
        errors: [err instanceof Error ? err.message : String(err)],
        metadata: { executionTimeMs: ms, timestamp: new Date().toISOString(), version: tool.version }
      };
    }
  }

  private checkRate(name: string, rl: { maxCalls: number; windowMs: number }): boolean {
    const now = Date.now();
    const calls = (this.rateTracker.get(name) ?? []).filter(t => now - t < rl.windowMs);
    if (calls.length >= rl.maxCalls) return false;
    calls.push(now);
    this.rateTracker.set(name, calls);
    return true;
  }

  private validateInputShape(schema: ToolDefinition['inputSchema'], input: unknown): void {
    if (!input || typeof input !== 'object') throw new Error('Input must be an object');
    const result = JsonValidator.getInstance().validateToolInput(
      (this as any).currentToolName ?? 'anonymous',
      schema as object,
      input
    );
    if (!result.valid) {
      const msgs = result.errors.map(e => `${e.path || 'root'}: ${e.message}`).join('; ');
      throw new Error(`Input schema validation failed: ${msgs}`);
    }
  }

  getTool(name: string): ToolDefinition | undefined { return this.tools.get(name); }
  getAllTools(): ToolDefinition[] { return [...this.tools.values()]; }
  getToolsByCategory(cat: ToolCategory): ToolDefinition[] {
    return this.getAllTools().filter(t => t.category === cat);
  }
  unregister(name: string): boolean { return this.tools.delete(name); }
}

// ==================== Computational Cores (pure functions) ====================

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
function round5(n: number): number { return Math.round(n * 1e5) / 1e5; }
function round6(n: number): number { return Math.round(n * 1e6) / 1e6; }
function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }

function bandFor(n: number): string {
  if (n >= 0.75) return 'P1-High';
  if (n >= 0.5) return 'P2-Medium';
  if (n >= 0.25) return 'P3-Low';
  return 'P4-Background';
}

/**
 * Weighted MCDA lead prioritization.
 * Criteria normalized to 0..1 then combined with normalized weights.
 * Corroborative strength = saturating function of corroborating_items count.
 */
export function scoreLeads(
  leads: LeadInput[],
  rawWeights?: Partial<LeadCriteriaWeights>
): LeadScoreResult[] {
  const cfg = getConfig();
  const weights = normalizeWeights({ ...cfg.scoring.lead_criteria_weights, ...rawWeights } as LeadCriteriaWeights);

  const reliabilityMap: Record<LeadInput['source_reliability'], number> = { High: 1.0, Medium: 0.6, Low: 0.3 };
  const maxCorroboration = Math.max(1, ...leads.map(l => l.corroborating_items));

  const results = leads.map(lead => {
    const proximity = clamp01(lead.proximity);
    const temporal = clamp01(lead.temporal_recency);
    const sourceRel = reliabilityMap[lead.source_reliability] ?? 0.3;
    const corroboration = 1 - Math.exp(-(lead.corroborating_items / Math.max(1, maxCorroboration)) * 2);
    const actionability = clamp01(lead.actionability);

    const rawScore =
      proximity * weights.proximity +
      temporal * weights.temporal_recency +
      sourceRel * weights.source_reliability +
      corroboration * weights.corroborative_strength +
      actionability * weights.actionability;

    return {
      lead_id: lead.id,
      description: lead.description,
      source: lead.source,
      source_reliability: lead.source_reliability,
      component_scores: {
        proximity: round4(proximity),
        temporal_recency: round4(temporal),
        source_reliability: round4(sourceRel),
        corroborative_strength: round4(corroboration),
        actionability: round4(actionability)
      },
      weighted_score: round4(rawScore),
      normalized_score: 0,
      priority_band: '',
      rank: 0,
      rationale: buildLeadRationale(lead, { proximity, temporal, sourceRel, corroboration, actionability })
    };
  });

  const scores = results.map(r => r.weighted_score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min;
  for (const r of results) {
    r.normalized_score = round4(span <= 0 ? 1 : (r.weighted_score - min) / span);
    r.priority_band = bandFor(r.normalized_score);
  }
  results.sort((a, b) => b.normalized_score - a.normalized_score);
  results.forEach((r, i) => { r.rank = i + 1; });
  return results;
}

function buildLeadRationale(lead: LeadInput, s: Record<string, number>): string {
  const parts: string[] = [];
  parts.push(`source reliability ${lead.source_reliability} (${round2(s.sourceRel)})`);
  if (s.proximity >= 0.7) parts.push('strong suspect-anchor proximity');
  if (s.temporal >= 0.7) parts.push('temporally recent');
  if (s.corroboration >= 0.6) parts.push(`${lead.corroborating_items} corroborating item(s)`);
  if (s.actionability >= 0.7) parts.push('immediately actionable');
  return parts.join('; ') + '.';
}

/**
 * Haversine great-circle distance in km.
 */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function kmToLat(km: number): number { return km / 110.574; }
function kmToLon(km: number, latDeg: number): number { return km / (111.32 * Math.cos((latDeg * Math.PI) / 180)); }

/**
 * Conceptual Rossmo geographic profiling score for a candidate anchor point.
 * Uses the CGS (Crime Geographic Targeting) functional form:
 *   P(s) = sum [ phi / (d^2)      when d > B
 *                phi * (1 - d/B)  when d <= B ] over offense sites,
 * where B is the buffer-zone radius and phi is an offense weight.
 * Higher score => higher prior probability that anchor is at point s.
 */
export function rossmoScore(
  point: { lat: number; lon: number },
  sites: OffenseSiteInput[],
  opts: { bufferZoneKm: number; decayConstantKm: number }
): number {
  const B = opts.bufferZoneKm;
  let total = 0;
  for (const site of sites) {
    const d = haversineKm(point, { lat: site.lat, lon: site.lon });
    const phi = site.weight ?? 1;
    let contribution: number;
    if (d > B) {
      contribution = phi / Math.pow(d, 2);
    } else if (d > 0) {
      contribution = phi * (1 - d / B);
    } else {
      contribution = phi;
    }
    total += contribution;
  }
  return total;
}

/**
 * Generate a geographic profiling surface over a bounding grid.
 * Returns ranked candidate anchor cells with normalized scores.
 */
export async function geographicProfile(
  sites: OffenseSiteInput[],
  opts?: {
    bufferZoneKm?: number;
    decayConstantKm?: number;
    gridCellKm?: number;
    gridPaddingKm?: number;
    distanceMode?: 'haversine' | 'osrm';
    osrmBaseUrl?: string;
    distanceProvider?: DistanceProvider;
  }
): Promise<GeoProfileResult> {
  const cfg = getConfig();
  const bufferZoneKm = opts?.bufferZoneKm ?? cfg.scoring.geo.buffer_zone_km;
  const decayConstantKm = opts?.decayConstantKm ?? cfg.scoring.geo.decay_constant_km;
  const gridCellKm = opts?.gridCellKm ?? cfg.scoring.geo.grid_cell_km;
  const padding = opts?.gridPaddingKm ?? 2.0;
  const distanceMode = opts?.distanceMode ?? cfg.scoring.geo.distance_mode ?? 'haversine';
  const provider =
    opts?.distanceProvider ??
    createDistanceProvider(distanceMode, opts?.osrmBaseUrl ?? cfg.scoring.geo.osrm_base_url);

  if (sites.length === 0) {
    return { cells: [], topCells: [], envelope: null, parameters: { bufferZoneKm, decayConstantKm, gridCellKm } };
  }

  const lats = sites.map(s => s.lat);
  const lons = sites.map(s => s.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const padDegLat = kmToLat(padding);
  const midLat = (minLat + maxLat) / 2;
  const padDegLon = kmToLon(padding, midLat);
  const stepLat = kmToLat(gridCellKm);
  const stepLon = kmToLon(gridCellKm, midLat);

  // Collect candidate cell centres (lon,lat order not important — kept as {lat,lon}).
  const centers: { lat: number; lon: number }[] = [];
  for (let lat = minLat - padDegLat; lat <= maxLat + padDegLat; lat += stepLat) {
    for (let lon = minLon - padDegLon; lon <= maxLon + padDegLon; lon += stepLon) {
      centers.push({ lat, lon });
    }
  }

  // Single batched distance matrix request (km): matrix[cellIdx][siteIdx].
  const matrix = await provider.distances(centers, sites);

  const cells: GeoCell[] = [];
  for (let i = 0; i < centers.length; i++) {
    const row = matrix[i] ?? [];
    const score = rossmoScoreFromDistances(row, sites, bufferZoneKm);
    if (score > 0) {
      cells.push({ lat: round5(centers[i].lat), lon: round5(centers[i].lon), rawScore: round6(score), normalizedScore: 0, priorityBand: '' });
    }
  }

  const rawMax = Math.max(...cells.map(c => c.rawScore), 1e-9);
  for (const c of cells) {
    c.normalizedScore = round4(c.rawScore / rawMax);
    c.priorityBand = bandFor(c.normalizedScore);
  }
  cells.sort((a, b) => b.normalizedScore - a.normalizedScore);
  const top = cells.slice(0, 10);

  const topMass = top.reduce((acc, c) => acc + c.normalizedScore, 0) || 1;
  const weightedLat = top.reduce((acc, c) => acc + c.lat * c.normalizedScore, 0) / topMass;
  const weightedLon = top.reduce((acc, c) => acc + c.lon * c.normalizedScore, 0) / topMass;

  return {
    cells: cells.slice(0, 200),
    topCells: top,
    estimatedAnchor: { lat: round5(weightedLat), lon: round5(weightedLon) },
    envelope: { minLat: round5(minLat - padDegLat), maxLat: round5(maxLat + padDegLat), minLon: round5(minLon - padDegLon), maxLon: round5(maxLon + padDegLon) },
    parameters: { bufferZoneKm, decayConstantKm, gridCellKm }
  };
}

/**
 * Routine Activity Theory (Cohen & Felson) convergence analysis.
 * Identifies where/when motivated offender, suitable target, and absence of
 * capable guardian are likely to converge, producing candidate patrol/lead zones.
 */
export function routineActivityAnalysis(
  sites: OffenseSiteInput[],
  routine: { anchor: { lat: number; lon: number }; nodes: Array<{ id: string; lat: number; lon: number; label?: string; guardianStrength: number }> }
): RatResult {
  const convergence: RatNode[] = [];
  for (const node of routine.nodes) {
    const d = haversineKm(routine.anchor, { lat: node.lat, lon: node.lon });
    const siteProximity = sites.length
      ? Math.min(...sites.map(s => haversineKm({ lat: node.lat, lon: node.lon }, { lat: s.lat, lon: s.lon })))
      : Infinity;
    const guardianGap = 1 - clamp01(node.guardianStrength);
    const proximityFactor = siteProximity === Infinity ? 0.2 : 1 / (1 + siteProximity);
    const riskScore = round4(0.4 * proximityFactor + 0.6 * guardianGap);
    convergence.push({ nodeId: node.id, label: node.label, distanceKm: round2(d), guardianGap: round2(guardianGap), riskScore });
  }
  convergence.sort((a, b) => b.riskScore - a.riskScore);
  return {
    convergencePoints: convergence,
    topRiskZones: convergence.slice(0, 5),
    interpretation:
      'Per Cohen & Felson (1979) routine activity theory, offenses concentrate where a motivated offender, a suitable target, and the absence of a capable guardian converge in space/time. ' +
      'The topRiskZones list ranks candidate nodes by weighted proximity to known offense sites (40%) and guardian gap (60%).'
  };
}

/**
 * Link analysis over the associate network: computes degree, weighted degree,
 * betweenness (Brandes algorithm), and identifies cut-vertices (articulation points)
 * whose removal fragments the network — typically high-priority investigative targets.
 */
export function linkAnalysis(associates: AssociateInput[]): LinkAnalysisResult {
  const ids = associates.map(a => a.id);
  const idSet = new Set(ids);
  const adj = new Map<string, Map<string, number>>();
  for (const id of ids) adj.set(id, new Map());
  for (const a of associates) {
    for (const linked of a.links) {
      if (!idSet.has(linked)) continue;
      const s = a.strength ?? 0.5;
      const m1 = adj.get(a.id)!;
      const m2 = adj.get(linked)!;
      m1.set(linked, m1.has(linked) ? (m1.get(linked)! + s) / 2 : s);
      m2.set(a.id, m2.has(a.id)! ? (m2.get(a.id)! + s) / 2 : s);
    }
  }

  const degree = new Map<string, number>();
  const weightedDegree = new Map<string, number>();
  for (const id of ids) {
    const neighbors = adj.get(id)!;
    degree.set(id, neighbors.size);
    weightedDegree.set(id, round4([...neighbors.values()].reduce((a, b) => a + b, 0)));
  }

  const betweenness = brandesBetweenness(ids, adj);
  const cutVertices = findCutVertices(ids, adj);

  const maxBetweenness = Math.max(...betweenness.values()) || 1e-9;
  const maxWeighted = Math.max(...weightedDegree.values()) || 1e-9;
  const denom = Math.max(1, ids.length - 1);

  const ranked = ids
    .map(id => {
      const node = associates.find(a => a.id === id)!;
      const degNorm = degree.get(id)! / denom;
      const btwNorm = betweenness.get(id)! / maxBetweenness;
      const wdNorm = weightedDegree.get(id)! / maxWeighted;
      const cutBonus = cutVertices.has(id) ? 0.15 : 0;
      const influence = round4(0.35 * degNorm + 0.35 * btwNorm + 0.20 * wdNorm + cutBonus);
      return {
        id,
        name: node.name,
        role: node.role,
        degree: degree.get(id)!,
        weightedDegree: weightedDegree.get(id)!,
        betweenness: round4(betweenness.get(id)!),
        isCutVertex: cutVertices.has(id),
        influenceScore: influence
      };
    })
    .sort((a, b) => b.influenceScore - a.influenceScore);

  return {
    nodes: ranked,
    cutVertices: [...cutVertices],
    edgeCount: countEdges(ids, adj),
    nodeCount: ids.length,
    interpretation:
      cutVertices.size > 0
        ? `Identified ${cutVertices.size} cut-vertex node(s) whose removal fragments the network — high-value targets for disruption or intelligence development.`
        : 'No single cut-vertex; network is resilient to single-node removal. Consider multi-node or financial-flow disruption strategies.'
  };
}

function countEdges(ids: string[], adj: Map<string, Map<string, number>>): number {
  let count = 0;
  const seen = new Set<string>();
  for (const id of ids) {
    for (const nb of adj.get(id)!.keys()) {
      const key = id < nb ? `${id}|${nb}` : `${nb}|${id}`;
      if (!seen.has(key)) { seen.add(key); count++; }
    }
  }
  return count;
}

/** Brandes (2001) betweenness centrality for unweighted undirected graphs. */
function brandesBetweenness(ids: string[], adj: Map<string, Map<string, number>>): Map<string, number> {
  const Cb = new Map<string, number>(ids.map(id => [id, 0]));
  for (const s of ids) {
    const S: string[] = [];
    const P = new Map<string, string[]>(ids.map(id => [id, []]));
    const sigma = new Map<string, number>(ids.map(id => [id, 0]));
    const dist = new Map<string, number>(ids.map(id => [id, -1]));
    sigma.set(s, 1);
    dist.set(s, 0);
    const Q: string[] = [s];
    while (Q.length) {
      const v = Q.shift()!;
      S.push(v);
      for (const w of adj.get(v)!.keys()) {
        if (dist.get(w)! < 0) {
          Q.push(w);
          dist.set(w, dist.get(v)! + 1);
        }
        if (dist.get(w)! === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          P.get(w)!.push(v);
        }
      }
    }
    const delta = new Map<string, number>(ids.map(id => [id, 0]));
    while (S.length) {
      const w = S.pop()!;
      for (const v of P.get(w)!) {
        delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      }
      if (w !== s) Cb.set(w, Cb.get(w)! + delta.get(w)!);
    }
  }
  for (const id of ids) Cb.set(id, Cb.get(id)! / 2);
  return Cb;
}

/** Iterative articulation-point (Tarjan) detection via DFS lowlink. */
function findCutVertices(ids: string[], adj: Map<string, Map<string, number>>): Set<string> {
  const visited = new Set<string>();
  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const ap = new Set<string>();
  let timer = 0;

  function dfs(u: string): void {
    visited.add(u);
    disc.set(u, timer);
    low.set(u, timer);
    timer++;
    let children = 0;
    for (const v of adj.get(u)!.keys()) {
      if (!visited.has(v)) {
        children++;
        parent.set(v, u);
        dfs(v);
        low.set(u, Math.min(low.get(u)!, low.get(v)!));
        if (parent.get(u) === null && children > 1) ap.add(u);
        if (parent.get(u) !== null && low.get(v)! >= disc.get(u)!) ap.add(u);
      } else if (v !== parent.get(u)) {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!));
      }
    }
  }

  for (const id of ids) {
    if (!visited.has(id)) {
      parent.set(id, null);
      dfs(id);
    }
  }
  return ap;
}

/**
 * Cognitive-interview (Fisher & Geiselman) question set generator.
 * Builds a structured set across the four CI components plus rapport and
 * witness-specific follow-ups, derived from the supplied interview context.
 */
export function generateInterviewQuestions(context: InterviewContext): InterviewPlan {
  const model: InterviewModel = context.model ?? getConfig().interview?.default_model ?? 'cognitive';
  if (model === 'peace') return generatePeaceInterviewQuestions(context);
  const cfg = getConfig();
  const maxQ = cfg.validation.max_interview_questions;

  const rapport: string[] = [
    `Build rapport with ${context.interviewee_role ?? 'the interviewee'} before substantive recall; explain the purpose, the voluntary nature of participation, and that "I don't know" is an acceptable answer.`,
    `Establish the interviewee's baseline communication style and confirm they are comfortable taking time to think before answering.`
  ];

  const openNarrative: string[] = [
    `Ask ${context.interviewee_role ?? 'the interviewee'} to recount everything they remember about ${context.event_description}, from immediately before to immediately after — in their own words, without interruption, including details that seem trivial.`
  ];

  const contextReinstatement: string[] = [
    `Mentally return the interviewee to the scene of ${context.event_description}: ask them to picture the surroundings, the weather/lighting, sounds, smells, and how they felt at the time before attempting further recall.`,
    `Ask the interviewee to describe their own physical location and viewpoint during ${context.event_description}.`
  ];

  const variedRecall: string[] = [
    `Ask the interviewee to recount ${context.event_description} in reverse chronological order, starting from the most recent remembered moment and working backward.`,
    `Ask the interviewee to start the account from a different point in time than their initial narrative and proceed forward.`
  ];

  const changedPerspective: string[] = [
    `Ask the interviewee to describe ${context.event_description} from the perspective of someone else who was present (another witness, a bystander, or the suspect), as they imagine it.`
  ];

  const focusedFollowUp: string[] = context.known_facts && context.known_facts.length > 0
    ? context.known_facts.map((fact, i) => `Focused follow-up ${i + 1}: ask for any additional detail, sensory or temporal, related to — ${fact}.`)
    : [
      `Focused follow-up: ask the interviewee to elaborate on any specific person, object, or sequence they mentioned, using open "Tell me more about..." prompts rather than yes/no questions.`
    ];

  const closing: string[] = [
    `Summarize the account back to the interviewee and ask them to correct anything misstated.`,
    `Ask whether anything else comes to mind, even if it seems unimportant, and explain how to contact the investigator if later recall occurs.`,
    `Document the interview contemporaneously; avoid leading questions; record exact wording where possible.`
  ];

  const allQuestions = [
    ...rapport.map(q => ({ phase: 'Rapport' as const, question: q })),
    ...openNarrative.map(q => ({ phase: 'Open Narrative' as const, question: q })),
    ...contextReinstatement.map(q => ({ phase: 'Context Reinstatement' as const, question: q })),
    ...variedRecall.map(q => ({ phase: 'Varied Recall' as const, question: q })),
    ...changedPerspective.map(q => ({ phase: 'Changed Perspective' as const, question: q })),
    ...focusedFollowUp.map(q => ({ phase: 'Focused Follow-Up' as const, question: q })),
    ...closing.map(q => ({ phase: 'Closing' as const, question: q }))
  ];

  const trimmed = allQuestions.slice(0, maxQ);

  return {
    interviewee_role: context.interviewee_role,
    event_description: context.event_description,
    methodology: 'Cognitive Interview (Fisher & Geiselman, 1992)',
    components_addressed: [
      'Context reinstatement',
      'Recall everything',
      'Varied recall order',
      'Changed perspectives'
    ],
    questions: trimmed,
    reliability_considerations: [
      'Avoid leading or suggestive questions; use open-ended phrasing.',
      'Do not interrupt the initial free narrative.',
      'Be alert to the misinformation effect (Loftus, 1996); do not introduce details the interviewee did not provide.',
      'Confidence is not equivalent to accuracy; corroborate critical details independently.'
    ],
    post_interview_actions: [
      'Transcribe and store the recorded interview per chain-of-custody protocol.',
      'Cross-check key factual claims against independent evidence.',
      'Schedule a re-interview only if materially new information emerges; otherwise avoid repeated questioning that may contaminate memory.'
    ]
  };
}

/**
 * PEACE-model interview question generator (Milne & Bull, 1999).
 * PEACE = Planning, Engage & Explain, Account/Clarify/Challenge, Closure,
 * Evaluation. UK policing standard; non-coercive, structured, evidence-led.
 */
export function generatePeaceInterviewQuestions(context: InterviewContext): InterviewPlan {
  const cfg = getConfig();
  const maxQ = cfg.validation.max_interview_questions;
  const role = context.interviewee_role ?? 'the interviewee';

  const planning: string[] = [
    `Define the interview's objectives and the points-to-prove for ${context.event_description}.`,
    `Plan open questions; identify topics (not a rigid script) and the order: account first, clarify, then probe gaps.`,
    `Confirm lawful authority, voluntariness, and recording arrangements before starting.`
  ];
  const engageExplain: string[] = [
    `Engage ${role}: introduce yourself, your role, and the purpose of the interview about ${context.event_description}.`,
    `Explain the process: that the interview is recorded, that they may take time, and that "I don't know" is acceptable; encourage them to ask for clarification.`
  ];
  const account: string[] = [
    `Obtain a free, uninterrupted first account of ${context.event_description} in ${role}'s own words.`,
    `Use open prompts ("Tell me everything you can remember about...") before any specific questions.`,
    `Clarify ambiguous points with open follow-ups ("Help me understand what you meant by...").`
  ];
  const clarifyChallenge: string[] = (context.known_facts && context.known_facts.length > 0)
    ? context.known_facts.map((fact, i) => `Probe ${i + 1}: explore the account around — ${fact} — using open, non-leading questions; present inconsistencies factually, not as accusations.`)
    : [`Probe identified gaps and inconsistencies in the account using open questions; never put words in the interviewee's mouth.`];
  const closure: string[] = [
    `Summarise the account back and ask ${role} to correct anything inaccurate or add anything missed.`,
    `Explain next steps and how to contact the investigator if further recall occurs.`
  ];
  const evaluation: string[] = [
    `Evaluate the interview product against the objectives: were points-to-prove covered? Are there remaining gaps?`,
    `Record a brief evaluation for the case file: reliability considerations, follow-up actions, and corroboration needs.`
  ];

  const allQuestions = [
    ...planning.map(q => ({ phase: 'Planning & Preparation' as const, question: q })),
    ...engageExplain.map(q => ({ phase: 'Engage & Explain' as const, question: q })),
    ...account.map(q => ({ phase: 'Account' as const, question: q })),
    ...clarifyChallenge.map(q => ({ phase: 'Clarify & Challenge' as const, question: q })),
    ...closure.map(q => ({ phase: 'Closure' as const, question: q })),
    ...evaluation.map(q => ({ phase: 'Evaluation' as const, question: q }))
  ];

  const trimmed = allQuestions.slice(0, maxQ);

  return {
    interviewee_role: context.interviewee_role,
    event_description: context.event_description,
    methodology: 'PEACE Model (Milne & Bull, 1999)',
    components_addressed: ['Planning & Preparation', 'Engage & Explain', 'Account, Clarify, Challenge', 'Closure', 'Evaluation'],
    questions: trimmed,
    reliability_considerations: [
      'PEACE prohibits leading or coercive questioning; use open, non-leading prompts throughout.',
      'Do not interrupt the initial free account.',
      'Present inconsistencies factually ("Your account earlier was X, now Y") rather than as accusations.',
      'Confidence is not equivalent to accuracy; corroborate critical details independently.'
    ],
    post_interview_actions: [
      'Transcribe and store the recorded interview per chain-of-custody protocol.',
      'Cross-check key factual claims against independent evidence.',
      'Complete the evaluation step in the case file; re-interview only if materially new information emerges.'
    ]
  };
}

/**
 * Lawful-scope / guardrail compliance check on a planned investigative action.
 */
export function checkLegalScope(request: {
  planned_action: string;
  data_sources: string[];
  involves_positional_data: boolean;
  has_warrant_or_lawful_basis: boolean;
  target_is_named_individual: boolean;
}): LegalScopeResult {
  const cfg = getConfig();
  const violations: string[] = [];
  const warnings: string[] = [];

  for (const src of request.data_sources) {
    if (cfg.guardrails.disallowed_data_sources.includes(src)) {
      violations.push(`Disallowed data source: "${src}".`);
    }
    if (cfg.guardrails.allowed_data_sources.length && !cfg.guardrails.allowed_data_sources.includes(src)) {
      warnings.push(`Data source "${src}" is not on the approved list; verify lawful basis before use.`);
    }
  }

  if (cfg.guardrails.prohibit_private_surveillance && /private surveill|stalking|vigilante/i.test(request.planned_action)) {
    violations.push('Planned action pattern indicates private surveillance / vigilante conduct, which is prohibited.');
  }

  if (request.involves_positional_data && cfg.guardrails.require_warrant_warning_on_positional_data) {
    if (!request.has_warrant_or_lawful_basis) {
      violations.push('Positional/location data usage requires a warrant or other explicit lawful basis.');
    }
  }

  if (request.target_is_named_individual && cfg.guardrails.prohibit_individual_definitive_judgment) {
    warnings.push('Target is a named individual — output must remain at the level of structured reasoning support, not a definitive judgment about that person.');
  }

  const compliant = violations.length === 0;
  return {
    compliant,
    violations,
    warnings,
    required_action: compliant
      ? warnings.length
        ? 'Proceed with documented lawful basis; address warnings before acting.'
        : 'Proceed; no guardrail issues detected.'
      : 'Halt the planned action. Consult a qualified legal advisor and obtain the required warrant/lawful basis before proceeding.',
    disclaimer:
      'This compliance check is general analytical guidance, not legal advice. Consult a qualified legal advisor for jurisdiction-specific determination.'
  };
}

/**
 * Chain-of-custody sequence validation. Each item must carry an id, collector,
 * acquisition timestamp, and continuity chain where each transfer's `from`
 * equals the prior transfer's `to`.
 */
export function validateChainOfCustody(items: CustodyItem[]): CustodyResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    if (!item.id?.trim()) { errors.push(`Custody item missing id.`); continue; }
    if (!item.collector?.trim()) errors.push(`Item ${item.id}: collector is required.`);
    if (!item.acquired_at?.trim()) errors.push(`Item ${item.id}: acquired_at timestamp is required.`);
    if (!Array.isArray(item.chain) || item.chain.length === 0) {
      warnings.push(`Item ${item.id}: empty custody chain; continuity cannot be verified.`);
      continue;
    }
    let prevTo: string | null = item.collector ?? null;
    item.chain.forEach((t, i) => {
      if (!t.from || !t.to || !t.timestamp) {
        errors.push(`Item ${item.id}: chain step ${i + 1} missing from/to/timestamp.`);
        return;
      }
      if (prevTo !== null && t.from !== prevTo) {
        errors.push(`Item ${item.id}: continuity break at step ${i + 1} — expected from="${prevTo}", got from="${t.from}".`);
      }
      prevTo = t.to;
    });
    if (!item.storage_location?.trim()) {
      warnings.push(`Item ${item.id}: storage_location not specified.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    itemsVerified: items.length,
    summary: errors.length === 0
      ? `All ${items.length} custody item(s) passed continuity verification.`
      : `${errors.length} continuity error(s) across ${items.length} item(s).`
  };
}

// ==================== Result Types ====================

export interface LeadScoreResult {
  lead_id: string;
  description: string;
  source: string;
  source_reliability: 'High' | 'Medium' | 'Low';
  component_scores: {
    proximity: number;
    temporal_recency: number;
    source_reliability: number;
    corroborative_strength: number;
    actionability: number;
  };
  weighted_score: number;
  normalized_score: number;
  priority_band: string;
  rank: number;
  rationale: string;
}

export interface GeoCell {
  lat: number;
  lon: number;
  rawScore: number;
  normalizedScore: number;
  priorityBand: string;
}

export interface GeoProfileResult {
  cells: GeoCell[];
  topCells: GeoCell[];
  estimatedAnchor?: { lat: number; lon: number };
  envelope: { minLat: number; maxLat: number; minLon: number; maxLon: number } | null;
  parameters: { bufferZoneKm: number; decayConstantKm: number; gridCellKm: number };
}

export interface RatNode {
  nodeId: string;
  label?: string;
  distanceKm: number;
  guardianGap: number;
  riskScore: number;
}

export interface RatResult {
  convergencePoints: RatNode[];
  topRiskZones: RatNode[];
  interpretation: string;
}

export interface LinkAnalysisResult {
  nodes: Array<{
    id: string; name?: string; role?: string;
    degree: number; weightedDegree: number; betweenness: number;
    isCutVertex: boolean; influenceScore: number;
  }>;
  cutVertices: string[];
  edgeCount: number;
  nodeCount: number;
  interpretation: string;
}

export type InterviewModel = 'cognitive' | 'peace';

export interface InterviewContext {
  interviewee_role?: string;
  event_description: string;
  known_facts?: string[];
  /** Interview methodology; defaults to 'cognitive'. 'peace' = PEACE model (Milne & Bull). */
  model?: InterviewModel;
}

export interface InterviewPlan {
  interviewee_role?: string;
  event_description: string;
  methodology: string;
  components_addressed: string[];
  questions: Array<{ phase: string; question: string }>;
  reliability_considerations: string[];
  post_interview_actions: string[];
}

export interface LegalScopeResult {
  compliant: boolean;
  violations: string[];
  warnings: string[];
  required_action: string;
  disclaimer: string;
}

export interface CustodyItem {
  id: string;
  description?: string;
  collector: string;
  acquired_at: string;
  storage_location?: string;
  chain: Array<{ from: string; to: string; timestamp: string; note?: string }>;
}

export interface CustodyResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  itemsVerified: number;
  summary: string;
}

// ==================== Tool Definitions ====================

export const investigationTools: ToolDefinition[] = [
  {
    name: 'score_leads',
    description:
      'Apply a weighted MCDA (multi-criteria decision analysis) lead-prioritization model to rank investigative leads by proximity, temporal recency, source reliability, corroborative strength, and actionability. Returns normalized scores and priority bands P1..P4.',
    category: 'analysis',
    version: '1.0.0',
    inputSchema: {
      type: 'object',
      properties: {
        leads: { type: 'array', description: 'Lead items to score' },
        weights: { type: 'object', description: 'Optional override weights (will be normalized)' }
      },
      required: ['leads']
    },
    outputSchema: { type: 'object', description: 'Ranked, scored lead list with priority bands' },
    handler: async (input) => {
      const { leads, weights } = input as { leads: LeadInput[]; weights?: Partial<LeadCriteriaWeights> };
      if (!Array.isArray(leads)) throw new Error('leads must be an array');
      if (leads.length === 0) throw new Error('leads array is empty');
      return { ranked_leads: scoreLeads(leads, weights), model: 'weighted-mcda-v1' };
    },
    rateLimit: { maxCalls: 60, windowMs: 60000 }
  },
  {
    name: 'geographic_profile',
    description:
      'Generate a conceptual Rossmo-style geographic profiling probability surface from known offense sites and return ranked candidate anchor cells plus a weighted anchor estimate. Uses a configurable buffer zone and inverse-distance decay.',
    category: 'analysis',
    version: '1.0.0',
    inputSchema: {
      type: 'object',
      properties: {
        sites: { type: 'array', description: 'Offense sites with lat/lon' },
        options: { type: 'object', description: 'Optional buffer/decay/grid overrides' }
      },
      required: ['sites']
    },
    outputSchema: { type: 'object', description: 'Geographic profile surface with top cells and estimated anchor' },
    handler: async (input) => {
      const { sites, options } = input as { sites: OffenseSiteInput[]; options?: Parameters<typeof geographicProfile>[1] };
      if (!Array.isArray(sites)) throw new Error('sites must be an array');
      if (sites.length === 0) throw new Error('at least one offense site is required');
      return geographicProfile(sites, options);
    },
    rateLimit: { maxCalls: 30, windowMs: 60000 }
  },
  {
    name: 'routine_activity_analysis',
    description:
      'Apply Routine Activity Theory (Cohen & Felson, 1979) to identify space/time convergence points where a motivated offender, suitable target, and absence of a capable guardian are likely to coincide.',
    category: 'analysis',
    version: '1.0.0',
    inputSchema: {
      type: 'object',
      properties: {
        sites: { type: 'array', description: 'Known offense sites' },
        routine: { type: 'object', description: 'Suspect anchor and routine activity nodes with guardian strength' }
      },
      required: ['sites', 'routine']
    },
    outputSchema: { type: 'object', description: 'Ranked convergence/risk zones with interpretation' },
    handler: async (input) => {
      const { sites, routine } = input as { sites: OffenseSiteInput[]; routine: Parameters<typeof routineActivityAnalysis>[1] };
      if (!sites || !routine?.anchor) throw new Error('sites and routine.anchor are required');
      return routineActivityAnalysis(sites, routine);
    }
  },
  {
    name: 'link_analysis',
    description:
      'Compute associate-network centrality (degree, weighted degree, Brandes betweenness), identify cut-vertices (articulation points), and rank nodes by composite investigative influence.',
    category: 'analysis',
    version: '1.0.0',
    inputSchema: {
      type: 'object',
      properties: {
        associates: { type: 'array', description: 'Associate nodes with links and tie strength' }
      },
      required: ['associates']
    },
    outputSchema: { type: 'object', description: 'Ranked node centralities, cut-vertices, and interpretation' },
    handler: async (input) => {
      const { associates } = input as { associates: AssociateInput[] };
      if (!Array.isArray(associates)) throw new Error('associates must be an array');
      return linkAnalysis(associates);
    },
    rateLimit: { maxCalls: 60, windowMs: 60000 }
  },
  {
    name: 'generate_interview_questions',
    description:
      'Generate a structured cognitive-interview question set (Fisher & Geiselman, 1992) covering rapport, open narrative, context reinstatement, varied recall, changed perspective, focused follow-up, and closing.',
    category: 'output',
    version: '1.0.0',
    inputSchema: {
      type: 'object',
      properties: {
        context: { type: 'object', description: 'Interview context (role, event, known facts)' }
      },
      required: ['context']
    },
    outputSchema: { type: 'object', description: 'Cognitive interview plan with phased questions and reliability notes' },
    handler: async (input) => {
      const { context } = input as { context: InterviewContext };
      if (!context?.event_description) throw new Error('context.event_description is required');
      return generateInterviewQuestions(context);
    }
  },
  {
    name: 'check_legal_scope',
    description:
      'Validate a planned investigative action against lawful-scope guardrails: disallowed data sources, private-surveillance prohibition, warrant requirement for positional data, and no-definitive-judgment rule for named individuals.',
    category: 'validation',
    version: '1.0.0',
    inputSchema: {
      type: 'object',
      properties: {
        request: { type: 'object', description: 'Planned action with data sources and lawful-basis flags' }
      },
      required: ['request']
    },
    outputSchema: { type: 'object', description: 'Compliance verdict with violations, warnings, and required action' },
    handler: async (input) => {
      const { request } = input as { request: Parameters<typeof checkLegalScope>[0] };
      return checkLegalScope(request);
    }
  },
  {
    name: 'validate_chain_of_custody',
    description:
      'Verify chain-of-custody continuity for evidence items — each transfer step must chain from the prior custodian to the next, with timestamps and collector identity preserved.',
    category: 'validation',
    version: '1.0.0',
    inputSchema: {
      type: 'object',
      properties: {
        items: { type: 'array', description: 'Custody items with transfer chains' }
      },
      required: ['items']
    },
    outputSchema: { type: 'object', description: 'Continuity validation result with errors and warnings' },
    handler: async (input) => {
      const { items } = input as { items: CustodyItem[] };
      if (!Array.isArray(items)) throw new Error('items must be an array');
      return validateChainOfCustody(items);
    }
  }
];

export function registerInvestigationTools(): void {
  const registry = ToolRegistry.getInstance();
  for (const tool of investigationTools) {
    if (!registry.getTool(tool.name)) registry.register(tool);
  }
}
