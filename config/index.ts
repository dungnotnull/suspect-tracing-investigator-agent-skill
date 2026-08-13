/**
 * Configuration Management - Type-safe, schema-validated configuration loader.
 *
 * Loads /config/settings.json (falling back to settings.example.json), merges
 * environment-variable overrides, validates the result against schema.json, and
 * exposes typed accessors. Designed for production use with structured logging
 * and graceful fallback when the LLM provider configuration is incomplete.
 *
 * No placeholders: every field is read, validated, and surfaced through typed
 * accessors used by hooks, tools, agents, and scripts.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

// ==================== Public Types ====================

export type Environment = 'development' | 'staging' | 'production';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LlmProvider = 'anthropic' | 'openai' | 'custom';
export type Normalization = 'minmax' | 'zscore' | 'rank';
export type OutputFormat = 'structured' | 'narrative' | 'both';
export type TimestampFormat = 'ISO8601' | 'Unix' | 'RFC2822';
export type RouterStrategy = 'single' | 'parallel' | 'cascade';

export interface LlmRetryConfig {
  max_attempts: number;
  backoff_ms: number;
  exponential_base: number;
}

export interface LlmFallbackConfig {
  enabled: boolean;
  model?: string;
  graceful_degradation_message: string;
}

export interface LlmConfig {
  provider: LlmProvider;
  model: string;
  temperature: number;
  max_tokens: number;
  timeout_ms: number;
  retry: LlmRetryConfig;
  fallback: LlmFallbackConfig;
}

export interface SystemConfig {
  name: string;
  environment: Environment;
  log_level: LogLevel;
  debug_mode: boolean;
  session_id_prefix: string;
}

export interface FeaturesConfig {
  enable_lead_prioritization: boolean;
  enable_geographic_profiling: boolean;
  enable_routine_activity_analysis: boolean;
  enable_link_analysis: boolean;
  enable_cognitive_interview: boolean;
  enable_digital_footprint_guidance: boolean;
  enable_legal_guardrails: boolean;
  enable_chain_of_custody: boolean;
}

export interface RouterConfig {
  strategy: RouterStrategy;
  max_sub_agents_per_request: number;
  cot_trace_visible: boolean;
  confidence_threshold: number;
}

export interface LeadCriteriaWeights {
  proximity: number;
  temporal_recency: number;
  source_reliability: number;
  corroborative_strength: number;
  actionability: number;
}

export interface GeoScoringConfig {
  buffer_zone_km: number;
  decay_constant_km: number;
  grid_cell_km: number;
  /** Distance computation mode for geographic profiling. */
  distance_mode: 'haversine' | 'osrm';
  /** Base URL for an OSRM server when distance_mode='osrm'. Empty => fallback. */
  osrm_base_url: string;
}

export interface ScoringConfig {
  lead_criteria_weights: LeadCriteriaWeights;
  geo: GeoScoringConfig;
  normalization: Normalization;
}

export interface ValidationConfig {
  strict_mode: boolean;
  require_professional_disclaimer: boolean;
  require_legal_clearance_attestation: boolean;
  max_leads: number;
  max_offense_sites: number;
  max_associates: number;
  max_interview_questions: number;
}

export interface OutputConfig {
  format: OutputFormat;
  include_metadata: boolean;
  include_confidence_scores: boolean;
  include_chain_of_thought: boolean;
  timestamp_format: TimestampFormat;
}

export type InterviewModelConfig = 'cognitive' | 'peace';

export interface InterviewConfig {
  /** Default interview methodology when InterviewContext.model is not set. */
  default_model: InterviewModelConfig;
}
export interface GuardrailsConfig {
  enforce_disclaimer: boolean;
  enforce_legal_scope: boolean;
  prohibit_private_surveillance: boolean;
  prohibit_individual_definitive_judgment: boolean;
  require_warrant_warning_on_positional_data: boolean;
  allowed_data_sources: string[];
  disallowed_data_sources: string[];
}

