import { test } from 'node:test';
import assert from 'node:assert';
import { generateInterviewQuestions } from '../config/tools';

test('PEACE model produces the five PEACE phases and is non-coercive', () => {
  const plan = generateInterviewQuestions({
    interviewee_role: 'witness',
    event_description: 'the burglary at 4th & Main',
    known_facts: ['the blue sedan'],
    model: 'peace'
  });
  assert.strictEqual(plan.methodology, 'PEACE Model (Milne & Bull, 1999)');
  const phases = new Set(plan.questions.map(q => q.phase));
  for (const p of ['Planning & Preparation', 'Engage & Explain', 'Account', 'Clarify & Challenge', 'Closure', 'Evaluation']) {
    assert.ok(phases.has(p), `missing PEACE phase ${p}`);
  }
  // PEACE reliability note must mention non-coercive / non-leading
  assert.ok(plan.reliability_considerations.some(r => /non-leading|non-coercive|coercive/i.test(r)));
  // Known-fact probe should reference the fact
  assert.ok(plan.questions.some(q => q.phase === 'Clarify & Challenge' && q.question.includes('blue sedan')));
  assert.ok(plan.questions.length <= 40);
});

test('cognitive model is the default when model is omitted', () => {
  const plan = generateInterviewQuestions({ event_description: 'event X' });
  assert.strictEqual(plan.methodology, 'Cognitive Interview (Fisher & Geiselman, 1992)');
});
