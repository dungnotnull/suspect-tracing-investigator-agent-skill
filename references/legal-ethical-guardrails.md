# Reference — Legal & Ethical Guardrails for Lead-Following

## Purpose

The standing guardrail layer for this skill. Every substantive response must
carry the professional disclaimer and the legal-scope note, and every planned
investigative action must pass `check_legal_scope` before being acted upon.
This reference consolidates jurisdiction-agnostic guardrails; it is **not**
legal advice.

## Research Foundation

- National Research Council (2009). *Strengthening Forensic Science in the
  United States*. National Academies Press — documents the real-world
  consequences of overclaiming and method-overreach in investigations.
- G. Gudjonsson (2003). *The Psychology of Interrogations and Confessions*.
  Wiley — ethics and reliability considerations in investigative practice.
- M. K. Sparrow (1991). "The Application of Network Analysis to Criminal
  Intelligence." *Social Networks* — emphasizes that intelligence validity
  depends on lawful, reliable sourcing.
- R. Innes (2003). *Investigating Murder*. Oxford University Press —
  empirical study of investigative decision processes and the safeguards that
  keep them defensible.

## Standing Rules

These mirror `config/settings.example.json → guardrails` and are enforced by
the `createGuardrailHook` and the `check_legal_scope` tool.

1. **Mandatory disclaimer** — every substantive response makes clear the
   output is general/educational/analytical information, not professional
   advice, and recommends consulting a qualified professional. The
   orchestrator appends the disclaimer automatically.
2. **Enforce legal scope** — only allowed data sources may be used; disallowed
   sources trigger a hard violation.
3. **Prohibit private surveillance / vigilante action** — the skill refuses
   requests whose plan reads as private surveillance, stalking, or vigilante
   conduct.
4. **No definitive judgment on named individuals** — when a target is a named
   individual, output stays at the level of structured reasoning support.
5. **Warrant requirement for positional data** — any planned use of
   location/positional data requires `has_warrant_or_lawful_basis: true`; the
   tool flags a violation otherwise.
6. **Lawful-use attestation** — investigators should attest that this work is
   within a lawful professional investigative authority; the orchestrator
   logs a warning when this is not set.

## Jurisdiction & Warrant Considerations

This skill is **jurisdiction-agnostic**. The guardrails above are general
minimums. Specific warrant requirements, data-access statutes, and
evidentiary rules vary by jurisdiction. **Before acting on any lead that
involves:**

- location/positional data,
- communications metadata,
- financial records,
- protected or third-party personal data,

consult a qualified legal advisor in the relevant jurisdiction. The skill's
`check_legal_scope` tool will *flag* missing lawful basis but cannot *grant* it.

## Operationalization

- **Guardrail hook** (`createGuardrailHook`, `config/hooks.ts`) runs on every
  orchestrator request: it checks `data_sources` against the disallowed list
  and verifies the disclaimer is present in output.
- **`check_legal_scope` tool** — invoked by the `legal_guardrail` sub-agent
  when `payload.legal_request` is supplied; returns a compliance verdict.
- **`validate_chain_of_custody` tool** — invoked when
  `payload.custody_items` is supplied; protects evidentiary integrity.
- The orchestrator always appends the `legal_guardrail` agent in cascade
  strategy when budget allows.

## Output Schema (`check_legal_scope`)

See `references/digital-footprint-lawful-sourcing.md` for the schema excerpt.

## Pitfalls

- **"Lawful basis" inflation**: do not mark
  `has_warrant_or_lawful_basis: true` on the strength of a hunch; require
  documented authority.
- **Guardrail evasion by rewording**: the keyword match in
  `check_legal_scope` is a coarse first filter; do not rely on its absence
  to conclude an action is lawful — apply professional judgment and legal
  review.
- **Cross-jurisdiction data**: data lawful to obtain in one jurisdiction may
  be unlawful to use in another; document the jurisdiction of intended use.

## Integration

- Feeds the "Legal & Ethical Boundaries" section of
  `assets/templates/investigative-action-memo.md` and the disclaimer block in
  every template.
- The orchestrator's `blockedResponse` path returns a structured refusal when
  a guardrail violation is detected, so out-of-scope requests fail safely.

## Quick Checklist

- [ ] Professional disclaimer present in every substantive response.
- [ ] `check_legal_scope` run on every planned action with positional,
      communications, financial, or third-party data.
- [ ] No disallowed data source referenced.
- [ ] Lawful-use attestation recorded for the session.
- [ ] No definitive judgment emitted about a named individual.
- [ ] Jurisdiction-specific legal review sought for protected-data actions.

---

**Research citation indices** (see RESEARCH-PAPER-KNOWLEDGE-BRAIN.md): #20, #23, #26, #27, #19. Each cited source is applied to a concrete tool, reference, template, or script — see the consolidated mapping table in that file.