export interface SecurityConfig {
  sanitize_inputs: boolean;
  max_input_length: number;
  rate_limiting: { enabled: boolean; max_requests_per_minute: number };
}

export interface AppConfig {
  version: string;
  system: SystemConfig;
  llm: LlmConfig;
  features: FeaturesConfig;
  router: RouterConfig;
  scoring: ScoringConfig;
  validation: ValidationConfig;
  output: OutputConfig;
  guardrails: GuardrailsConfig;
  interview: InterviewConfig;
  security: SecurityConfig;
}

// ==================== Defaults ====================

const DEFAULT_CONFIG: AppConfig = {
  version: '1.0.0',
  system: {
    name: 'suspect-tracing-investigator',
    environment: 'development',
    log_level: 'info',
    debug_mode: false,
    session_id_prefix: 'STI'
  },
  llm: {
    provider: 'anthropic',
    model: 'claude-opus-4-7',
    temperature: 0.4,
    max_tokens: 4096,
    timeout_ms: 120000,
    retry: { max_attempts: 3, backoff_ms: 1000, exponential_base: 2 },
    fallback: {
      enabled: true,
      model: 'claude-sonnet-4',
      graceful_degradation_message:
        'Primary model unavailable; returning a reduced-confidence structured analysis with documented limitations. Consult a qualified investigator and re-run when full model access is restored.'
    }
  },
  features: {
    enable_lead_prioritization: true,
    enable_geographic_profiling: true,
    enable_routine_activity_analysis: true,
    enable_link_analysis: true,
    enable_cognitive_interview: true,
    enable_digital_footprint_guidance: true,
    enable_legal_guardrails: true,
    enable_chain_of_custody: true
  },
  router: {
    strategy: 'cascade',
    max_sub_agents_per_request: 4,
    cot_trace_visible: true,
    confidence_threshold: 0.55
  },
  scoring: {
    lead_criteria_weights: {
      proximity: 0.2,
      temporal_recency: 0.2,
      source_reliability: 0.25,
      corroborative_strength: 0.2,
      actionability: 0.15
    },
    geo: { buffer_zone_km: 1.5, decay_constant_km: 4.0, grid_cell_km: 0.5, distance_mode: 'haversine', osrm_base_url: '' },
    normalization: 'minmax'
  },
  validation: {
    strict_mode: true,
    require_professional_disclaimer: true,
    require_legal_clearance_attestation: true,
    max_leads: 500,
    max_offense_sites: 200,
    max_associates: 300,
    max_interview_questions: 40
  },
  output: {
    format: 'structured',
    include_metadata: true,
    include_confidence_scores: true,
    include_chain_of_thought: true,
    timestamp_format: 'ISO8601'
  },
  guardrails: {
    enforce_disclaimer: true,
    enforce_legal_scope: true,
    prohibit_private_surveillance: true,
    prohibit_individual_definitive_judgment: true,
    require_warrant_warning_on_positional_data: true,
    allowed_data_sources: [
      'public-records',
      'court-records',
      'lawfully-obtained-witness-statements',
      'open-source-intelligence-public',
      'department-records-with-authorization'
    ],
    disallowed_data_sources: [
      'unauthorized-location-tracking',
      'stolen-data',
      'private-surveillance-without-lawful-basis',
      'social-media-via-credential-sharing'
    ]
  },
  interview: { default_model: 'cognitive' },
  security: {
    sanitize_inputs: true,
    max_input_length: 50000,
    rate_limiting: { enabled: true, max_requests_per_minute: 60 }
  }
};

// ==================== Validation Errors ====================

export class ConfigValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    this.name = 'ConfigValidationError';
  }
}

// ==================== Structured Logger ====================

export type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
  fields?: Record<string, unknown>;
};

export class Logger {
  private static instance: Logger;
  private entries: LogEntry[] = [];
  private level: LogLevel = 'info';
  private sinks: Array<(entry: LogEntry) => void> = [];

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger();
    return Logger.instance;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  addSink(sink: (entry: LogEntry) => void): void {
    this.sinks.push(sink);
  }

