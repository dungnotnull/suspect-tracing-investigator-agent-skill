# Reference — Digital Footprint Lawful Sourcing

## Purpose

Organize digital-footprint leads while strictly restricting them to publicly
available, lawfully obtained information. This reference defines what counts as
lawful, what does not, and how to integrate digital leads into the
lead-prioritization matrix without crossing into private surveillance.

## Research Foundation

- National Institute of Justice (2000). *Crime Mapping: Principle and
  Practice*. U.S. Dept of Justice — methodology standards for investigative
  data use.
- M. K. Sparrow (1991). "The Application of Network Analysis to Criminal
  Intelligence." *Social Networks* — emphasizes that link/network validity
  depends on the lawfulness and reliability of source data.
- R. Innes (2003). *Investigating Murder*. Oxford University Press —
  documents how real-world investigative decisions weight open-source versus
  protected-source information.

## What Is Lawful Here

Lawful digital leads, for the purposes of this skill, are **publicly available,
lawfully obtained** information such as:

- **Public records** — court records, property records, business registries
  accessible to the public.
- **Open-source intelligence (OSINT) — public**: public social-media posts
  viewable without circumventing access controls, public websites, press
  archives.
- **Lawfully obtained witness statements** that reference digital activity.
- **Department records accessed with authorization** — systems the
  investigator is credentialed to query, used within their authorized scope.

These align with the `allowed_data_sources` list in
`config/settings.example.json`.

## What Is Not Lawful Here (disallowed_data_sources)

The skill refuses to organize or process the following, and the `check_legal_scope`
tool will flag a violation:

- **Unauthorized location tracking** — GPS, telco tower dumps, or device
  location data without a warrant or explicit lawful basis.
- **Stolen data** — any dataset obtained through breach or theft.
- **Private surveillance without lawful basis** — following, stalking, or
  covert monitoring outside a lawful investigative authority.
- **Social-media access via credential sharing** — logging into another
  person's account, even with their stated consent, is not within scope and
  is flagged.

## Procedure

1. For each digital lead, record `source` as one of the allowed data-source
   identifiers (or document a new one with its lawful basis).
2. Score the lead in the lead-prioritization matrix as usual; digital leads
   typically score lower on `source_reliability` unless independently
   corroborated.
3. Run `check_legal_scope` on any planned action that *uses* the digital lead
   (e.g., "use OSINT social post to identify associates") — set
   `involves_positional_data`, `has_warrant_or_lawful_basis`, and
   `target_is_named_individual` accurately.
4. If the tool returns `compliant: false`, halt the planned action and consult
   a qualified legal advisor.
5. Preserve the digital artifact (screenshot, URL, archive hash) and record it
   in the chain of custody.

## Output Schema (`check_legal_scope` excerpt)

```json
{
  "compliant": false,
  "violations": ["Disallowed data source: \"unauthorized-location-tracking\"."],
  "warnings": ["Target is a named individual — output must remain ..."],
  "required_action": "Halt the planned action. Consult a qualified legal advisor ...",
  "disclaimer": "This compliance check is general analytical guidance, not legal advice. ..."
}
```

## Pitfalls

- **Public ≠ lawful-to-use**: a post may be public but using it to harass,
  intimidate, or de-anonymize a third party can still be unlawful or unethical.
- **Jurisdiction variance**: lawful OSINT in one jurisdiction may be
  restricted in another; the tool's compliance check is general guidance,
  not jurisdiction-specific advice.
- **Data freshness**: digital footprints decay (posts are deleted, accounts
  renamed); timestamp every capture and re-verify before reliance.
- **Aggregation risk**: combining several lawful public sources can produce a
  privacy-invasive profile; apply the minimum-necessary principle.

## Integration

- Feeds the "Digital Footprint" section of
  `assets/templates/suspect-case-file.md`.
- Pair with **Link Analysis**: OSINT-derived associates become network nodes,
  but their tie strength must be discounted relative to lawfully obtained
  statements.
- Pair with **Legal Guardrails**: always run `check_legal_scope` before acting
  on a digital lead.

## Quick Checklist

- [ ] Each digital lead's `source` is on the allowed list (or has a
      documented lawful basis).
- [ ] No disallowed data source is referenced.
- [ ] `check_legal_scope` run on the planned action; `compliant: true` (or
      halted with legal review).
- [ ] Artifact captured with timestamp and content hash; entered into chain
      of custody.
- [ ] Minimum-necessary aggregation applied.
- [ ] Disclaimer + legal-scope note attached.

---

**Research citation indices** (see RESEARCH-PAPER-KNOWLEDGE-BRAIN.md): #11, #24, #25. Each cited source is applied to a concrete tool, reference, template, or script — see the consolidated mapping table in that file.
