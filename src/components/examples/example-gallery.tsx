import Image from "next/image";

import type {
  ExampleId,
  MockPricingOffer,
} from "@/features/analyze-offer/presentation/mock-offers";

type ExampleGalleryProps = {
  offers: readonly MockPricingOffer[];
  activeId: ExampleId | null;
  onSelect: (id: ExampleId) => void;
};

export function ExampleGallery({
  offers,
  activeId,
  onSelect,
}: ExampleGalleryProps) {
  return (
    <section
      className="examples-section"
      id="examples"
      aria-labelledby="examples-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">No upload needed</p>
          <h2 id="examples-title">Try a verified example.</h2>
        </div>
        <p>
          Fictional offers, designed to expose the pricing patterns that are
          easiest to miss.
        </p>
      </div>
      <div className="example-grid">
        {offers.map((offer, index) => {
          const selected = activeId === offer.id;
          return (
            <button
              className={`example-card${selected ? "example-card--selected" : ""}`}
              key={offer.id}
              type="button"
              onClick={() => onSelect(offer.id)}
              aria-pressed={selected}
            >
              <span className="example-card__image">
                <Image
                  src={offer.imageSrc}
                  alt={offer.imageAlt}
                  width={1200}
                  height={760}
                  sizes="(max-width: 760px) 90vw, 30vw"
                />
                <span className="example-card__badge">
                  Example {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <span className="example-card__body">
                <span>
                  <strong>{offer.merchant}</strong>
                  <small>{offer.pattern}</small>
                </span>
                <span className="example-card__action" aria-hidden="true">
                  Analyze <span>↗</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