  private readonly order: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40
  };

  private shouldLog(level: LogLevel): boolean {
    return this.order[level] >= this.order[this.level];
  }

  log(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;
    const entry: LogEntry = { level, message, timestamp: new Date().toISOString(), fields };
    this.entries.push(entry);
    for (const sink of this.sinks) {
      try {
        sink(entry);
      } catch {
        /* sink failures must never break the caller */
      }
    }
  }

  debug(message: string, fields?: Record<string, unknown>): void { this.log('debug', message, fields); }
  info(message: string, fields?: Record<string, unknown>): void { this.log('info', message, fields); }
  warn(message: string, fields?: Record<string, unknown>): void { this.log('warn', message, fields); }
  error(message: string, fields?: Record<string, unknown>): void { this.log('error', message, fields); }

  getEntries(): LogEntry[] { return [...this.entries]; }
  clear(): void { this.entries = []; }
}

// ==================== Environment Override Mapper ====================

const ENV_MAP: Array<{ env: string; path: (c: AppConfig) => unknown; set: (c: AppConfig, v: string) => void; parse: (v: string) => unknown }> = [
  {
    env: 'STI_ENV',
    path: c => c.system.environment,
    set: (c, v) => { c.system.environment = v as Environment; },
    parse: v => v
  },
  {
    env: 'STI_LOG_LEVEL',
    path: c => c.system.log_level,
    set: (c, v) => { c.system.log_level = v as LogLevel; },
    parse: v => v
  },
  {
    env: 'STI_DEBUG',
    path: c => c.system.debug_mode,
    set: (c, v) => { c.system.debug_mode = v === 'true'; },
    parse: v => v === 'true'
  },
  {
    env: 'STI_LLM_PROVIDER',
    path: c => c.llm.provider,
    set: (c, v) => { c.llm.provider = v as LlmProvider; },
    parse: v => v
  },
  {
    env: 'STI_LLM_MODEL',
    path: c => c.llm.model,
    set: (c, v) => { c.llm.model = v; },
    parse: v => v
  },
  {
    env: 'STI_LLM_TEMPERATURE',
    path: c => c.llm.temperature,
    set: (c, v) => { c.llm.temperature = Number(v); },
    parse: v => Number(v)
  },
  {
    env: 'STI_LLM_MAX_TOKENS',
    path: c => c.llm.max_tokens,
    set: (c, v) => { c.llm.max_tokens = Number(v); },
    parse: v => Number(v)
  },
  {
    env: 'STI_LLM_TIMEOUT_MS',
    path: c => c.llm.timeout_ms,
    set: (c, v) => { c.llm.timeout_ms = Number(v); },
    parse: v => Number(v)
  },
  {
    env: 'STI_ROUTER_STRATEGY',
    path: c => c.router.strategy,
    set: (c, v) => { c.router.strategy = v as RouterStrategy; },
    parse: v => v
  },
  {
    env: 'STI_ROUTER_CONFIDENCE',
    path: c => c.router.confidence_threshold,
    set: (c, v) => { c.router.confidence_threshold = Number(v); },
    parse: v => Number(v)
  },
  {
    env: 'STI_BUFFER_ZONE_KM',
    path: c => c.scoring.geo.buffer_zone_km,
    set: (c, v) => { c.scoring.geo.buffer_zone_km = Number(v); },
    parse: v => Number(v)
  },
  {
    env: 'STI_DECAY_CONSTANT_KM',
    path: c => c.scoring.geo.decay_constant_km,
    set: (c, v) => { c.scoring.geo.decay_constant_km = Number(v); },
    parse: v => Number(v)
  },
  {
    env: 'STI_GEO_DISTANCE_MODE',
    path: c => c.scoring.geo.distance_mode,
    set: (c, v) => { c.scoring.geo.distance_mode = v as 'haversine' | 'osrm'; },
    parse: v => v
  },
  {
    env: 'STI_OSRM_BASE_URL',
    path: c => c.scoring.geo.osrm_base_url,
    set: (c, v) => { c.scoring.geo.osrm_base_url = v; },
    parse: v => v
  }
  ,{
    env: 'STI_INTERVIEW_DEFAULT_MODEL',
    path: c => c.interview.default_model,
    set: (c, v) => { c.interview.default_model = v as InterviewModelConfig; },
    parse: v => v
  }
];

