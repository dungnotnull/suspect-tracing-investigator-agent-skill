# Reference — PEACE Interview Model (Milne & Bull)

## Purpose

Alternative, structured, non-coercive interview methodology used by UK
policing. Selectable via `interview.default_model: 'peace'` in
`config/settings.example.json` or `InterviewContext.model: 'peace'` per call.

## Research Foundation

- Milne, R. & Bull, R. (1999). *Investigative Interviewing: Psychology and
  Practice*. Wiley — the PEACE model (Planning, Engage & Explain, Account,
  Clarify & Challenge, Closure, Evaluation).
- G. Gudjonsson (2003). *The Psychology of Interrogations and Confessions*.
  Wiley — ethics/reliability basis for non-coercive interviewing.
- C. Bond (2012). "Investigative Interviewing." In *Handbook of Forensic
  Psychology* — structured interview methodology review.

## The Five PEACE Phases

1. **P — Planning & Preparation** — define objectives and points-to-prove; plan
   open questions and topic order (account → clarify → probe gaps).
2. **E — Engage & Explain** — build rapport; explain purpose, recording, and
   that "I don't know" is acceptable.
3. **A — Account** — obtain a free, uninterrupted first account in the
   interviewee's own words using open prompts.
4. **C — Clarify & Challenge** — clarify ambiguities; probe gaps and
   inconsistencies factually, never as accusations.
5. **C — Closure** — summarise back, invite corrections, explain next steps.
6. **E — Evaluation** — evaluate the product against objectives; record
   reliability considerations and follow-up actions in the case file.

## Operationalization (`generatePeaceInterviewQuestions`, `config/tools.ts`)

The `generateInterviewQuestions` tool dispatches on `InterviewContext.model`
(default `cognitive`). When `peace`, it produces a phased question set covering
all five PEACE stages plus the same reliability considerations and
post-interview actions as the cognitive variant.

## When to Choose PEACE vs. Cognitive

- **Cognitive Interview** (Fisher & Geiselman): maximises witness *recall* —
  best for cooperative witnesses/victims recalling a single event.
- **PEACE**: structured, account-and-probe methodology suited to *suspect* or
  *informant* interviews where managing consistency and challenge matters;
  the UK-policing standard for non-coercive interviewing.

Both share the same reliability guardrails (no leading questions, no
interruption of the free account, confidence ≠ accuracy, chain-of-custody
handling of the recording).

## Legal & Ethical Boundaries

- Conduct only within lawful authority; voluntary participation; no coercion.
- The recorded interview is an evidence item — enter into chain of custody.

---

**Research citation indices** (see `RESEARCH-PAPER-KNOWLEDGE-BRAIN.md`): #15, #18, #19.
