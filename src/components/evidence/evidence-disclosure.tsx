import type { PresentationFact } from "@/features/analyze-offer/application/analysis-response";

export function EvidenceDisclosure({
  evidence,
  compact = false,
}: {
  evidence: PresentationFact["evidence"];
  compact?: boolean;
}) {
  if (evidence.length === 0) return null;

  return (
    <details
      className={`evidence-disclosure${compact ? "evidence-disclosure--compact" : ""}`}
    >
      <summary>Evidence</summary>
      {evidence.map((quote) => (
        <blockquote key={quote}>“{quote}”</blockquote>
      ))}
    </details>
  );
}
