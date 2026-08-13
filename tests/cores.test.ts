import { test } from 'node:test';
import assert from 'node:assert';
import {
  scoreLeads, geographicProfile, routineActivityAnalysis, linkAnalysis,
  generateInterviewQuestions, checkLegalScope, validateChainOfCustody,
  haversineKm, rossmoScore, LeadInput, OffenseSiteInput, AssociateInput, CustodyItem
} from '../config/tools';

const leads: LeadInput[] = [
  { id: 'A', description: 'high everything', source: 'court-records', source_reliability: 'High', proximity: 0.9, temporal_recency: 0.9, corroborating_items: 3, actionability: 0.9 },
  { id: 'B', description: 'medium',         source: 'public-records', source_reliability: 'Medium', proximity: 0.5, temporal_recency: 0.5, corroborating_items: 1, actionability: 0.5 },
  { id: 'C', description: 'low',            source: 'lawfully-obtained-witness-statements', source_reliability: 'Low', proximity: 0.2, temporal_recency: 0.1, corroborating_items: 0, actionability: 0.1 }
];

test('scoreLeads ranks high-reliability lead first and assigns P1 band', () => {
  const r = scoreLeads(leads);
  assert.strictEqual(r[0].lead_id, 'A');
  assert.strictEqual(r[0].priority_band, 'P1-High');
  assert.strictEqual(r[r.length - 1].lead_id, 'C');
  assert.strictEqual(r[r.length - 1].priority_band, 'P4-Background');
  assert.strictEqual(r[0].rank, 1);
  assert.strictEqual(r[1].rank, 2);
  assert.strictEqual(r[2].rank, 3);
});

test('scoreLeads normalizes scores to [0,1] with top at 1.0', () => {
  const r = scoreLeads(leads);
  assert.ok(r[0].normalized_score === 1, `expected top normalized 1, got ${r[0].normalized_score}`);
  assert.ok(r.every(x => x.normalized_score >= 0 && x.normalized_score <= 1));
});

test('scoreLeads returns empty array on empty input (tool handler throws; pure core is graceful)', () => {
  assert.deepStrictEqual(scoreLeads([]), []);
});

test('haversineKm matches known distances', () => {
  const d = haversineKm({ lat: 34.0522, lon: -118.2437 }, { lat: 34.0522, lon: -118.2437 });
  assert.ok(Math.abs(d) < 1e-6, 'same point distance ~0');
  // LA to NY ~3935-3957 km; use a coarse tolerance
  const d2 = haversineKm({ lat: 34.0522, lon: -118.2437 }, { lat: 40.7128, lon: -74.006 });
  assert.ok(d2 > 3900 && d2 < 4000, `LA-NY ~3940km, got ${d2}`);
});

test('rossmoScore peaks near the offense cluster, not at a far point', () => {
  const sites: OffenseSiteInput[] = [
    { id: 's1', lat: 34.05, lon: -118.24 },
    { id: 's2', lat: 34.051, lon: -118.241 },
    { id: 's3', lat: 34.049, lon: -118.239 }
  ];
  const near = rossmoScore({ lat: 34.05, lon: -118.24 }, sites, { bufferZoneKm: 1.5, decayConstantKm: 4 });
  const far = rossmoScore({ lat: 34.40, lon: -118.60 }, sites, { bufferZoneKm: 1.5, decayConstantKm: 4 });
  assert.ok(near > far, 'near point should score higher than far point');
});

test('geographicProfile produces estimatedAnchor within the offense envelope', async () => {
  const sites: OffenseSiteInput[] = [
    { id: 's1', lat: 34.051, lon: -118.245 },
    { id: 's2', lat: 34.049, lon: -118.241 },
    { id: 's3', lat: 34.056, lon: -118.238 },
    { id: 's4', lat: 34.0535, lon: -118.247 }
  ];
  const r = await geographicProfile(sites);
  assert.ok(r.cells.length > 0, 'should produce candidate cells');
  assert.ok(r.estimatedAnchor, 'should produce estimated anchor');
  assert.ok(r.estimatedAnchor!.lat >= 34.04 && r.estimatedAnchor!.lat <= 34.06);
  assert.ok(r.estimatedAnchor!.lon >= -118.25 && r.estimatedAnchor!.lon <= -118.23);
  assert.strictEqual(r.topCells[0].normalizedScore, 1);
});

test('geographicProfile handles empty sites gracefully', async () => {
  const r = await geographicProfile([]);
  assert.deepStrictEqual(r.cells, []);
  assert.strictEqual(r.envelope, null);
});

test('routineActivityAnalysis ranks low-guardianship near-site node highest', () => {
  const sites: OffenseSiteInput[] = [{ id: 's1', lat: 34.05, lon: -118.24 }];
  const routine = {
    anchor: { lat: 34.052, lon: -118.242 },
    nodes: [
      { id: 'nLowGuard', lat: 34.0501, lon: -118.2401, guardianStrength: 0.05 },
      { id: 'nHighGuard', lat: 34.0501, lon: -118.2401, guardianStrength: 0.95 }
    ]
  };
  const r = routineActivityAnalysis(sites, routine);
  assert.strictEqual(r.topRiskZones[0].nodeId, 'nLowGuard');
  assert.ok(r.topRiskZones[0].riskScore > r.topRiskZones[1].riskScore);
});

