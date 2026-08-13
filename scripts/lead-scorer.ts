#!/usr/bin/env node
/**
 * Lead Prioritization Scorer (weighted MCDA)
 *
 * Usage:
 *   ts-node scripts/lead-scorer.ts <leads-file.json> [--json] [--weights <weights.json>]
 *
 * Reads a JSON array of LeadInput items, applies the weighted-MCDA model, and
 * prints a ranked lead-prioritization matrix (markdown by default, JSON with --json).
 *
 * Exit codes: 0 = success, 1 = error
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { getConfig, LeadCriteriaWeights } from '../config/index';
import { scoreLeads, LeadInput, LeadScoreResult } from '../config/tools';

function printMarkdown(results: LeadScoreResult[], weights: LeadCriteriaWeights): void {
  const w = weights;
  console.log('# Lead Prioritization Matrix\n');
  console.log(`Model: weighted-mcda-v1`);
  console.log(`Weights (normalized): proximity=${w.proximity}, temporal_recency=${w.temporal_recency}, source_reliability=${w.source_reliability}, corroborative_strength=${w.corroborative_strength}, actionability=${w.actionability}\n`);
  console.log('| Rank | ID | Description | Source | Reliability | Weighted | Normalized | Band | Rationale |');
  console.log('|------|----|-------------|--------|-------------|----------|------------|------|-----------|');
  for (const r of results) {
    console.log(`| ${r.rank} | ${r.lead_id} | ${esc(r.description)} | ${esc(r.source)} | ${r.source_reliability} | ${r.weighted_score.toFixed(4)} | ${r.normalized_score.toFixed(4)} | ${r.priority_band} | ${esc(r.rationale)} |`);
  }
  console.log('\n## Component Scores\n');
  console.log('| ID | proximity | temporal | sourceRel | corroboration | actionability |');
  console.log('|----|-----------|----------|-----------|---------------|---------------|');
  for (const r of results) {
    const c = r.component_scores;
    console.log(`| ${r.lead_id} | ${c.proximity.toFixed(2)} | ${c.temporal_recency.toFixed(2)} | ${c.source_reliability.toFixed(2)} | ${c.corroborative_strength.toFixed(2)} | ${c.actionability.toFixed(2)} |`);
  }
}

function esc(s: string): string { return s.replace(/\|/g, '\\|'); }

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: lead-scorer.ts <leads-file.json> [--json] [--weights <weights.json>]');
    process.exit(1);
  }
  const asJson = args.includes('--json');
  const weightsIdx = args.indexOf('--weights');
  const weightsFile = weightsIdx >= 0 ? args[weightsIdx + 1] : undefined;
  const dataPath = resolve(args.find(a => !a.startsWith('--') && a !== weightsFile) as string);

  if (!existsSync(dataPath)) { console.error(`File not found: ${dataPath}`); process.exit(1); }

  let leads: LeadInput[];
  try { leads = JSON.parse(readFileSync(dataPath, 'utf-8')); }
  catch (e) { console.error(`JSON parse error: ${(e as Error).message}`); process.exit(1); }

  if (!Array.isArray(leads)) { console.error('Input must be a JSON array of leads.'); process.exit(1); }

  let weights: Partial<LeadCriteriaWeights> | undefined;
  if (weightsFile) {
    if (!existsSync(resolve(weightsFile))) { console.error(`Weights file not found: ${weightsFile}`); process.exit(1); }
    weights = JSON.parse(readFileSync(resolve(weightsFile), 'utf-8'));
  }

  const cfg = getConfig();
  let results: LeadScoreResult[];
  try { results = scoreLeads(leads, weights); }
  catch (e) { console.error(`Scoring failed: ${(e as Error).message}`); process.exit(1); }

  if (asJson) {
    console.log(JSON.stringify({ model: 'weighted-mcda-v1', weights: cfg.scoring.lead_criteria_weights, ranked_leads: results }, null, 2));
  } else {
    printMarkdown(results, cfg.scoring.lead_criteria_weights);
  }
}

if (require.main === module) main();

export { printMarkdown };
