# Extraction Contract (Phase 2)

RenewalLens separates probabilistic reading from deterministic math. The
extraction contract is the boundary between the two: the multimodal model may
only transcribe billing facts that are literally visible in one screenshot,
and every downstream monetary result is computed in TypeScript.

Contract version: `2026-07-12.1` (`EXTRACTION_CONTRACT_VERSION` in
`src/features/analyze-offer/domain/extraction.ts`).

## Shape

An extraction is an `OfferExtraction`:

- `merchant` — name plus verbatim evidence, or `null`.
- `currency` — ISO code (`null` unless explicit or unambiguous), the visible
  symbol, and evidence. A bare `$` never implies USD.
- `dueToday` — only an amount the screenshot explicitly presents as payable
  now.
- `billingPhases[]` — the offer's chronological billing stages. Each phase has
  a kind (`free_trial` | `promotional` | `regular`), a price (`null` only for
  free trials), an optional billing cadence, an optional phase duration
  (`null` = ongoing/until cancelled), and evidence. The three fictional
  examples map cleanly: Streamly = free trial + regular monthly; CloudVault =
  one regular annual phase; FitClub+ = promotional month + regular monthly.
- `displayedEquivalentPrice` — an advertised per-period equivalent (e.g.
  "$10 / month, billed annually"). Kept strictly separate from `dueToday`
  and phase prices so the Phase 3 engine can never confuse the advertised
  equivalent with the actual charge.
- `autoRenewal`, `cancellation`, `ambiguities[]` — explicit statements only;
  `unknown`/`null`/listed ambiguities instead of assumptions.

## Money representation

The model returns money as `decimalText` — a plain dot-decimal string with no
symbols, signs, or grouping. Deterministic string arithmetic
(`parseDecimalToMinorUnits`) converts it to integer minor units at scale 2;
no floating point is ever used. Malformed decimals are a contract violation,
not a rounding opportunity. The MVP fixes the minor-unit scale at 2; other
scales are out of scope until a real currency requires them.

## Validation pipeline

1. `rawOfferExtractionSchema` (Zod, strict objects) validates the structural
   shape of untrusted model output.
2. `mapRawExtraction` enforces semantic rules — valid decimal format,
   three-letter currency codes, non-empty evidence on every fact, free trials
   without prices, paid phases with prices, positive periods — and produces
   the immutable domain object.

A violation at either step is a structural failure of the whole extraction.

## Adapter behavior

`AnthropicOfferExtractor` (infrastructure) is server-side only:

- Model: `ANTHROPIC_MODEL`, defaulting to `claude-haiku-4-5` — the Phase 2
  model decision (cheapest current model with vision + structured outputs).
- The request uses structured outputs (`output_config.format` with a JSON
  Schema generated from the Zod wire schema and pruned to the supported
  keyword subset), which makes structurally invalid JSON rare but not
  impossible.
- Exactly one controlled structural retry: on invalid output the adapter
  replays the conversation with the invalid answer plus a machine-readable
  issue list, then gives up with `invalid_output`.
- Transport policy: 45 s request timeout, SDK `maxRetries: 1` for 429/5xx,
  and typed error mapping to `timeout`, `rate_limited`, `api_error`, plus
  `refused` for `stop_reason: "refusal"`. Outcome objects carry no image
  bytes or model payloads, so they are safe to log.

Preloaded examples never reach this adapter; they will use verified fixtures
(Phase 4). Uploaded screenshots are passed transiently as base64 and never
persisted.
