export type ExampleId = "streamly" | "cloudvault" | "fitclub";

export type MockPricingOffer = {
  id: ExampleId;
  merchant: string;
  pattern: string;
  imageSrc: string;
  imageAlt: string;
  dueToday: string;
  afterLabel: string;
  afterPrice: string;
  firstYearCost: string;
  effectiveMonthly: string;
  billingFrequency: string;
  autoRenewal: string;
  cancellation: string;
  evidence: string;
};

export const mockOffers: readonly MockPricingOffer[] = [
  {
    id: "streamly",
    merchant: "Streamly",
    pattern: "7-day free trial",
    imageSrc: "/examples/streamly-trial.svg",
    imageAlt:
      "Fictional Streamly checkout showing a seven-day free trial, then $12.99 monthly",
    dueToday: "$0.00",
    afterLabel: "After 7 days",
    afterPrice: "$12.99 / month",
    firstYearCost: "$155.88",
    effectiveMonthly: "$12.99",
    billingFrequency: "Monthly",
    autoRenewal: "Yes",
    cancellation: "Cancel anytime before renewal",
    evidence: "Watch free for 7 days · After your free trial $12.99 / month",
  },
  {
    id: "cloudvault",
    merchant: "CloudVault",
    pattern: "Monthly equivalent",
    imageSrc: "/examples/cloudvault-annual.svg",
    imageAlt:
      "Fictional CloudVault pricing showing $10 per month, billed annually at $120",
    dueToday: "$120.00",
    afterLabel: "Actual billing",
    afterPrice: "$120 / year",
    firstYearCost: "$120.00",
    effectiveMonthly: "$10.00",
    billingFrequency: "Annually",
    autoRenewal: "Yes",
    cancellation: "Terms not visible",
    evidence: "$10 / month · $120 billed annually",
  },
  {
    id: "fitclub",
    merchant: "FitClub+",
    pattern: "Price change",
    imageSrc: "/examples/fitclub-promo.svg",
    imageAlt:
      "Fictional FitClub Plus checkout showing $1 for the first month, then $19.99 monthly",
    dueToday: "$1.00",
    afterLabel: "After 1 month",
    afterPrice: "$19.99 / month",
    firstYearCost: "$220.89",
    effectiveMonthly: "$18.41",
    billingFrequency: "Monthly",
    autoRenewal: "Yes",
    cancellation: "Before the next billing date",
    evidence: "Due today $1.00 · Then, after 1 month $19.99 / month",
  },
] as const;

export const defaultMockOffer = mockOffers[2];
