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
  analysisApiResponseSchema,
  type PricingResultOffer,
} from "@/features/analyze-offer/application/analysis-response";
import {
  defaultMockOffer,
  mockOffers,
} from "@/features/analyze-offer/presentation/mock-offers";
import type { ExampleId } from "@/features/analyze-offer/presentation/mock-offers";

const previewStates: readonly { state: AnalysisState; label: string }[] = [
  { state: "idle", label: "Idle" },
  { state: "loading", label: "Loading" },
  { state: "success", label: "Success" },
  { state: "partial", label: "Partial" },
  { state: "ambiguous", label: "Ambiguous" },
  { state: "insufficient", label: "Insufficient" },
  { state: "error", label: "Error" },
  { state: "rate_limited", label: "Rate limited" },
];

export function RenewalLensApp() {
  const [state, setState] = useState<AnalysisState>("idle");
  const [activeOffer, setActiveOffer] =
    useState<PricingResultOffer>(defaultMockOffer);
  const [activeExampleId, setActiveExampleId] = useState<ExampleId | null>(
    null,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  async function runAnalysis(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    exampleId: ExampleId | null,
  ) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setActiveExampleId(exampleId);
    setErrorDetail(null);
    setState("loading");
    try {
      const [response] = await Promise.all([
        fetch(input, { ...init, signal: controller.signal }),
        exampleId === null
          ? Promise.resolve()
          : new Promise((resolve) => setTimeout(resolve, 520)),
      ]);
      const parsed = analysisApiResponseSchema.safeParse(await response.json());
      if (requestRef.current !== controller) return;
      if (!parsed.success) {
        setErrorDetail(
          "The server returned an unexpected response. Please try again.",
        );
        setState("error");
        return;
      }
      if (parsed.data.ok) {
        setActiveOffer(parsed.data.offer);
        setState(parsed.data.state);
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }
      const errorMessages = {
        invalid_file: "Choose one PNG, JPG or WebP screenshot.",
        file_too_large: "The screenshot is larger than the 10 MB upload limit.",
        unsupported_image:
          "The file could not be decoded as a valid PNG, JPG or WebP image.",
        analysis_inconclusive:
          "The visible billing terms could not be confirmed from this screenshot.",
        rate_limited: null,
        timeout:
          "The analysis took too long. Nothing was stored; please try again.",
        service_unavailable:
          "Live analysis is temporarily unavailable. The verified examples still work.",
      } as const;
      setErrorDetail(errorMessages[parsed.data.error]);
      setState(parsed.data.error === "rate_limited" ? "rate_limited" : "error");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (requestRef.current === controller) {
        setErrorDetail(
          "The request could not be completed. Please check your connection and try again.",
        );
        setState("error");
      }
    }
  }

  function handleExampleSelect(id: ExampleId) {
    void runAnalysis(`/api/examples/${id}`, undefined, id);
  }
  function acceptFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    const formData = new FormData();
    formData.set("image", file);
    void runAnalysis("/api/analyze", { method: "POST", body: formData }, null);
  }
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0]);
    event.target.value = "";
  }
  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  }
  function handlePreviewState(nextState: AnalysisState) {
    requestRef.current?.abort();
    setErrorDetail(null);
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
              errorDetail={errorDetail}
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
