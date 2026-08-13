#!/usr/bin/env node
/**
 * Network Analyzer (associate link analysis)
 *
 * Usage:
 *   ts-node scripts/network-analyzer.ts <associates-file.json> [--json]
 *
 * Reads a JSON array of AssociateInput items and prints a ranked link-analysis
 * report (degree, weighted degree, Brandes betweenness, cut-vertices,
 * composite influence score).
 *
 * Exit codes: 0 = success, 1 = error
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { linkAnalysis, AssociateInput } from '../config/tools';

function esc(s: string | undefined): string { return (s ?? '-').replace(/\|/g, '\\|'); }

function printMarkdown(result: ReturnType<typeof linkAnalysis>): void {
  console.log('# Link Analysis — Associate Network\n');
  console.log(`Nodes: ${result.nodeCount} | Edges: ${result.edgeCount} | Cut-vertices: ${result.cutVertices.length}\n`);
  console.log(`${result.interpretation}\n`);
  console.log('## Ranked Nodes (by composite influence)\n');
  console.log('Influence = 0.35·degNorm + 0.35·btwNorm + 0.20·wdNorm + 0.15·cutBonus\n');
  console.log('| Rank | ID | Name | Role | Degree | Weighted degree | Betweenness | Cut-vertex | Influence |');
  console.log('|------|----|------|------|--------|-----------------|-------------|------------|-----------|');
  result.nodes.forEach((n, i) => {
    console.log(`| ${i + 1} | ${n.id} | ${esc(n.name)} | ${esc(n.role)} | ${n.degree} | ${n.weightedDegree.toFixed(2)} | ${n.betweenness.toFixed(2)} | ${n.isCutVertex ? 'YES' : 'no'} | ${n.influenceScore.toFixed(4)} |`);
  });
  if (result.cutVertices.length > 0) {
    console.log('\n## Cut-Vertices (high-value disruption targets)\n');
    for (const id of result.cutVertices) console.log(`- ${id}`);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: network-analyzer.ts <associates-file.json> [--json]');
    process.exit(1);
  }
  const asJson = args.includes('--json');
  const dataPath = resolve(args.find(a => !a.startsWith('--')) as string);
  if (!existsSync(dataPath)) { console.error(`File not found: ${dataPath}`); process.exit(1); }

  let associates: AssociateInput[];
  try { associates = JSON.parse(readFileSync(dataPath, 'utf-8')); }
  catch (e) { console.error(`JSON parse error: ${(e as Error).message}`); process.exit(1); }
  if (!Array.isArray(associates)) { console.error('Input must be a JSON array of associates.'); process.exit(1); }

  const result = linkAnalysis(associates);
  if (asJson) console.log(JSON.stringify(result, null, 2));
  else printMarkdown(result);
}

if (require.main === module) main();

export { printMarkdown };
