import { z } from "zod";

import {
  EXTRACTION_CONTRACT_VERSION,
  type BillingPhase,
  type ExtractedMoney,
  type OfferExtraction,
  type Period,
} from "@/features/analyze-offer/domain/extraction";

/**
 * Wire schema for untrusted model output. Structural shape only: strict
 * objects, enums, and nullables. Semantic rules (decimal format, non-empty
 * evidence, currency code shape) are enforced by `mapRawExtraction` so the
 * JSON Schema sent to the API stays within the structured-output subset
 * (no pattern/minLength/minimum keywords).
 */
const rawPeriodSchema = z.strictObject({
  value: z.int(),
  unit: z.enum(["day", "week", "month", "year"]),
});

const rawMoneySchema = z.strictObject({
  decimalText: z.string(),
  currencyCode: z.string().nullable(),
  evidence: z.string(),
});

const rawBillingPhaseSchema = z.strictObject({
  kind: z.enum(["free_trial", "promotional", "regular"]),
  price: rawMoneySchema.nullable(),
  billingPeriod: rawPeriodSchema.nullable(),
  duration: rawPeriodSchema.nullable(),
  evidence: z.string(),
});

export const rawOfferExtractionSchema = z.strictObject({
  merchant: z
    .strictObject({ name: z.string(), evidence: z.string() })
    .nullable(),
  currency: z.strictObject({
    code: z.string().nullable(),
    symbol: z.string().nullable(),
    evidence: z.string().nullable(),
  }),
  dueToday: rawMoneySchema.nullable(),
  billingPhases: z.array(rawBillingPhaseSchema),
  displayedEquivalentPrice: z
    .strictObject({ amount: rawMoneySchema, period: rawPeriodSchema })
    .nullable(),
  autoRenewal: z.strictObject({
    status: z.enum(["yes", "no", "unknown"]),
    evidence: z.string().nullable(),
  }),
  cancellation: z
    .strictObject({ text: z.string(), evidence: z.string() })
    .nullable(),
  ambiguities: z.array(z.string()),
});

export type RawOfferExtraction = z.infer<typeof rawOfferExtractionSchema>;
type RawMoney = z.infer<typeof rawMoneySchema>;
type RawPeriod = z.infer<typeof rawPeriodSchema>;

export type MappingResult =
  | { readonly ok: true; readonly extraction: OfferExtraction }
  | { readonly ok: false; readonly issues: readonly string[] };

const DECIMAL_TEXT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const MAX_PERIOD_VALUE = 10_000;

/**
 * Converts a plain decimal string ("12.99", "120") into integer minor
 * units at scale 2 using string arithmetic only. Returns null on any
 * format the contract does not allow (signs, grouping, >2 decimals).
 */
export function parseDecimalToMinorUnits(decimalText: string): number | null {
  if (!DECIMAL_TEXT_PATTERN.test(decimalText)) {
    return null;
  }
  const [units, fraction = ""] = decimalText.split(".");
  const paddedFraction = fraction.padEnd(2, "0");
  return Number.parseInt(units, 10) * 100 + Number.parseInt(paddedFraction, 10);
}

function mapMoney(
  raw: RawMoney,
  path: string,
  issues: string[],
): ExtractedMoney | null {
  const minorUnits = parseDecimalToMinorUnits(raw.decimalText);
  if (minorUnits === null) {
    issues.push(`${path}.decimalText is not a valid decimal amount`);
  }
  if (
    raw.currencyCode !== null &&
    !CURRENCY_CODE_PATTERN.test(raw.currencyCode)
  ) {
    issues.push(`${path}.currencyCode is not a three-letter ISO code`);
  }
  if (raw.evidence.trim().length === 0) {
    issues.push(`${path}.evidence must be non-empty verbatim screenshot text`);
  }
  if (minorUnits === null) {
    return null;
  }
  return {
    minorUnits,
    currencyCode: raw.currencyCode,
    evidence: raw.evidence,
  };
}

function mapPeriod(raw: RawPeriod, path: string, issues: string[]): Period {
  if (raw.value < 1 || raw.value > MAX_PERIOD_VALUE) {
    issues.push(`${path}.value must be between 1 and ${MAX_PERIOD_VALUE}`);
  }
  return { value: raw.value, unit: raw.unit };
}

function mapBillingPhase(
  raw: z.infer<typeof rawBillingPhaseSchema>,
  index: number,
  issues: string[],
): BillingPhase {
  const path = `billingPhases[${index}]`;
  if (raw.kind === "free_trial" && raw.price !== null) {
    issues.push(`${path} is a free trial but carries a price`);
  }
  if (raw.kind !== "free_trial" && raw.price === null) {
    issues.push(`${path} is a paid phase but has no price`);
  }
  if (raw.evidence.trim().length === 0) {
    issues.push(`${path}.evidence must be non-empty verbatim screenshot text`);
  }
  return {
    kind: raw.kind,
    price:
      raw.price === null ? null : mapMoney(raw.price, `${path}.price`, issues),
    billingPeriod:
      raw.billingPeriod === null
        ? null
        : mapPeriod(raw.billingPeriod, `${path}.billingPeriod`, issues),
    duration:
      raw.duration === null
        ? null
        : mapPeriod(raw.duration, `${path}.duration`, issues),
    evidence: raw.evidence,
  };
}

/**
 * Applies the contract's semantic rules to structurally valid model output
 * and produces the immutable domain extraction. Any violated rule is a
 * structural failure of the whole extraction: the caller treats it exactly
 * like invalid JSON and may spend its single controlled retry.
 */
export function mapRawExtraction(raw: RawOfferExtraction): MappingResult {
  const issues: string[] = [];

  const merchant = raw.merchant;
  if (merchant !== null && merchant.evidence.trim().length === 0) {
    issues.push("merchant.evidence must be non-empty verbatim screenshot text");
  }

  if (
    raw.currency.code !== null &&
    !CURRENCY_CODE_PATTERN.test(raw.currency.code)
  ) {
    issues.push("currency.code is not a three-letter ISO code");
  }

  const dueToday =
    raw.dueToday === null ? null : mapMoney(raw.dueToday, "dueToday", issues);

  const billingPhases = raw.billingPhases.map((phase, index) =>
    mapBillingPhase(phase, index, issues),
  );

  const displayedEquivalentPrice =
    raw.displayedEquivalentPrice === null
      ? null
      : {
          amount: mapMoney(
            raw.displayedEquivalentPrice.amount,
            "displayedEquivalentPrice.amount",
            issues,
          ),
          period: mapPeriod(
            raw.displayedEquivalentPrice.period,
            "displayedEquivalentPrice.period",
            issues,
          ),
        };

  if (
    raw.cancellation !== null &&
    raw.cancellation.evidence.trim().length === 0
  ) {
    issues.push(
      "cancellation.evidence must be non-empty verbatim screenshot text",
    );
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    extraction: {
      contractVersion: EXTRACTION_CONTRACT_VERSION,
      merchant,
      currency: raw.currency,
      dueToday,
      billingPhases,
      displayedEquivalentPrice:
        displayedEquivalentPrice === null
          ? null
          : {
              // Safe: issues.length === 0 guarantees mapMoney succeeded.
              amount: displayedEquivalentPrice.amount as ExtractedMoney,
              period: displayedEquivalentPrice.period,
            },
      autoRenewal: raw.autoRenewal,
      cancellation: raw.cancellation,
      ambiguities: raw.ambiguities
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    },
  };
}
