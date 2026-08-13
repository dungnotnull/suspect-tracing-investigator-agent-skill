# Reference — Cognitive Interview Technique (Fisher & Geiselman)

## Purpose

Draft structured witness/informant interview question sets that maximize
accurate recall and minimize contamination, suitable for sworn investigators
and analysts planning lawful interviews.

## Research Foundation

- R. E. Fisher, R. P. Geiselman (1992). *Memory-Enhancing Techniques for
  Investigative Interviewing*. Charles C. Thomas — the cognitive interview
  (CI) methodology.
- Memon et al. (2010). Meta-analysis of 55 studies — **25-40% increase** in
  correct information retrieved vs. standard interviews.
- E. Loftus (1996); Loftus & Palmer (1974) — the misinformation effect; basis
  for the "do not introduce details the interviewee did not provide" rule.
- C. Bond (2012). "Investigative Interviewing." In *Handbook of Forensic
  Psychology* — structured interview methodology review.
- G. Gudjonsson (2003). *The Psychology of Interrogations and Confessions*.
  Wiley — ethics and reliability considerations in investigative interviewing.

## The Four Core CI Components

1. **Context reinstatement** — mentally return the witness to the scene
   (surroundings, weather, sounds, smells, feelings) before further recall.
2. **Recall everything** — encourage complete recall including trivial
   details; do not interrupt.
3. **Varied recall order** — recount the event in reverse chronological order
   or starting from a different point in time.
4. **Changed perspectives** — describe the event as seen from another
   person's vantage point.

## Operationalization (`generateInterviewQuestions`, `config/tools.ts`)

The tool builds a **phased** question set:

1. **Rapport** — establish voluntary participation, "I don't know" is
   acceptable, baseline communication style.
2. **Open Narrative** — free recall of the event, uninterrupted.
3. **Context Reinstatement** — sensory / environmental reinstatement.
4. **Varied Recall** — reverse-chronological and alternate start-point recall.
5. **Changed Perspective** — viewpoint-shifting prompt.
6. **Focused Follow-Up** — for each `known_facts` entry, an open-ended
   "Tell me more about..." prompt; if no known facts supplied, a generic
   elaboration prompt.
7. **Closing** — summary verification, "anything else", post-interview contact,
   contemporaneous documentation reminder.

The set is capped at `validation.max_interview_questions` (default 40). The
plan also returns `reliability_considerations` (misinformation effect,
confidence ≠ accuracy) and `post_interview_actions` (transcription,
corroboration, re-interview only if new information).

## Procedure

1. Gather interview context: `interviewee_role` (witness / informant /
   associate), `event_description`, optional `known_facts[]`.
2. Run `generate_interview_questions` to produce the phased plan.
3. Adapt the wording to the interviewee; **do not** introduce details not
   offered by the interviewee (misinformation effect).
4. Document contemporaneously; avoid leading questions; record exact wording
   where possible.
5. Cross-check key factual claims against independent evidence before relying
   on them.

## Output Schema (excerpt)

```json
{
  "interviewee_role": "witness",
  "event_description": "the incident at the 4th & Main convenience store on 2026-03-12",
  "methodology": "Cognitive Interview (Fisher & Geiselman, 1992)",
  "components_addressed": [ "Context reinstatement", "Recall everything", "Varied recall order", "Changed perspectives" ],
  "questions": [
    { "phase": "Rapport", "question": "Build rapport with the witness ..." },
    { "phase": "Open Narrative", "question": "Ask the witness to recount everything ..." },
    { "phase": "Focused Follow-Up", "question": "Focused follow-up 1: ask for any additional detail ... related to — the blue sedan." }
  ],
  "reliability_considerations": [ "Avoid leading or suggestive questions; ..." ],
  "post_interview_actions": [ "Transcribe and store the recorded interview per chain-of-custody protocol.", ... ]
}
```

## Pitfalls

- **Interruption**: interrupting the open narrative breaks the recall
  fluency that drives the CI's 25-40% gain.
- **Leading questions**: any "didn't you see..." prompt risks the
  misinformation effect; use "Tell me about..." phrasing.
- **Repeated interviews**: repeated questioning can contaminate memory;
  re-interview only if materially new information emerges.
- **Confidence inflation**: confident recall is not necessarily accurate
  recall; corroborate independently.

## Integration

- Feeds `assets/templates/interview-question-set.md`.
- Pair with **Chain of Custody** to ensure the recorded interview's
  evidentiary integrity.
- Run the `interview_planner` sub-agent via the orchestrator; or call the
  `generate_interview_questions` tool directly.

## Quick Checklist

- [ ] Interviewee's role and event description recorded.
- [ ] All four CI components present in the plan.
- [ ] No leading/suggestive questions.
- [ ] Reliability considerations explicitly listed.
- [ ] Post-interview documentation and corroboration steps scheduled.
- [ ] Voluntary-participation and "I don't know" framing explicit.
- [ ] Disclaimer attached.

---

**Research citation indices** (see RESEARCH-PAPER-KNOWLEDGE-BRAIN.md): #15, #16, #17, #18, #19. Each cited source is applied to a concrete tool, reference, template, or script — see the consolidated mapping table in that file.
