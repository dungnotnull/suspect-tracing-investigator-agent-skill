#!/usr/bin/env node
/**
 * Data Validation Script
 * Validates investigation data files (leads, offenses, associates, custody,
 * full case bundles) against structural and business-rule checks.
 *
 * Usage:
 *   ts-node scripts/validate.ts <data-file.json> [--quiet]
 *   node scripts/validate.ts  (after build)
 *
 * Exit codes: 0 = valid, 1 = invalid or file error
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import Ajv, { ValidateFunction } from 'ajv';
import { getConfig } from '../config/index';
import {
  LeadInput, OffenseSiteInput, AssociateInput, CustodyItem,
  scoreLeads, geographicProfile, linkAnalysis, validateChainOfCustody
} from '../config/tools';

interface ValidationIssue { path: string; message: string; severity: 'error' | 'warning'; }
interface ValidationReport {
  valid: boolean;
  schema: string;
  errors: ValidationIssue[];
  warnings: string[];
  summary: string;
}

class InvestigationValidator {
  private bundleSchema: any = null;
  private ajv: Ajv | null = null;
  private defValidators: Map<string, ValidateFunction> = new Map();

  constructor() {
    const schemaPath = resolve(__dirname, '../assets/schemas/case-bundle.schema.json');
    try {
      if (existsSync(schemaPath)) {
        this.bundleSchema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
        this.ajv = new Ajv({ allErrors: true, strict: false });
        // Register the bundle schema once (it carries the definitions).
        this.ajv.addSchema(this.bundleSchema, 'bundle');
        // Precompile a validator per definition that references the bundle.
        for (const ref of ['LeadInput', 'OffenseSiteInput', 'AssociateInput', 'CustodyItem']) {
          const compiled = this.ajv.compile({ $ref: `bundle#/definitions/${ref}` }) as any;
          this.defValidators.set(ref, compiled as ValidateFunction);
        }
      }
    } catch { /* schema validation unavailable; business rules still run */ }
  }

  /** Structural (JSON-Schema) validation pass against a definition. */
  private schemaIssues(data: unknown, ref: string): ValidationIssue[] {
    if (!this.bundleSchema) return [];
    const validator = this.defValidators.get(ref);
    if (!validator) return [];
    const items = Array.isArray(data) ? data : [data];
    const issues: ValidationIssue[] = [];
    items.forEach((item, idx) => {
      if (!validator(item)) {
        const errs = validator.errors ?? [];
        for (const e of errs) {
          issues.push({
            path: `schema[${idx}].${e.instancePath ? e.instancePath.replace(/^\//, '').replace(/\//g, '.') : 'root'}`,
            message: `schema: ${e.message ?? e.keyword}`,
            severity: 'error'
          });
        }
      }
    });
    return issues;
  }

  validateLeads(data: unknown): ValidationReport {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const cfg = getConfig();
    const leads = data as LeadInput[];
    if (!Array.isArray(leads)) {
      issues.push({ path: 'root', message: 'expected a JSON array of leads', severity: 'error' });
      issues.push(...this.schemaIssues(data, 'LeadInput'));
    return this.finalize(issues, warnings, 'leads');
    }
    if (leads.length === 0) issues.push({ path: 'root', message: 'leads array is empty', severity: 'error' });
    if (leads.length > cfg.validation.max_leads) {
      issues.push({ path: 'root', message: `leads count ${leads.length} exceeds max ${cfg.validation.max_leads}`, severity: 'error' });
    }
    const ids = new Set<string>();
    leads.forEach((l, i) => {
      const p = `leads[${i}]`;
      if (!l?.id) issues.push({ path: `${p}.id`, message: 'id required', severity: 'error' });
      else if (ids.has(l.id)) issues.push({ path: `${p}.id`, message: `duplicate id ${l.id}`, severity: 'error' });
      else ids.add(l.id);
      if (!l?.description) issues.push({ path: `${p}.description`, message: 'description required', severity: 'error' });
      if (!l?.source) issues.push({ path: `${p}.source`, message: 'source required', severity: 'error' });
      if (!['High', 'Medium', 'Low'].includes(l?.source_reliability)) {
        issues.push({ path: `${p}.source_reliability`, message: 'must be High|Medium|Low', severity: 'error' });
      }
      for (const f of ['proximity', 'temporal_recency', 'actionability'] as const) {
        const v = (l as any)[f];
        if (typeof v !== 'number' || v < 0 || v > 1) {
          issues.push({ path: `${p}.${f}`, message: `${f} must be a number in [0,1]`, severity: 'error' });
        }
      }
      if (typeof l?.corroborating_items !== 'number' || l.corroborating_items < 0) {
        issues.push({ path: `${p}.corroborating_items`, message: 'corroborating_items must be a non-negative integer', severity: 'error' });
      }
      if (l?.captured_at && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(l.captured_at)) {
        issues.push({ path: `${p}.captured_at`, message: 'captured_at must be ISO 8601', severity: 'error' });
      }
    });
    if (leads.length > 0 && issues.filter(i => i.severity === 'error').length === 0) {
      try {
        const result = scoreLeads(leads);
        if (result.length > 0 && result[0].normalized_score < 0.5) {
          warnings.push('Top lead normalized score is below 0.5 — overall lead quality may be weak.');
        }
      } catch (e) {
        warnings.push(`scoreLeads smoke-test failed: ${(e as Error).message}`);
      }
    }
    issues.push(...this.schemaIssues(data, 'LeadInput'));
    return this.finalize(issues, warnings, 'leads');
  }

  async validateOffenses(data: unknown): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const cfg = getConfig();
    const sites = data as OffenseSiteInput[];
    if (!Array.isArray(sites)) {
      issues.push({ path: 'root', message: 'expected a JSON array of offense sites', severity: 'error' });
      issues.push(...this.schemaIssues(data, 'OffenseSiteInput'));
    return this.finalize(issues, warnings, 'offenses');
    }
    if (sites.length === 0) issues.push({ path: 'root', message: 'sites array is empty', severity: 'error' });
    if (sites.length > cfg.validation.max_offense_sites) {
      issues.push({ path: 'root', message: `sites count ${sites.length} exceeds max ${cfg.validation.max_offense_sites}`, severity: 'error' });
    }
    if (sites.length < 3) warnings.push('Geographic profiling works best with ≥3 sites; current count is low.');
    const ids = new Set<string>();
    sites.forEach((s, i) => {
      const p = `sites[${i}]`;
      if (!s?.id) issues.push({ path: `${p}.id`, message: 'id required', severity: 'error' });
      else if (ids.has(s.id)) issues.push({ path: `${p}.id`, message: `duplicate id ${s.id}`, severity: 'error' });
      else ids.add(s.id);
      if (typeof s?.lat !== 'number' || s.lat < -90 || s.lat > 90) {
        issues.push({ path: `${p}.lat`, message: 'lat must be a number in [-90,90]', severity: 'error' });
      }
      if (typeof s?.lon !== 'number' || s.lon < -180 || s.lon > 180) {
        issues.push({ path: `${p}.lon`, message: 'lon must be a number in [-180,180]', severity: 'error' });
      }
      if (s?.timestamp && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s.timestamp)) {
        issues.push({ path: `${p}.timestamp`, message: 'timestamp must be ISO 8601', severity: 'error' });
      }
    });
    if (sites.length >= 3 && issues.filter(i => i.severity === 'error').length === 0) {
      try {
        const result = await geographicProfile(sites);
        if (!result.estimatedAnchor) warnings.push('geographicProfile produced no estimated anchor.');
      } catch (e) {
        warnings.push(`geographicProfile smoke-test failed: ${(e as Error).message}`);
      }
    }
    issues.push(...this.schemaIssues(data, 'OffenseSiteInput'));
    return this.finalize(issues, warnings, 'offenses');
  }

  validateAssociates(data: unknown): ValidationReport {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const cfg = getConfig();
    const associates = data as AssociateInput[];
    if (!Array.isArray(associates)) {
      issues.push({ path: 'root', message: 'expected a JSON array of associates', severity: 'error' });
      issues.push(...this.schemaIssues(data, 'AssociateInput'));
    return this.finalize(issues, warnings, 'associates');
    }
    if (associates.length === 0) issues.push({ path: 'root', message: 'associates array is empty', severity: 'error' });
    if (associates.length > cfg.validation.max_associates) {
      issues.push({ path: 'root', message: `associates count ${associates.length} exceeds max ${cfg.validation.max_associates}`, severity: 'error' });
    }
    const ids = new Set(associates.map(a => a?.id));
    associates.forEach((a, i) => {
      const p = `associates[${i}]`;
      if (!a?.id) issues.push({ path: `${p}.id`, message: 'id required', severity: 'error' });
      if (!Array.isArray(a?.links)) issues.push({ path: `${p}.links`, message: 'links must be an array', severity: 'error' });
      else for (const lnk of a.links) {
        if (!ids.has(lnk)) issues.push({ path: `${p}.links`, message: `link target "${lnk}" not found in associate ids`, severity: 'error' });
      }
      if (a?.strength !== undefined && (a.strength < 0 || a.strength > 1)) {
        issues.push({ path: `${p}.strength`, message: 'strength must be in [0,1]', severity: 'error' });
      }
    });
    if (associates.length > 0 && issues.filter(i => i.severity === 'error').length === 0) {
      try {
        const result = linkAnalysis(associates);
        if (result.nodeCount > 0 && result.nodes[0].influenceScore < 0.2) {
          warnings.push('Top associate influence score is low — network may be sparse or uniformly connected.');
        }
      } catch (e) {
        warnings.push(`linkAnalysis smoke-test failed: ${(e as Error).message}`);
      }
    }
    issues.push(...this.schemaIssues(data, 'AssociateInput'));
    return this.finalize(issues, warnings, 'associates');
  }

  validateCustody(data: unknown): ValidationReport {
    const items = data as CustodyItem[];
    if (!Array.isArray(items)) {
      return this.finalize([{ path: 'root', message: 'expected a JSON array of custody items', severity: 'error' }], [], 'custody');
    }
    const result = validateChainOfCustody(items);
    const issues: ValidationIssue[] = [
      ...result.errors.map(m => ({ path: 'custody', message: m, severity: 'error' as const })),
      ...result.warnings.map(m => ({ path: 'custody', message: m, severity: 'warning' as const }))
    ];
    return this.finalize(issues, [], 'custody');
  }

  async validateCaseBundle(data: any): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    if (!data || typeof data !== 'object') {
      issues.push({ path: 'root', message: 'expected a JSON object', severity: 'error' });
      return this.finalize(issues, warnings, 'case-bundle');
    }
    if (!data.caseId) issues.push({ path: 'caseId', message: 'caseId required', severity: 'error' });
    if (Array.isArray(data.leads)) {
      const r = this.validateLeads(data.leads);
      issues.push(...r.errors.map(e => ({ ...e, path: `leads.${e.path}` })));
      warnings.push(...r.warnings);
    }
    if (Array.isArray(data.sites)) {
      const r = await this.validateOffenses(data.sites);
      issues.push(...r.errors.map(e => ({ ...e, path: `sites.${e.path}` })));
      warnings.push(...r.warnings);
    }
    if (Array.isArray(data.associates)) {
      const r = this.validateAssociates(data.associates);
      issues.push(...r.errors.map(e => ({ ...e, path: `associates.${e.path}` })));
      warnings.push(...r.warnings);
    }
    if (Array.isArray(data.custody_items)) {
      const r = this.validateCustody(data.custody_items);
      issues.push(...r.errors.map(e => ({ ...e, path: `custody_items.${e.path}` })));
      warnings.push(...r.warnings);
    }
    return this.finalize(issues, warnings, 'case-bundle');
  }

  private finalize(issues: ValidationIssue[], warnings: string[], schema: string): ValidationReport {
    const errors = issues.filter(i => i.severity === 'error');
    const allWarnings = [...issues.filter(i => i.severity === 'warning').map(i => i.message), ...warnings];
    const valid = errors.length === 0;
    return {
      valid,
      schema,
      errors: issues,
      warnings: allWarnings,
      summary: valid
        ? `${schema}: valid (${issues.length} issue(s), ${allWarnings.length} warning(s)).`
        : `${schema}: invalid (${errors.length} error(s), ${allWarnings.length} warning(s)).`
    };
  }
}

