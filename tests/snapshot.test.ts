import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const TS_NODE = resolve(__dirname, '../node_modules/ts-node/dist/bin.js');

function runCli(script: string, args: string[]): string {
  return execSync(`node "${TS_NODE}" ${script} ${args.join(' ')}`, { encoding: 'utf8' });
}

function normalizeMd(s: string): string {
  return s.replace(/\r\n/g, '\n').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').trim();
}

function normalizeInvestigateJson(s: string): string {
  const r = JSON.parse(s);
  const strip = (x: any): any => {
    if (Array.isArray(x)) return x.map(strip);
    if (x && typeof x === 'object') {
      const o: any = {};
      for (const k of Object.keys(x).sort()) {
        if (k === 'session_id' || k === 'request_id' || k === 'timestamp' || k === 'executionTimeMs') continue;
        o[k] = strip(x[k]);
      }
      return o;
    }
    return x;
  };
  return JSON.stringify(strip(r), null, 2);
}

test('lead-scorer CLI markdown matches golden snapshot', () => {
  const actual = normalizeMd(runCli('scripts/lead-scorer.ts', ['examples/sample-leads.json']));
  const golden = normalizeMd(readFileSync(resolve(__dirname, 'golden/lead-scorer.md'), 'utf8'));
  assert.strictEqual(actual, golden, 'lead-scorer markdown output drifted from golden snapshot');
});

test('geo-profiler CLI markdown matches golden snapshot', () => {
  const actual = normalizeMd(runCli('scripts/geo-profiler.ts', ['examples/sample-offenses.json']));
  const golden = normalizeMd(readFileSync(resolve(__dirname, 'golden/geo-profiler.md'), 'utf8'));
  assert.strictEqual(actual, golden, 'geo-profiler markdown output drifted from golden snapshot');
});

test('network-analyzer CLI markdown matches golden snapshot', () => {
  const actual = normalizeMd(runCli('scripts/network-analyzer.ts', ['examples/sample-associates.json']));
  const golden = normalizeMd(readFileSync(resolve(__dirname, 'golden/network-analyzer.md'), 'utf8'));
  assert.strictEqual(actual, golden, 'network-analyzer markdown output drifted from golden snapshot');
});

test('investigate CLI JSON matches golden snapshot (normalized)', () => {
  const actual = normalizeInvestigateJson(runCli('scripts/investigate.ts', ['examples/sample-case.json', '--json']));
  const golden = normalizeInvestigateJson(readFileSync(resolve(__dirname, 'golden/investigate.json'), 'utf8'));
  assert.strictEqual(actual, golden, 'investigate JSON (normalized) drifted from golden snapshot');
});
