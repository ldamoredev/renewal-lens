# RenewalLens Visual System

## Direction

The Phase 1 interface combines Claude Design's two explorations in one product: a dark technical-glass theme and a light editorial-glass theme. Both preserve the product hierarchy, visible evidence, dotted-to-solid validation motif, and restrained motion.

## Dark theme

- Slate foundation: `#0E1A2E`
- TypeScript blue: `#4E9BE8`
- Validation green: `#3ECF8E`
- Space Grotesk for product typography
- JetBrains Mono for technical labels
- Translucent slate surfaces with subtle saturation, hairline borders, and broad low-opacity shadows
- A light, solid result surface to distinguish validated output from the glass analysis area

## Light theme

- Warm canvas: `#F4F0EA`
- Editorial ink: `#1A1826`
- Lavender action color: `#7B7DE8`
- Muted green validation: `#6FA88A`
- Space Grotesk and JetBrains Mono, matching the dark theme exactly so switching themes never reflows content
- Warm translucent panels, marbled ambient color, and solid ivory result surfaces

## Theme behavior

The header toggle switches the `data-theme` attribute on the root element and persists the explicit choice under `renewallens-theme` in `localStorage`. On a first visit, the inline bootstrap script follows `prefers-color-scheme`; subsequent visits use the saved preference. The script runs before page paint to avoid a visible theme flash.

The toggle has a stable accessible name, visible sun/moon states, keyboard focus styling, and a compact mobile layout. Theme transitions inherit the global reduced-motion policy.

Both themes share the same font families, sizes, weights, line heights, spacing, radii, component dimensions, and responsive breakpoints. The toggle changes color, background, border, shadow, and glass treatment only.

## Glass rules

- Glass is used for navigation, upload context, the analyzer shell, and example selection.
- Validated results remain visually solid.
- Blur never substitutes for contrast; text colors are theme-specific.
- Glows are limited to ambient depth, focus, active analysis, and successful validation.
- Background grid and orbs are decorative and excluded from the accessibility tree.

## Design-source policy

The Claude Design exports live in the separate `renewal-lens-visual` working directory. Only production-relevant React, CSS, typography, tests, and documentation were integrated here. Generated `.dc.html`, `support.js`, thumbnail metadata, build output, and auxiliary Git history were intentionally excluded.
