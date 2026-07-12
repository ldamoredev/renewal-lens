import type { PricingResultOffer } from "@/features/analyze-offer/application/analysis-response";

export type ExampleId = "streamly" | "cloudvault" | "fitclub";

export type MockPricingOffer = PricingResultOffer & {
  id: ExampleId;
  pattern: string;
  imageSrc: string;
  imageAlt: string;
};

const calculationNotes = [
  "First-year cost includes charges within 365 days of signup.",
  "Effective monthly cost is the first-year total divided by 12.",
];

export const mockOffers: readonly MockPricingOffer[] = [
  {
    id: "streamly",
    merchant: "Streamly",
    pattern: "7-day free trial",
    imageSrc: "/examples/streamly-trial.svg",
    imageAlt:
      "Fictional Streamly checkout showing a seven-day free trial, then $12.99 monthly",
    timeline: [
      {
        label: "Today",
        value: "$0.00",
        status: "visible",
        evidence: ["Due today $0.00"],
      },
      {
        label: "Free trial",
        value: "7 days",
        status: "visible",
        evidence: ["Watch free for 7 days"],
      },
      {
        label: "Regular price",
        value: "$12.99 / month",
        status: "visible",
        evidence: ["After your free trial $12.99 / month"],
      },
    ],
    firstYearCost: {
      label: "Estimated first-year cost",
      value: "$155.88",
      status: "calculated",
      evidence: ["After your free trial $12.99 / month"],
    },
    details: [
      {
        label: "Actual billing",
        value: "Month",
        status: "visible",
        evidence: ["$12.99 / month"],
      },
      {
        label: "Effective monthly",
        value: "$12.99",
        status: "calculated",
        evidence: ["$12.99 / month"],
      },
      {
        label: "Auto-renewal",
        value: "Yes",
        status: "visible",
        evidence: ["Renews automatically each month."],
      },
      {
        label: "Minimum commitment",
        value: "Not visible",
        status: "not_visible",
        evidence: [],
      },
      {
        label: "Cancellation",
        value: "Cancel anytime before renewal.",
        status: "visible",
        evidence: ["Cancel anytime before renewal."],
      },
      {
        label: "Additional fees",
        value: "Not visible",
        status: "not_visible",
        evidence: [],
      },
    ],
    missingInformation: [
      "Minimum commitment is not visible.",
      "Additional fees are not visible.",
      "The currency code is not visible; $ is not assumed to mean USD.",
    ],
    ambiguities: [],
    assumptions: calculationNotes,
  },
  {
    id: "cloudvault",
    merchant: "CloudVault",
    pattern: "Monthly equivalent",
    imageSrc: "/examples/cloudvault-annual.svg",
    imageAlt:
      "Fictional CloudVault pricing showing $10 per month, billed annually at $120",
    timeline: [
      {
        label: "Today",
        value: "$120.00",
        status: "derived",
        evidence: ["$120 billed annually"],
      },
      {
        label: "Regular price",
        value: "$120.00 / year",
        status: "visible",
        evidence: ["$120 billed annually"],
      },
    ],
    firstYearCost: {
      label: "Estimated first-year cost",
      value: "$120.00",
      status: "calculated",
      evidence: ["$120 billed annually"],
    },
    details: [
      {
        label: "Displayed equivalent",
        value: "$10.00 / month",
        status: "visible",
        evidence: ["$10 / month"],
      },
      {
        label: "Actual billing",
        value: "Year",
        status: "visible",
        evidence: ["$120 billed annually"],
      },
      {
        label: "Effective monthly",
        value: "$10.00",
        status: "calculated",
        evidence: ["$120 billed annually"],
      },
      {
        label: "Auto-renewal",
        value: "Yes",
        status: "visible",
        evidence: ["Plan renews annually until cancelled."],
      },
      {
        label: "Minimum commitment",
        value: "Not visible",
        status: "not_visible",
        evidence: [],
      },
      {
        label: "Cancellation",
        value: "Not visible",
        status: "not_visible",
        evidence: [],
      },
      {
        label: "Additional fees",
        value: "Not visible",
        status: "not_visible",
        evidence: [],
      },
    ],
    missingInformation: [
      "Minimum commitment is not visible.",
      "Cancellation is not visible.",
      "Additional fees are not visible.",
      "The currency code is not visible; $ is not assumed to mean USD.",
    ],
    ambiguities: [],
    assumptions: calculationNotes,
  },
  {
    id: "fitclub",
    merchant: "FitClub+",
    pattern: "Price change",
    imageSrc: "/examples/fitclub-promo.svg",
    imageAlt:
      "Fictional FitClub Plus checkout showing $1 for the first month, then $19.99 monthly",
    timeline: [
      {
        label: "Today",
        value: "$1.00",
        status: "visible",
        evidence: ["Due today $1.00"],
      },
      {
        label: "Promotional price",
        value: "$1.00 / month for 1 month",
        status: "visible",
        evidence: ["Your first month. Just $1."],
      },
      {
        label: "Regular price",
        value: "$19.99 / month",
        status: "visible",
        evidence: ["Then, after 1 month $19.99 / month"],
      },
    ],
    firstYearCost: {
      label: "Estimated first-year cost",
      value: "$220.89",
      status: "calculated",
      evidence: [
        "Your first month. Just $1.",
        "Then, after 1 month $19.99 / month",
      ],
    },
    details: [
      {
        label: "Actual billing",
        value: "Month",
        status: "visible",
        evidence: ["$19.99 / month"],
      },
      {
        label: "Effective monthly",
        value: "$18.41",
        status: "calculated",
        evidence: ["Then, after 1 month $19.99 / month"],
      },
      {
        label: "Auto-renewal",
        value: "Yes",
        status: "visible",
        evidence: ["Auto-renews monthly."],
      },
      {
        label: "Minimum commitment",
        value: "Not visible",
        status: "not_visible",
        evidence: [],
      },
      {
        label: "Cancellation",
        value: "Cancel before the next billing date.",
        status: "visible",
        evidence: ["Cancel before the next billing date."],
      },
      {
        label: "Additional fees",
        value: "Not visible",
        status: "not_visible",
        evidence: [],
      },
    ],
    missingInformation: [
      "Minimum commitment is not visible.",
      "Additional fees are not visible.",
      "The currency code is not visible; $ is not assumed to mean USD.",
    ],
    ambiguities: [],
    assumptions: calculationNotes,
  },
] as const;

export const defaultMockOffer = mockOffers[2];
