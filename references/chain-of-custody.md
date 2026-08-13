# Reference — Chain of Custody & Evidentiary Integrity

## Purpose

Preserve the admissibility and credibility of evidence by maintaining an
unbroken, documented chain of custody from collection through analysis to
presentation. The `validate_chain_of_custody` tool programmatically checks
continuity and flags breaks before they compromise a case.

## Research Foundation

- National Research Council (2009). *Strengthening Forensic Science in the
  United States*. National Academies Press — evidentiary-integrity standards
  and the documented consequences of weak chain-of-custody practices.
- National Institute of Justice (2000). *Crime Mapping: Principle and
  Practice*. U.S. Dept of Justice — standard crime-mapping / investigative
  methodology including documentation standards.
- D. Canter, D. Youngs (2009). *Investative Psychology*. Wiley — empirical
  investigative framework that emphasizes documented, repeatable reasoning.

## What "Chain of Custody" Means

For each evidence item there must be a contemporaneous record of:

- **Identity** — a stable id and human-readable description.
- **Collector** — who acquired the item and when (`acquired_at`).
- **Storage location** — where the item is held between transfers.
- **Transfer chain** — a sequence of `{ from, to, timestamp, note }` entries
  documenting every handoff.

**Continuity rule**: each transfer step's `from` must equal the previous
step's `to`. A break in this sequence is a *continuity error* that can render
the item inadmissible or unreliable.

## Operationalization (`validateChainOfCustody`, `config/tools.ts`)

The tool verifies, for every item:

1. `id`, `collector`, and `acquired_at` are present and non-empty.
2. The `chain` array is non-empty (else a warning, not an error).
3. Each chain step has `from`, `to`, and `timestamp`.
4. Step `i+1.from === step i.to` (continuity), with the initial `from`
   expected to equal the `collector`.
5. Flags missing `storage_location` as a warning.

It returns `{ valid, errors, warnings, itemsVerified, summary }`. A `valid:
false` result means the chain is broken and the item must be re-documented or
re-collected before being relied upon analytically.

## Procedure

1. At collection, record the item id, description, collector, `acquired_at`
   (ISO 8601), and initial storage location.
2. On every transfer, append `{ from, to, timestamp, note }` with the
   custodian identities (badge / role IDs, not personal names alone).
3. Before any analytical use, run `validate_chain_of_custody`.
4. On a `valid: false` result: halt use of the affected item, document the
   break, and consult a qualified legal advisor on remediation.
5. Store the validated chain alongside the evidence record.

## Output Schema (excerpt)

```json
{
  "valid": true,
  "errors": [],
  "warnings": ["Item E2: storage_location not specified."],
  "itemsVerified": 3,
  "summary": "All 3 custody item(s) passed continuity verification."
}
```

## Pitfalls

- **Identity vs. name**: use stable custodian identifiers (badge/role IDs);
  names alone invite ambiguity across same-named individuals.
- **Timestamps out of order**: the tool checks `from`/`to` continuity but not
   chronological order; verify timestamps are monotonic as a separate check.
- **Digital evidence**: digital items require hash-of-record (e.g., SHA-256)
   at acquisition and at each transfer; record the hash in the chain `note`.
- **Consolidation**: merging two items under one id breaks the chain; never
   re-use ids.

## Integration

- Feeds the "Evidentiary Integrity" section of
  `assets/templates/suspect-case-file.md`.
- Pair with **Cognitive Interview** output: the recorded interview is itself
  an evidence item and must follow this protocol.
- Run the `legal_guardrail` sub-agent (which dispatches
  `validate_chain_of_custody` when `payload.custody_items` is supplied).

## Quick Checklist

- [ ] Every item has id, collector, acquired_at.
- [ ] Chain continuity verified programmatically (`valid: true`).
- [ ] Storage location recorded per item.
- [ ] Digital items carry a content hash in the chain note.
- [ ] Continuity errors resolved or item withdrawn from analytical use.
- [ ] Disclaimer attached; integrity check is not a legal determination.

---

**Research citation indices** (see RESEARCH-PAPER-KNOWLEDGE-BRAIN.md): #23, #24, #20. Each cited source is applied to a concrete tool, reference, template, or script — see the consolidated mapping table in that file.
