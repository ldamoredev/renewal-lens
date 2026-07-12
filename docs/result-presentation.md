# Result Presentation (Phase 5)

The presentation boundary converts a validated `OfferExtraction` plus the
pure `OfferPricing` result into human-readable facts before React renders the
page. UI components never calculate prices.

## Fact model

Each `PresentationFact` contains:

- `label` and `value` — concise display copy;
- `status` — `visible`, `derived`, `calculated`, or `not_visible`;
- `evidence[]` — verbatim screenshot quotes supporting the fact. Calculated
  totals link to the unique charge evidence used by the schedule.

The result groups facts into a billing timeline, the first-year callout, and
a detail grid. Details cover displayed monthly equivalents, actual cadence,
effective monthly cost, auto-renewal, minimum commitment, cancellation, and
additional fees.

## Product states

- `success` — the visible billing structure supports the first-year total.
  Missing non-calculation terms remain listed without turning absence into a
  negative claim.
- `partial` — some facts were extracted, but deterministic calculation is
  blocked by missing terms.
- `ambiguous` — the extractor found more than one reasonable interpretation.
  The ambiguity is displayed verbatim and no ambiguous total is promoted as
  confirmed.
- `insufficient` — no legible billing phases are present. The UI asks for a
  wider screenshot including price, cadence, and footnotes.

Technical errors and rate limits stay separate from analysis uncertainty.

## Honest absence

Missing information is listed explicitly. A bare `$` keeps the displayed
symbol but never becomes USD; the UI states that the currency code is not
visible. An empty additional-fee array means only that no fee was visible.
No missing term is presented as `No` or as proof that the term does not exist.

## Calculation notes

Machine-readable domain assumptions are translated into short expandable
notes. The first-year callout remains labeled “Calculated by code,” and its
evidence disclosure shows the visible inputs rather than attributing the
total to the model.