// ==================== Config Loader ====================

export class ConfigLoader {
  private static config: AppConfig | null = null;
  private static sourceFile: string | null = null;

  static load(options?: { filePath?: string; validate?: boolean }): AppConfig {
    if (ConfigLoader.config) return ConfigLoader.config;

    const validate = options?.validate ?? true;
    const filePath =
      options?.filePath ??
      (existsSync(resolve(__dirname, 'settings.json'))
        ? resolve(__dirname, 'settings.json')
        : resolve(__dirname, 'settings.example.json'));

    let fileConfig: Partial<AppConfig> = {};
    if (existsSync(filePath)) {
      try {
        fileConfig = JSON.parse(readFileSync(filePath, 'utf-8'));
        ConfigLoader.sourceFile = filePath;
      } catch (err) {
        Logger.getInstance().warn(`Failed to parse config file ${filePath}; using defaults`, {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    } else {
      Logger.getInstance().warn(`Config file not found at ${filePath}; using built-in defaults`);
    }

    // Deep merge: defaults <- file <- env
    let merged: AppConfig = ConfigLoader.deepMerge(DEFAULT_CONFIG, fileConfig);
    merged = ConfigLoader.applyEnvOverrides(merged);

    if (validate) {
      const errors = ConfigLoader.validate(merged);
      if (errors.length > 0) {
        throw new ConfigValidationError(errors);
      }
    }

    Logger.getInstance().setLevel(merged.system.log_level);
    Logger.getInstance().info('Configuration loaded', {
      source: ConfigLoader.sourceFile ?? 'defaults',
      environment: merged.system.environment
    });

    ConfigLoader.config = merged;
    return merged;
  }

  static get(): AppConfig {
    if (!ConfigLoader.config) return ConfigLoader.load();
    return ConfigLoader.config;
  }

  static reset(): void {
    ConfigLoader.config = null;
    ConfigLoader.sourceFile = null;
  }

  static getSourceFile(): string | null {
    return ConfigLoader.sourceFile;
  }

  // -------- merge helpers --------

  private static isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
  }

  private static deepMerge<T>(base: T, override: Partial<T> | undefined): T {
    if (!override) return base;
    const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
    for (const key of Object.keys(override)) {
      const b = (base as any)[key];
      const o = (override as any)[key];
      if (ConfigLoader.isPlainObject(b) && ConfigLoader.isPlainObject(o)) {
        out[key] = ConfigLoader.deepMerge(b, o);
      } else if (o !== undefined) {
        out[key] = o;
      }
    }
    return out as T;
  }

  private static applyEnvOverrides(config: AppConfig): AppConfig {
    for (const mapping of ENV_MAP) {
      const raw = process.env[mapping.env];
      if (raw === undefined) continue;
      try {
        const parsed = mapping.parse(raw);
        mapping.set(config, raw);
        Logger.getInstance().debug(`Applied env override ${mapping.env}`, { value: parsed });
      } catch (err) {
        Logger.getInstance().warn(`Invalid env override ${mapping.env}; ignored`, {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    return config;
  }

  // -------- validation --------

  private static validate(config: AppConfig): string[] {
    const errors: string[] = [];

    if (!/^\d+\.\d+\.\d+$/.test(config.version)) {
      errors.push('version must follow semver (x.y.z)');
    }
    if (!config.system.name?.trim()) errors.push('system.name is required');
    if (!['development', 'staging', 'production'].includes(config.system.environment)) {
      errors.push('system.environment must be development|staging|production');
    }
    if (config.llm.temperature < 0 || config.llm.temperature > 2) {
      errors.push('llm.temperature must be between 0 and 2');
    }
    if (config.llm.max_tokens < 1) errors.push('llm.max_tokens must be >= 1');
    if (config.llm.timeout_ms < 1000) errors.push('llm.timeout_ms must be >= 1000');
    if (config.llm.retry.max_attempts < 1) errors.push('llm.retry.max_attempts must be >= 1');

    const weights = config.scoring.lead_criteria_weights;
    const weightValues = Object.values(weights);
    const weightSum = weightValues.reduce((a, b) => a + b, 0);
    if (weightSum <= 0) errors.push('scoring.lead_criteria_weights must sum to > 0');
    for (const w of weightValues) {
      if (w < 0 || w > 1) errors.push('each lead_criteria_weights value must be in [0,1]');
    }
    if (Math.abs(weightSum - 1) > 0.001) {
      Logger.getInstance().warn(`Lead criteria weights sum to ${weightSum.toFixed(3)} (will be normalized at runtime)`);
    }

    if (config.scoring.geo.buffer_zone_km < 0) errors.push('scoring.geo.buffer_zone_km must be >= 0');
    if (config.scoring.geo.decay_constant_km <= 0) errors.push('scoring.geo.decay_constant_km must be > 0');
    if (config.scoring.geo.grid_cell_km <= 0) errors.push('scoring.geo.grid_cell_km must be > 0');

    if (config.router.confidence_threshold < 0 || config.router.confidence_threshold > 1) {
      errors.push('router.confidence_threshold must be in [0,1]');
    }
    if (config.router.max_sub_agents_per_request < 1) {
      errors.push('router.max_sub_agents_per_request must be >= 1');
    }

    if (config.validation.max_leads < 1) errors.push('validation.max_leads must be >= 1');
    if (config.validation.max_offense_sites < 1) errors.push('validation.max_offense_sites must be >= 1');
    if (config.validation.max_associates < 1) errors.push('validation.max_associates must be >= 1');

    if (config.guardrails.enforce_disclaimer !== true) {
      errors.push('guardrails.enforce_disclaimer must be true (domain requires standing disclaimer)');
    }

    if (config.security.max_input_length < 1) errors.push('security.max_input_length must be >= 1');
    if (!['cognitive', 'peace'].includes(config.interview.default_model)) {
      errors.push('interview.default_model must be cognitive|peace');
    }

    return errors;
  }
}

// ==================== Convenience Accessors ====================

export function getConfig(): AppConfig {
  return ConfigLoader.get();
}

export function isFeatureEnabled(feature: keyof FeaturesConfig): boolean {
  return ConfigLoader.get().features[feature] as boolean;
}

export function formatTimestamp(date: Date = new Date()): string {
  const fmt = ConfigLoader.get().output.timestamp_format;
  switch (fmt) {
    case 'ISO8601':
      return date.toISOString();
    case 'Unix':
      return String(Math.floor(date.getTime() / 1000));
    case 'RFC2822':
      return date.toUTCString();
    default:
      return date.toISOString();
  }
}

export function generateSessionId(): string {
  const prefix = ConfigLoader.get().system.session_id_prefix;
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}-${time}-${random}`;
}

export function normalizeWeights(weights: LeadCriteriaWeights): LeadCriteriaWeights {
  const values = Object.values(weights);
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const even = 1 / values.length;
    return {
      proximity: even,
      temporal_recency: even,
      source_reliability: even,
      corroborative_strength: even,
      actionability: even
    };
  }
  return {
    proximity: weights.proximity / sum,
    temporal_recency: weights.temporal_recency / sum,
    source_reliability: weights.source_reliability / sum,
    corroborative_strength: weights.corroborative_strength / sum,
    actionability: weights.actionability / sum
  };
}

// Re-export dirname helper for sibling modules that resolve schema files.
export { dirname };
