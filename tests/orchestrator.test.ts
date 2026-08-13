import { test } from 'node:test';
import assert from 'node:assert';
import { bootstrapSkillRegistry, InvestigationOrchestrator, SkillRegistry } from '../config/agents';
import { LeadInput, AssociateInput } from '../config/tools';

test('bootstrapSkillRegistry registers all six sub-agents', () => {
  bootstrapSkillRegistry();
  const reg = SkillRegistry.getInstance();
  const roles = ['lead_orchestrator', 'geo_profiler', 'behavioral_analyst', 'network_analyst', 'interview_planner', 'legal_guardrail'];
  for (const role of roles) {
    assert.ok(reg.get(role as any), `missing skill ${role}`);
  }
});

test('SkillRegistry.resolveByText matches expected triggers', () => {
  bootstrapSkillRegistry();
  const reg = SkillRegistry.getInstance();
  const m = reg.resolveByText('help me prioritize these leads');
  assert.ok(m.includes('lead_orchestrator'));
  const m2 = reg.resolveByText('map the suspect associates and connections');
  assert.ok(m2.includes('network_analyst'));
  const m3 = reg.resolveByText('where should I search for the anchor point');
  assert.ok(m3.includes('geo_profiler'));
});

test('orchestrator handles a compliant lead+network request and attaches disclaimer', async () => {
  bootstrapSkillRegistry();
  const orch = new InvestigationOrchestrator();
  const resp = await orch.handle({
    id: 'R1',
    text: 'Prioritize leads and map associates.',
    legalClearanceAttested: true,
    payload: {
      leads: [
        { id: 'L1', description: 'witness', source: 'lawfully-obtained-witness-statements', source_reliability: 'Medium', proximity: 0.8, temporal_recency: 0.8, corroborating_items: 1, actionability: 0.7 } as LeadInput
      ],
      associates: [
        { id: 'A1', links: ['A2'], strength: 0.8 } as AssociateInput,
        { id: 'A2', links: ['A1'], strength: 0.8 } as AssociateInput
      ]
    }
  });
  assert.ok(resp.selected_agents.includes('lead_orchestrator'));
  assert.ok(resp.selected_agents.includes('network_analyst'));
  assert.ok(resp.disclaimer.length > 50);
  assert.ok(resp.legal_scope_note.length > 20);
  const lead = resp.sub_agent_results.find(r => r.agent === 'lead_orchestrator');
  assert.ok(lead && lead.success, 'lead_orchestrator should succeed');
});

test('orchestrator lowers confidence to Low on legal non-compliance', async () => {
  bootstrapSkillRegistry();
  const orch = new InvestigationOrchestrator();
  const resp = await orch.handle({
    id: 'R2',
    text: 'check legality of tracking the subject',
    legalClearanceAttested: false,
    payload: {
      legal_request: {
        planned_action: 'private surveillance: stalk the subject',
        data_sources: ['unauthorized-location-tracking', 'stolen-data'],
        involves_positional_data: true,
        has_warrant_or_lawful_basis: false,
        target_is_named_individual: true
      }
    }
  });
  assert.strictEqual(resp.confidence, 'Low');
  assert.ok(resp.warnings.some(w => /NON-COMPLIANT/i.test(w)));
});

test('orchestrator router trace is emitted when include_chain_of_thought is true', async () => {
  bootstrapSkillRegistry();
  const orch = new InvestigationOrchestrator();
  const resp = await orch.handle({ id: 'R3', text: 'organize my leads', payload: { leads: [{ id: 'L1', description: 'x', source: 'court-records', source_reliability: 'High', proximity: 0.5, temporal_recency: 0.5, corroborating_items: 1, actionability: 0.5 } as LeadInput] } });
  assert.ok(resp.router_trace.length > 0);
  assert.ok(resp.selected_agents.length > 0);
});
