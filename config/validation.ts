/**
 * JSON-Schema validation using ajv + ajv-formats.
 *
 * Compiles the configuration schema (config/schema.json) and per-tool input
 * schemas, with strict validation and helpful error reporting. Replaces the
 * previous hand-rolled shape checks for production-grade rigor.
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Logger } from './index';

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string; keyword?: string }>;
}

export class JsonValidator {
  private static instance: JsonValidator | null = null;
  private ajv: Ajv;
  private configValidator: ValidateFunction | null = null;
  private toolValidators: Map<string, ValidateFunction> = new Map();
  private logger = Logger.getInstance();

  private constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: true, coerceTypes: false, useDefaults: true });
    addFormats(this.ajv);
    this.loadConfigSchema();
  }

  static getInstance(): JsonValidator {
    if (!JsonValidator.instance) JsonValidator.instance = new JsonValidator();
    return JsonValidator.instance;
  }

  private loadConfigSchema(): void {
    const schemaPath = resolve(__dirname, 'schema.json');
    try {
      if (existsSync(schemaPath)) {
        const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
        this.configValidator = this.ajv.compile(schema);
      } else {
        this.logger.warn(`Config schema not found at ${schemaPath}; config validation disabled`);
      }
    } catch (err) {
      this.logger.warn('Failed to load config schema; config validation disabled', {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  validateConfig(obj: unknown): ValidationResult {
    if (!this.configValidator) return { valid: true, errors: [] };
    const ok = this.configValidator(obj);
    if (ok) return { valid: true, errors: [] };
    return { valid: false, errors: this.formatErrors(this.configValidator.errors ?? []) };
  }

  /** Compile and cache a tool input schema, then validate an input against it. */
  validateToolInput(toolName: string, schema: object, input: unknown): ValidationResult {
    let validator = this.toolValidators.get(toolName);
    if (!validator) {
      try {
        validator = this.ajv.compile(schema as any);
        this.toolValidators.set(toolName, validator);
      } catch (err) {
        // If the schema itself fails to compile, fall back to permissive validation
        // but log loudly — a malformed tool schema is a developer error.
        this.logger.error(`Tool ${toolName} schema failed to compile`, {
          error: err instanceof Error ? err.message : String(err)
        });
        return { valid: true, errors: [] };
      }
    }
    const ok = validator(input);
    if (ok) return { valid: true, errors: [] };
    return { valid: false, errors: this.formatErrors(validator.errors ?? []) };
  }

  private formatErrors(errors: ErrorObject[]): Array<{ path: string; message: string; keyword?: string }> {
    return errors.map(e => ({
      path: e.instancePath ? e.instancePath.replace(/^\//, '').replace(/\//g, '.') : 'root',
      message: e.message ?? e.keyword,
      keyword: e.keyword
    }));
  }

  /** Compile an arbitrary schema once and validate (used by scripts/validate.ts). */
  validateAgainstSchema(name: string, schema: object, input: unknown): ValidationResult {
    return this.validateToolInput(name, schema, input);
  }
}
