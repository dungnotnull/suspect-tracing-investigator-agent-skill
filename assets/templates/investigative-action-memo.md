# Investigative Action Memo Template

> Use this memo to record a planned investigative action, its lawful basis, the
> `check_legal_scope` verdict, and the resulting decision. Attach the
> professional disclaimer.

**Memo ID**: [MEMO-ID]
**Case ID**: [CASE-ID]
**Date**: [ISO timestamp]
**Author**: [name / badge]
**Action title**: [short title]

## Disclaimer

This memo is general, educational/analytical information to support lawful
professional investigation. It is not legal advice. Consult a qualified legal
advisor for jurisdiction-specific determination before acting.

## Planned Action

[Concise description of the action — what will be done, against what target,
using what data.]

## Data Sources

| Source | Allowed list? | Lawful basis | Notes |
|--------|---------------|--------------|-------|
| public-records | Yes | [basis] | |
| open-source-intelligence-public | Yes | [basis] | |
| ... | ... | ... | ... |

## Flags

- Involves positional/location data: [Yes / No]
- Has warrant or explicit lawful basis: [Yes / No — cite authority]
- Target is a named individual: [Yes / No]

## `check_legal_scope` Verdict

- **Compliant**: [Yes / No]
- **Violations**: [list]
- **Warnings**: [list]
- **Required action**: [verbatim from tool]

## Decision

- [ ] Proceed (compliant, warnings addressed)
- [ ] Proceed with documented lawful basis (warnings outstanding)
- [ ] Halt — obtain warrant / lawful basis / legal review

## Legal & Ethical Boundaries

- No private surveillance / vigilante action.
- No definitive judgment about named individuals.
- Jurisdiction-specific legal review status: [completed / pending]

## Quality Checks

- [ ] `check_legal_scope` run and verdict recorded.
- [ ] Lawful basis cited for each data source.
- [ ] Positional-data warrant status explicit.
- [ ] Decision recorded with author and date.
- [ ] Disclaimer attached.