test('linkAnalysis identifies the expected cut-vertex and ranks it highly', () => {
  // Star: A2 center connected to A1,A3,A4; removing A2 isolates the leaves.
  const assoc: AssociateInput[] = [
    { id: 'A1', links: ['A2'], strength: 0.8 },
    { id: 'A2', links: ['A1', 'A3', 'A4'], strength: 0.8 },
    { id: 'A3', links: ['A2'], strength: 0.8 },
    { id: 'A4', links: ['A2'], strength: 0.8 }
  ];
  const r = linkAnalysis(assoc);
  assert.ok(r.cutVertices.includes('A2'), `A2 should be a cut-vertex; got ${r.cutVertices.join(',')}`);
  assert.strictEqual(r.nodes[0].id, 'A2', 'center node should rank first by influence');
  assert.strictEqual(r.edgeCount, 3);
  assert.strictEqual(r.nodeCount, 4);
});

test('linkAnalysis: betweenness is 0 for a leaf node', () => {
  const assoc: AssociateInput[] = [
    { id: 'A1', links: ['A2'], strength: 0.5 },
    { id: 'A2', links: ['A1', 'A3'], strength: 0.5 },
    { id: 'A3', links: ['A2'], strength: 0.5 }
  ];
  const r = linkAnalysis(assoc);
  const leaf = r.nodes.find(n => n.id === 'A1');
  assert.ok(leaf);
  assert.strictEqual(leaf!.betweenness, 0);
});

test('generateInterviewQuestions covers all four CI components and respects cap', () => {
  const plan = generateInterviewQuestions({
    interviewee_role: 'witness',
    event_description: 'the burglary at 4th & Main',
    known_facts: ['the blue sedan', 'the pry marks']
  });
  assert.strictEqual(plan.methodology, 'Cognitive Interview (Fisher & Geiselman, 1992)');
  assert.ok(plan.components_addressed.length === 4);
  const phases = new Set(plan.questions.map(q => q.phase));
  for (const p of ['Rapport', 'Open Narrative', 'Context Reinstatement', 'Varied Recall', 'Changed Perspective', 'Focused Follow-Up', 'Closing']) {
    assert.ok(phases.has(p), `missing phase ${p}`);
  }
  assert.ok(plan.questions.length <= 40);
  // focused follow-ups should reference both known facts
  const followUps = plan.questions.filter(q => q.phase === 'Focused Follow-Up');
  assert.ok(followUps.some(q => q.question.includes('blue sedan')));
  assert.ok(followUps.some(q => q.question.includes('pry marks')));
});

test('checkLegalScope flags disallowed source and missing warrant as non-compliant', () => {
  const r = checkLegalScope({
    planned_action: 'track subject via telco tower dump',
    data_sources: ['unauthorized-location-tracking'],
    involves_positional_data: true,
    has_warrant_or_lawful_basis: false,
    target_is_named_individual: true
  });
  assert.strictEqual(r.compliant, false);
  assert.ok(r.violations.some(v => v.includes('unauthorized-location-tracking')));
  assert.ok(r.violations.some(v => /positional/i.test(v) || /warrant/i.test(v)));
});

test('checkLegalScope passes for lawful OSINT with warning about named individual', () => {
  const r = checkLegalScope({
    planned_action: 'use public OSINT post to identify associates',
    data_sources: ['open-source-intelligence-public'],
    involves_positional_data: false,
    has_warrant_or_lawful_basis: true,
    target_is_named_individual: true
  });
  assert.strictEqual(r.compliant, true);
  assert.ok(r.warnings.some(w => /named individual/i.test(w)));
});

test('validateChainOfCustody detects a continuity break', () => {
  const items: CustodyItem[] = [{
    id: 'E1', collector: 'INV-1', acquired_at: '2026-01-01T00:00:00',
    chain: [
      { from: 'INV-1', to: 'LAB-1', timestamp: '2026-01-01T01:00:00' },
      { from: 'WRONG', to: 'INV-1', timestamp: '2026-01-02T01:00:00' } // break: expected from LAB-1
    ]
  }];
  const r = validateChainOfCustody(items);
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.some(e => /continuity break/i.test(e)));
});

test('validateChainOfCustody passes a clean chain', () => {
  const items: CustodyItem[] = [{
    id: 'E2', collector: 'INV-2', acquired_at: '2026-01-01T00:00:00', storage_location: 'locker-1',
    chain: [
      { from: 'INV-2', to: 'LAB-1', timestamp: '2026-01-01T01:00:00' },
      { from: 'LAB-1', to: 'INV-2', timestamp: '2026-01-02T01:00:00' }
    ]
  }];
  const r = validateChainOfCustody(items);
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.errors.length, 0);
});

test('validateChainOfCustody flags missing collector', () => {
  const r = validateChainOfCustody([{ id: 'E3', collector: '', acquired_at: '2026-01-01T00:00:00', chain: [] }]);
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.some(e => /collector is required/i.test(e)));
});
