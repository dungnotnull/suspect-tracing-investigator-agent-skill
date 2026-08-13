/**
 * Lifecycle & State Management Hooks
 *
 * Provides an EventBus, LifecycleManager, StateMachine for the investigation
 * lifecycle, and reusable hook factories (logging, validation, metrics,
 * guardrail enforcement). These are real, functional implementations used by
 * the router and sub-agents in config/agents.ts.
 */

import { Logger, getConfig } from './index';

// ==================== Event Bus ====================

export type EventHandler = (payload: unknown) => void | Promise<void>;

export interface EventPayload {
  type: string;
  timestamp: string;
  data: unknown;
}

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private history: EventPayload[] = [];
  private maxHistory: number = 1000;

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) EventBus.instance = new EventBus();
    return EventBus.instance;
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  async emit(event: string, data: unknown): Promise<void> {
    const payload: EventPayload = { type: event, timestamp: new Date().toISOString(), data };
    this.history.push(payload);
    if (this.history.length > this.maxHistory) this.history.shift();

    const handlers = this.handlers.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (err) {
        Logger.getInstance().error(`Event handler error for "${event}"`, {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    // Wildcard listeners
    const wildcard = this.handlers.get('*');
    if (wildcard) {
      for (const handler of wildcard) {
        try { await handler(payload); } catch { /* swallow */ }
      }
    }
  }

  getHistory(filter?: string): EventPayload[] {
    return filter ? this.history.filter(e => e.type === filter) : [...this.history];
  }

  clearHistory(): void { this.history = []; }
}

// ==================== Hook Context ====================

export interface HookContext {
  sessionId: string;
  requestId: string;
  agentName?: string;
  toolName?: string;
  phase?: string;
  input?: unknown;
  output?: unknown;
  startTime?: number;
  metadata: Record<string, unknown>;
}

export interface LifecycleHooks {
  beforeExecution?: (context: HookContext, input: unknown) => void | Promise<void>;
  afterExecution?: (context: HookContext, output: unknown) => void | Promise<void>;
  onError?: (context: HookContext, error: Error) => void | Promise<void>;
}

// ==================== Lifecycle Manager ====================

export class LifecycleManager {
  private hooks: LifecycleHooks[] = [];
  private context: HookContext;
  private eventBus: EventBus;

  constructor(context: HookContext) {
    this.context = context;
    this.eventBus = EventBus.getInstance();
  }

  register(hooks: LifecycleHooks): void { this.hooks.push(hooks); }

  getContext(): HookContext { return { ...this.context }; }

  updateContext(updates: Partial<HookContext>): void {
    this.context = { ...this.context, ...updates };
  }

  async beforeExecution(input: unknown): Promise<void> {
    this.context.startTime = Date.now();
    await this.eventBus.emit('lifecycle.execution.starting', this.context);
    for (const hooks of this.hooks) {
      if (hooks.beforeExecution) await hooks.beforeExecution(this.context, input);
    }
  }

  async afterExecution(output: unknown): Promise<void> {
    this.context.output = output;
    for (const hooks of this.hooks) {
      if (hooks.afterExecution) await hooks.afterExecution(this.context, output);
    }
    await this.eventBus.emit('lifecycle.execution.completed', {
      ...this.context,
      durationMs: Date.now() - (this.context.startTime ?? Date.now())
    });
  }

  async onError(error: Error): Promise<void> {
    for (const hooks of this.hooks) {
      if (hooks.onError) await hooks.onError(this.context, error);
    }
    await this.eventBus.emit('lifecycle.execution.error', { ...this.context, error: error.message });
  }
}

// ==================== State Machine ====================

export interface StateDefinition {
  onEnter?: (ctx: HookContext) => Promise<void>;
  onExit?: (ctx: HookContext) => Promise<void>;
  allowedTransitions: string[];
}

export interface StateConfig {
  initialState: string;
  states: Record<string, StateDefinition>;
}

export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
  timestamp: string;
}

export class StateMachine {
  private current: string;
  private readonly config: StateConfig;
  private transitions: StateTransition[] = [];
  private eventBus: EventBus;

  constructor(config: StateConfig) {
    this.config = config;
    this.current = config.initialState;
    this.eventBus = EventBus.getInstance();
  }

  getCurrentState(): string { return this.current; }

  canTransitionTo(next: string): boolean {
    return this.config.states[this.current]?.allowedTransitions.includes(next) ?? false;
  }

  async transitionTo(next: string, trigger: string, ctx?: HookContext): Promise<void> {
    if (!this.canTransitionTo(next)) {
      throw new Error(`Invalid state transition from "${this.current}" to "${next}"`);
    }
    const currentDef = this.config.states[this.current];
    if (currentDef?.onExit && ctx) await currentDef.onExit(ctx);

    const transition: StateTransition = {
      from: this.current,
      to: next,
      trigger,
      timestamp: new Date().toISOString()
    };
    this.current = next;
    this.transitions.push(transition);
    await this.eventBus.emit('state.changed', transition);

    const nextDef = this.config.states[next];
    if (nextDef?.onEnter && ctx) await nextDef.onEnter(ctx);
  }

  getTransitions(): StateTransition[] { return [...this.transitions]; }

  reset(): void { this.current = this.config.initialState; this.transitions = []; }
}

// Investigation lifecycle state machine definition.
export function createInvestigationStateMachine(): StateMachine {
  return new StateMachine({
    initialState: 'intake',
    states: {
      intake: { allowedTransitions: ['lead_organization', 'terminated'] },
      lead_organization: { allowedTransitions: ['geo_behavioral_analysis', 'terminated'] },
      geo_behavioral_analysis: { allowedTransitions: ['network_analysis', 'terminated'] },
      network_analysis: { allowedTransitions: ['interview_planning', 'terminated'] },
      interview_planning: { allowedTransitions: ['legal_review', 'terminated'] },
      legal_review: { allowedTransitions: ['reporting', 'terminated'] },
      reporting: { allowedTransitions: ['terminated'] },
      terminated: { allowedTransitions: [] }
    }
  });
}

// ==================== Hook Factories ====================

export function createLoggingHook(eventNamePrefix: string): LifecycleHooks {
  const bus = EventBus.getInstance();
  const logger = Logger.getInstance();
  return {
    beforeExecution: (ctx, input) => {
      logger.debug(`[${eventNamePrefix}] before`, { sessionId: ctx.sessionId });
      void bus.emit(`${eventNamePrefix}.before`, { context: ctx, input });
    },
    afterExecution: (ctx, output) => {
      logger.debug(`[${eventNamePrefix}] after`, { sessionId: ctx.sessionId });
      void bus.emit(`${eventNamePrefix}.after`, { context: ctx, output });
    },
    onError: (ctx, error) => {
      logger.error(`[${eventNamePrefix}] error`, { sessionId: ctx.sessionId, error: error.message });
      void bus.emit(`${eventNamePrefix}.error`, { context: ctx, error: error.message });
    }
  };
}

export function createValidationHook<T>(
  validator: (input: T) => { valid: boolean; errors: string[] }
): LifecycleHooks {
  return {
    beforeExecution: (_ctx, input) => {
      const result = validator(input as T);
      if (!result.valid) {
        throw new Error(`Validation failed: ${result.errors.join('; ')}`);
      }
    }
  };
}

export function createMetricsHook(metricName: string): LifecycleHooks {
  const bus = EventBus.getInstance();
  let start = 0;
  return {
    beforeExecution: () => {
      start = Date.now();
      void bus.emit('metric.start', { name: metricName, start });
    },
    afterExecution: () => {
      const duration = Date.now() - start;
      void bus.emit('metric.complete', { name: metricName, duration });
    },
    onError: () => {
      const duration = Date.now() - start;
      void bus.emit('metric.failed', { name: metricName, duration });
    }
  };
}

/**
 * Guardrail hook — verifies the standing disclaimer and legal-scope rules are
 * respected on every substantive response. Throws (failing the pipeline) when
 * a guardrail violation is detected, so the router can surface a graceful
 * error instead of emitting an out-of-scope answer.
 */
export function createGuardrailHook(): LifecycleHooks {
  const config = getConfig();
  const logger = Logger.getInstance();
  return {
    beforeExecution: (ctx) => {
      const input = ctx.input as { data_sources?: string[] } | undefined;
      const sources = input?.data_sources ?? [];
      for (const disallowed of config.guardrails.disallowed_data_sources) {
        if (sources.includes(disallowed)) {
          throw new Error(
            `Guardrail violation: data source "${disallowed}" is prohibited. ` +
              `Use only lawful, authorized sources. See references/legal-ethical-guardrails.md.`
          );
        }
      }
      if (config.guardrails.enforce_legal_scope && config.validation.require_legal_clearance_attestation) {
        const attested = (ctx.metadata?.legalClearanceAttested as boolean) ?? false;
        if (!attested) {
          logger.warn('No lawful-use attestation recorded for this request', { sessionId: ctx.sessionId });
        }
      }
    },
    afterExecution: (ctx) => {
      if (!config.guardrails.enforce_disclaimer) return;
      const out = ctx.output as { disclaimerPresent?: boolean } | undefined;
      if (out && out.disclaimerPresent === false) {
        throw new Error('Guardrail violation: professional disclaimer missing from output.');
      }
    }
  };
}
