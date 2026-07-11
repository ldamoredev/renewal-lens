export type AnalysisState =
  | "idle"
  | "loading"
  | "success"
  | "partial"
  | "ambiguous"
  | "error"
  | "rate_limited";

type NoticeState = Exclude<AnalysisState, "idle" | "loading" | "success">;

const stateContent: Record<
  NoticeState,
  { label: string; title: string; detail: string }
> = {
  partial: {
    label: "Partial result",
    title: "Some billing details are missing.",
    detail:
      "We found the recurring price, but the promotion duration is not visible in this screenshot.",
  },
  ambiguous: {
    label: "More than one interpretation",
    title: "The actual billing frequency is unclear.",
    detail:
      "The offer shows a monthly equivalent, but the screenshot does not confirm when the payment is charged.",
  },
  error: {
    label: "Analysis unavailable",
    title: "We could not process this screenshot.",
    detail:
      "Nothing was charged or stored. Try again with a clear PNG, JPG or WebP image.",
  },
  rate_limited: {
    label: "Rate limit reached",
    title: "Please wait before analyzing another image.",
    detail:
      "Public uploads are limited to keep the demo reliable. The verified examples remain available instantly.",
  },
};

export function AnalysisStateNotice({ state }: { state: NoticeState }) {
  const content = stateContent[state];
  return (
    <div className={`state-notice state-notice--${state}`} role="status">
      <span className="state-notice__icon" aria-hidden="true">
        {state === "partial"
          ? "½"
          : state === "ambiguous"
            ? "?"
            : state === "error"
              ? "!"
              : "···"}
      </span>
      <div>
        <span className="state-notice__label">{content.label}</span>
        <h3>{content.title}</h3>
        <p>{content.detail}</p>
      </div>
    </div>
  );
}
