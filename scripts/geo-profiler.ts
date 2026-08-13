#!/usr/bin/env node
/**
 * Geographic Profiler (conceptual Rossmo CGT surface)
 *
 * Usage:
 *   ts-node scripts/geo-profiler.ts <offenses-file.json> [--json] [--routine <routine.json>]
 *
 * Reads a JSON array of OffenseSiteInput items and prints a geographic profile
 * (top candidate anchor cells + estimated anchor). With --routine, runs Routine
 * Activity Theory convergence analysis instead (requires routine.json with
 * { anchor, nodes }).
 *
 * Exit codes: 0 = success, 1 = error
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { geographicProfile, routineActivityAnalysis, OffenseSiteInput } from '../config/tools';

function printMarkdownProfile(result: Awaited<ReturnType<typeof geographicProfile>>): void {
  console.log('# Geographic Profile (conceptual Rossmo CGT)\n');
  console.log(`Parameters: buffer_zone_km=${result.parameters.bufferZoneKm}, decay_constant_km=${result.parameters.decayConstantKm}, grid_cell_km=${result.parameters.gridCellKm}\n`);
  if (result.estimatedAnchor) {
    console.log(`**Estimated anchor (weighted centroid of top-10 cells):** lat ${result.estimatedAnchor.lat}, lon ${result.estimatedAnchor.lon}\n`);
  }
  if (result.envelope) {
    console.log(`Envelope: lat [${result.envelope.minLat}, ${result.envelope.maxLat}], lon [${result.envelope.minLon}, ${result.envelope.maxLon}]\n`);
  }
  console.log('## Top Candidate Anchor Cells\n');
  console.log('| Rank | Lat | Lon | Raw score | Normalized | Band |');
  console.log('|------|-----|-----|-----------|------------|------|');
  result.topCells.forEach((c, i) => {
    console.log(`| ${i + 1} | ${c.lat} | ${c.lon} | ${c.rawScore.toFixed(6)} | ${c.normalizedScore.toFixed(4)} | ${c.priorityBand} |`);
  });
  console.log(`\n_Total candidate cells generated: ${result.cells.length} (capped at 200 for portability)._`);
}

function printMarkdownRat(result: ReturnType<typeof routineActivityAnalysis>): void {
  console.log('# Routine Activity Analysis (Cohen & Felson)\n');
  console.log(`${result.interpretation}\n`);
  console.log('## Top Risk Zones\n');
  console.log('| Rank | Node ID | Label | Distance to anchor (km) | Guardian gap | Risk score |');
  console.log('|------|---------|-------|-------------------------|--------------|------------|');
  result.topRiskZones.forEach((z, i) => {
    console.log(`| ${i + 1} | ${z.nodeId} | ${z.label ?? '-'} | ${z.distanceKm.toFixed(2)} | ${z.guardianGap.toFixed(2)} | ${z.riskScore.toFixed(4)} |`);
  });
  console.log('\n## All Convergence Points\n');
  console.log('| Node ID | Label | Distance (km) | Guardian gap | Risk score |');
  console.log('|---------|-------|---------------|--------------|------------|');
  for (const z of result.convergencePoints) {
    console.log(`| ${z.nodeId} | ${z.label ?? '-'} | ${z.distanceKm.toFixed(2)} | ${z.guardianGap.toFixed(2)} | ${z.riskScore.toFixed(4)} |`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: geo-profiler.ts <offenses-file.json> [--json] [--routine <routine.json>]');
    process.exit(1);
  }
  const asJson = args.includes('--json');
  const routineIdx = args.indexOf('--routine');
  const routineFile = routineIdx >= 0 ? args[routineIdx + 1] : undefined;
  const dataPath = resolve(args.find(a => !a.startsWith('--') && a !== routineFile) as string);

  if (!existsSync(dataPath)) { console.error(`File not found: ${dataPath}`); process.exit(1); }

  let sites: OffenseSiteInput[];
  try { sites = JSON.parse(readFileSync(dataPath, 'utf-8')); }
  catch (e) { console.error(`JSON parse error: ${(e as Error).message}`); process.exit(1); }
  if (!Array.isArray(sites)) { console.error('Input must be a JSON array of offense sites.'); process.exit(1); }

  if (routineFile) {
    if (!existsSync(resolve(routineFile))) { console.error(`Routine file not found: ${routineFile}`); process.exit(1); }
    const routine = JSON.parse(readFileSync(resolve(routineFile), 'utf-8'));
    if (!routine?.anchor) { console.error('routine.json must contain an anchor {lat,lon}.'); process.exit(1); }
    const result = routineActivityAnalysis(sites, routine);
    if (asJson) console.log(JSON.stringify(result, null, 2));
    else printMarkdownRat(result);
  } else {
    if (sites.length < 3) console.error('Warning: ≥3 offense sites recommended for a meaningful profile.');
    const result = await geographicProfile(sites);
    if (asJson) console.log(JSON.stringify(result, null, 2));
    else printMarkdownProfile(result);
  }
}

if (require.main === module) main();

export { printMarkdownProfile, printMarkdownRat };
