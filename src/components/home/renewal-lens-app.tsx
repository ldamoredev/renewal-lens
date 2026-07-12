"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { ExampleGallery } from "@/components/examples/example-gallery";
import { PricingResult } from "@/components/pricing-result/pricing-result";
import type { AnalysisState } from "@/components/states/analysis-state";
import { BrandMark } from "@/components/ui/brand-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UploadPanel } from "@/components/upload/upload-panel";
import {
  defaultMockOffer,
  mockOffers,
} from "@/features/analyze-offer/presentation/mock-offers";
import type {
  ExampleId,
  MockPricingOffer,
} from "@/features/analyze-offer/presentation/mock-offers";

const previewStates: readonly { state: AnalysisState; label: string }[] = [
  { state: "idle", label: "Idle" },
  { state: "loading", label: "Loading" },
  { state: "success", label: "Success" },
  { state: "partial", label: "Partial" },
  { state: "ambiguous", label: "Ambiguous" },
  { state: "error", label: "Error" },
  { state: "rate_limited", label: "Rate limited" },
];

export function RenewalLensApp() {
  const [state, setState] = useState<AnalysisState>("idle");
  const [activeOffer, setActiveOffer] =
    useState<MockPricingOffer>(defaultMockOffer);
  const [activeExampleId, setActiveExampleId] = useState<ExampleId | null>(
    null,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function runMockAnalysis(offer: MockPricingOffer, isExample: boolean) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveOffer(offer);
    setActiveExampleId(isExample ? offer.id : null);
    setState("loading");
    timerRef.current = setTimeout(
      () => {
        setState("success");
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      },
      isExample ? 720 : 1_050,
    );
  }

  function handleExampleSelect(id: ExampleId) {
    const offer = mockOffers.find((item) => item.id === id);
    if (offer) runMockAnalysis(offer, true);
  }
  function acceptMockFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    runMockAnalysis(defaultMockOffer, false);
  }
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    acceptMockFile(event.target.files?.[0]);
  }
  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    acceptMockFile(event.dataTransfer.files[0]);
  }
  function handlePreviewState(nextState: AnalysisState) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveOffer(defaultMockOffer);
    setActiveExampleId(nextState === "idle" ? null : defaultMockOffer.id);
    setState(nextState);
  }

  return (
    <main className="app-root">
      <div className="ambient-canvas" aria-hidden="true">
        <span className="ambient-orb ambient-orb--blue" />
        <span className="ambient-orb ambient-orb--green" />
        <span className="ambient-grid" />
      </div>

      <div className="site-header-wrap">
        <header className="site-header">
          <a className="logo" href="#top" aria-label="RenewalLens home">
            <BrandMark />
            <span>RenewalLens</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#examples">Examples</a>
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <span className="build-status">
              <span /> Public preview
            </span>
          </div>
        </header>
      </div>
      <div id="top" className="page-shell">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" /> Pricing, decoded
            </p>
            <h1 id="hero-title">
              See what you will <em>actually</em> pay.
            </h1>
            <p className="hero__lede">
              Upload a subscription or checkout screenshot. RenewalLens extracts
              the billing terms and calculates the real cost.
            </p>
            <div className="trust-line">
              <span>AI interprets the offer.</span>
              <span className="trust-line__divider" aria-hidden="true" />
              <strong>Code calculates the cost.</strong>
            </div>
          </div>
          <div className="hero__aside" aria-label="Product capabilities">
            <div className="capability">
              <span>01</span>
              <p>
                <strong>Visible evidence</strong>Every finding links back to the
                offer text.
              </p>
            </div>
            <div className="capability">
              <span>02</span>
              <p>
                <strong>Deterministic math</strong>Money calculations never come
                from the model.
              </p>
            </div>
            <div className="capability">
              <span>03</span>
              <p>
                <strong>Honest uncertainty</strong>Missing terms stay visibly
                missing.
              </p>
            </div>
          </div>
        </section>
        <section className="analyzer" aria-label="Screenshot analyzer">
          <UploadPanel
            fileName={fileName}
            isDragging={isDragging}
            onFileChange={handleFileChange}
            onDragStateChange={setIsDragging}
            onDrop={handleDrop}
          />
          <div
            className={`analysis-bridge analysis-bridge--${state}`}
            aria-hidden="true"
          >
            <span>Analyze</span>
            <div>
              <i />
            </div>
          </div>
          <div ref={resultRef}>
            <PricingResult
              state={state}
              offer={activeOffer}
              isExample={activeExampleId !== null}
            />
          </div>
        </section>
        <details className="state-preview">
          <summary>Preview interface states</summary>
          <p>Phase 1 prototype controls</p>
          <div>
            {previewStates.map((item) => (
              <button
                key={item.state}
                type="button"
                className={state === item.state ? "active" : ""}
                onClick={() => handlePreviewState(item.state)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </details>
        <ExampleGallery
          offers={mockOffers}
          activeId={activeExampleId}
          onSelect={handleExampleSelect}
        />
        <section
          className="how-it-works"
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">A narrow job, done well</p>
              <h2 id="how-title">From screenshot to billing timeline.</h2>
            </div>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Read what is visible</strong>
                <p>
                  The model extracts prices, timing and terms with textual
                  evidence.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Validate the structure</strong>
                <p>
                  Unsupported or conflicting fields remain partial or ambiguous.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Calculate in code</strong>
                <p>
                  Integer money math produces the estimated first-year cost.
                </p>
              </div>
            </li>
          </ol>
        </section>
      </div>
      <footer>
        <a className="logo" href="#top">
          <BrandMark />
          <span>RenewalLens</span>
        </a>
        <p>
          Explains pricing visible in the screenshot. No legal, financial or
          purchasing advice.
        </p>
        <span>Built with visible evidence.</span>
      </footer>
    </main>
  );
}
