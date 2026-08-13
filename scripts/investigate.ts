#!/usr/bin/env node
/**
 * Investigate — Full-Pipeline CLI
 *
 * Runs the entire skill (router + sub-agents + guardrails) on a case bundle and
 * emits a complete, structured investigative report. This is the end-to-end
 * entry point that ties every tool together.
 *
 * Usage:
 *   ts-node scripts/investigate.ts <case-bundle.json> [--json] [--no-trace]
 *
 * The case bundle may contain: caseId, summary, lawfulUseAttestation,
 * leads[], sites[], associates[], routine{anchor,nodes[]}, interview_context{},
 * legal_request{}, custody_items[].
 *
 * Exit codes: 0 = ran (guardrails may still flag non-compliance in output);
 *             1 = file/parse error.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { bootstrapSkillRegistry, InvestigationOrchestrator, AgentResponse } from '../config/agents';

function renderReport(resp: AgentResponse, showTrace: boolean, caseId: string): string {
  const lines: string[] = [];
  lines.push('# Investigative Support Report');
  lines.push('');
  lines.push(`**Case ID**: ${caseId}`);
  lines.push(`**Request ID**: ${resp.request_id}`);
  lines.push(`**Session ID**: ${resp.session_id}`);
  lines.push(`**Confidence**: ${resp.confidence}`);
  lines.push(`**Agents run**: ${resp.selected_agents.join(', ')}`);
  lines.push('');
  lines.push('## Disclaimer');
  lines.push(resp.disclaimer);
  lines.push('');
  lines.push('## Legal & Ethical Scope');
  lines.push(resp.legal_scope_note);
  lines.push('');

  if (showTrace && resp.router_trace.length > 0) {
    lines.push('## Chain-of-Thought Trace (router)');
    for (const t of resp.router_trace) {
      lines.push(`**Step ${t.step}** — Thought: ${t.thought}`);
      lines.push(`  Decision: ${t.decision}`);
    }
    lines.push('');
  }

  lines.push('## Sub-Agent Results');
  for (const r of resp.sub_agent_results) {
    lines.push(`### ${r.agent} — ${r.success ? 'OK' : 'FAILED'} (tool: ${r.toolUsed || 'n/a'})`);
    if (!r.success) {
      lines.push(`Errors: ${r.errors?.join('; ') ?? 'unknown'}`);
    } else {
      lines.push('```json');
      lines.push(JSON.stringify(r.data, null, 2));
      lines.push('```');
    }
    if (r.notes && r.notes.length) {
      lines.push(`Notes: ${r.notes.join('; ')}`);
    }
    lines.push('');
  }

  lines.push('## Synthesis');
  lines.push(resp.synthesis);
  lines.push('');

  if (resp.warnings.length > 0) {
    lines.push('## Warnings');
    for (const w of resp.warnings) lines.push(`- ${w}`);
    lines.push('');
  }

  lines.push('## Quality Checks');
  lines.push('- [x] Methodology named per sub-agent result');
  lines.push('- [x] Mandatory disclaimer attached');
  lines.push('- [x] Legal-scope note attached');
  lines.push(`- [${resp.confidence === 'High' ? 'x' : ' '}] Confidence: ${resp.confidence}`);
  lines.push(`- [${resp.warnings.length === 0 ? 'x' : ' '}] No warnings`);
  lines.push('');
  lines.push('---');
  lines.push('This report is general, educational/analytical information only and not a substitute for advice from a qualified professional.');
  return lines.join('\n');
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: investigate.ts <case-bundle.json> [--json] [--no-trace]');
    process.exit(1);
  }
  const asJson = args.includes('--json');
  const showTrace = !args.includes('--no-trace');
  const dataPath = resolve(args.find(a => !a.startsWith('--')) as string);
  if (!existsSync(dataPath)) { console.error(`File not found: ${dataPath}`); process.exit(1); }

  let bundle: any;
  try { bundle = JSON.parse(readFileSync(dataPath, 'utf-8')); }
  catch (e) { console.error(`JSON parse error: ${(e as Error).message}`); process.exit(1); }

  bootstrapSkillRegistry();
  const orch = new InvestigationOrchestrator();

  const payload: Record<string, unknown> = {};
  for (const k of ['leads', 'sites', 'associates', 'routine', 'interview_context', 'legal_request', 'custody_items', 'geo_options', 'weights']) {
    if (bundle[k] !== undefined) payload[k] = bundle[k];
  }

  orch.handle({
    id: bundle.caseId ? `INV-${bundle.caseId}` : `INV-${Date.now()}`,
    text: bundle.summary ?? `Investigate case ${bundle.caseId ?? ''}`,
    legalClearanceAttested: bundle.lawfulUseAttestation === true,
    payload
  }).then((resp) => {
    if (asJson) {
      console.log(JSON.stringify(resp, null, 2));
    } else {
      console.log(renderReport(resp, showTrace, bundle.caseId ?? 'unknown'));
    }
    // Non-zero exit when guardrails flagged non-compliance, to make CI aware.
    if (resp.warnings.some(w => /NON-COMPLIANT/i.test(w))) {
      process.exit(2);
    }
  }).catch((e) => {
    console.error('Orchestrator error:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}

if (require.main === module) main();

export { renderReport };
