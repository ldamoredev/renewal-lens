import type { MockPricingOffer } from "@/features/analyze-offer/presentation/mock-offers";

import type { AnalysisState } from "../states/analysis-state";
import { AnalysisStateNotice } from "../states/analysis-state";

type PricingResultProps = {
  state: AnalysisState;
  offer: MockPricingOffer;
  isExample: boolean;
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

export function PricingResult({ state, offer, isExample }: PricingResultProps) {
  const isLoading = state === "loading";
  const showSummary =
    state === "success" || state === "partial" || state === "ambiguous";
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
      state === "error" ||
      state === "rate_limited" ? (
        <AnalysisStateNotice state={state} />
      ) : null}
      {showSummary ? (
        <div className="pricing-summary">
          <div className="pricing-summary__merchant">
            <div>
              <span className="eyebrow">Offer identified</span>
              <h2>{offer.merchant}</h2>
            </div>
            <span className="confidence">High confidence</span>
          </div>
          <div className="timeline-card">
            <div className="timeline-item">
              <span className="timeline-dot" aria-hidden="true" />
              <span>Today</span>
              <strong>{offer.dueToday}</strong>
            </div>
            <div className="timeline-line" aria-hidden="true" />
            <div className="timeline-item">
              <span className="timeline-dot" aria-hidden="true" />
              <span>{offer.afterLabel}</span>
              <strong>{offer.afterPrice}</strong>
            </div>
          </div>
          <div className="cost-callout">
            <div>
              <span>Estimated first-year cost</span>
              <strong>
                {state === "ambiguous" ? "Not confirmed" : offer.firstYearCost}
              </strong>
            </div>
            <span className="cost-callout__code">CALCULATED BY CODE</span>
          </div>
          <dl className="detail-grid">
            <div>
              <dt>Actual billing</dt>
              <dd>{offer.billingFrequency}</dd>
            </div>
            <div>
              <dt>Effective monthly</dt>
              <dd>
                {state === "ambiguous" ? "Unknown" : offer.effectiveMonthly}
              </dd>
            </div>
            <div>
              <dt>Auto-renewal</dt>
              <dd>{offer.autoRenewal}</dd>
            </div>
            <div>
              <dt>Cancellation</dt>
              <dd>
                {state === "partial" ? "Not visible" : offer.cancellation}
              </dd>
            </div>
          </dl>
          <details className="evidence-row">
            <summary>View supporting evidence</summary>
            <blockquote>“{offer.evidence}”</blockquote>
          </details>
        </div>
      ) : null}
    </section>
  );
}
