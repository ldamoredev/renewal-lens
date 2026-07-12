import { EvidenceDisclosure } from "@/components/evidence/evidence-disclosure";
import type { PricingResultOffer } from "@/features/analyze-offer/application/analysis-response";

import type { AnalysisState } from "../states/analysis-state";
import { AnalysisStateNotice } from "../states/analysis-state";

type PricingResultProps = {
  state: AnalysisState;
  offer: PricingResultOffer;
  isExample: boolean;
  errorDetail?: string | null;
};

function ResultSkeleton() {
  return (
    <div className="result-skeleton" aria-hidden="true">
      <div className="skeleton-line skeleton-line--short" />
      <div className="skeleton-block" />
      <div className="skeleton-grid">
        <div className="skeleton-block skeleton-block--small" />
        <div className="skeleton-block skeleton-block--small" />
      </div>
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-line--medium" />
    </div>
  );
}

function statusLabel(state: AnalysisState): string {
  if (state === "success") return "Complete structure";
  if (state === "partial") return "Partial structure";
  if (state === "ambiguous") return "Needs review";
  return "Insufficient screenshot";
}

export function PricingResult({
  state,
  offer,
  isExample,
  errorDetail,
}: PricingResultProps) {
  const isLoading = state === "loading";
  const showSummary = [
    "success",
    "partial",
    "ambiguous",
    "insufficient",
  ].includes(state);
  const noticeDetail =
    state === "partial"
      ? offer.missingInformation[0]
      : state === "ambiguous"
        ? offer.ambiguities[0]
        : null;

  return (
    <section
      className={`result-panel result-panel--${state}`}
      aria-live="polite"
      aria-busy={isLoading}
    >
      <div className="result-panel__header">
        <div className="panel-label">
          <span>02</span> Billing summary
        </div>
        {isExample && state !== "idle" ? (
          <span className="example-pill">Verified example</span>
        ) : null}
      </div>
      {state === "idle" ? (
        <div className="empty-result">
          <span className="empty-result__mark" aria-hidden="true">
            RL
          </span>
          <h2>Your clear billing timeline will appear here.</h2>
          <p>Choose an example or add a screenshot to preview the result.</p>
          <ResultSkeleton />
        </div>
      ) : null}
      {isLoading ? (
        <div className="loading-result" role="status">
          <div className="analysis-orbit" aria-hidden="true">
            <span />
          </div>
          <p className="eyebrow">Reading visible terms</p>
          <h2>Tracing the billing structure…</h2>
          <p>Separating the advertised price from the actual charge.</p>
          <ResultSkeleton />
        </div>
      ) : null}
      {state === "partial" ||
      state === "ambiguous" ||
      state === "insufficient" ||
      state === "error" ||
      state === "rate_limited" ? (
        <AnalysisStateNotice
          state={state}
          detail={errorDetail ?? noticeDetail}
        />
      ) : null}
      {showSummary ? (
        <div className="pricing-summary">
          <div className="pricing-summary__merchant">
            <div>
              <span className="eyebrow">Offer identified</span>
              <h2>{offer.merchant}</h2>
            </div>
            <span className={`result-status result-status--${state}`}>
              {statusLabel(state)}
            </span>
          </div>

          {offer.timeline.length > 0 ? (
            <ol className="timeline-card" aria-label="Billing timeline">
              {offer.timeline.map((fact, index) => (
                <li className="timeline-item" key={`${fact.label}-${index}`}>
                  <span className="timeline-dot" aria-hidden="true" />
                  <div>
                    <span>{fact.label}</span>
                    <EvidenceDisclosure evidence={fact.evidence} compact />
                  </div>
                  <strong>{fact.value}</strong>
                </li>
              ))}
            </ol>
          ) : null}

          <div className="cost-callout">
            <div>
              <span>{offer.firstYearCost.label}</span>
              <strong>{offer.firstYearCost.value}</strong>
              <EvidenceDisclosure
                evidence={offer.firstYearCost.evidence}
                compact
              />
            </div>
            <span className="cost-callout__code">CALCULATED BY CODE</span>
          </div>

          <dl className="detail-grid">
            {offer.details.map((fact, index) => (
              <div
                className={`detail-fact detail-fact--${fact.status}`}
                key={`${fact.label}-${index}`}
              >
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
                <EvidenceDisclosure evidence={fact.evidence} compact />
              </div>
            ))}
          </dl>

          {offer.ambiguities.length > 0 ? (
            <section className="uncertainty-list uncertainty-list--ambiguous">
              <h3>More than one interpretation is possible</h3>
              <ul>
                {offer.ambiguities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {offer.missingInformation.length > 0 ? (
            <section className="uncertainty-list">
              <h3>Information not visible</h3>
              <ul>
                {offer.missingInformation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {offer.assumptions.length > 0 ? (
            <details className="calculation-notes">
              <summary>Calculation notes</summary>
              <ul>
                {offer.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