function detectSchema(data: any): 'leads' | 'offenses' | 'associates' | 'custody' | 'case-bundle' {
  if (Array.isArray(data)) {
    if (data.length === 0) return 'leads';
    const first = data[0];
    if (first && 'links' in first) return 'associates';
    if (first && 'chain' in first) return 'custody';
    if (first && 'lat' in first && 'lon' in first) return 'offenses';
    if (first && 'source_reliability' in first) return 'leads';
    return 'leads';
  }
  if (data && typeof data === 'object' && ('caseId' in data || 'leads' in data || 'sites' in data || 'associates' in data)) {
    return 'case-bundle';
  }
  return 'case-bundle';
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: validate.ts <data-file.json> [--quiet]');
    process.exit(1);
  }
  const quiet = args.includes('--quiet');
  const dataPath = resolve(args[0]);
  if (!existsSync(dataPath)) {
    console.error(`Error: file not found: ${dataPath}`);
    process.exit(1);
  }
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  } catch (e) {
    console.error(`Error parsing JSON: ${(e as Error).message}`);
    process.exit(1);
  }

  const validator = new InvestigationValidator();
  const schema = detectSchema(data as any);
  let report: ValidationReport;
  switch (schema) {
    case 'leads': report = await validator.validateLeads(data); break;
    case 'offenses': report = await validator.validateOffenses(data); break;
    case 'associates': report = await validator.validateAssociates(data); break;
    case 'custody': report = await validator.validateCustody(data); break;
    default: report = await validator.validateCaseBundle(data); break;
  }

  if (!quiet) {
    console.log('\n=== Validation Results ===\n');
    console.log(`Schema: ${report.schema}`);
    console.log(`Valid:  ${report.valid ? 'YES' : 'NO'}`);
    console.log(`Errors: ${report.errors.filter(e => e.severity === 'error').length}`);
    console.log(`Warnings: ${report.warnings.length}\n`);
    if (report.errors.length > 0) {
      console.log('Issues:');
      for (const e of report.errors) console.log(`  [${e.severity}] ${e.path}: ${e.message}`);
      console.log('');
    }
    if (report.warnings.length > 0) {
      console.log('Warnings:');
      for (const w of report.warnings) console.log(`  - ${w}`);
      console.log('');
    }
    console.log(report.summary);
  }
  process.exit(report.valid ? 0 : 1);
}

if (require.main === module) main();

export { InvestigationValidator, ValidationReport, detectSchema };
