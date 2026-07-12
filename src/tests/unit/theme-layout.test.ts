import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const layoutChangingProperties = [
  "align-items",
  "aspect-ratio",
  "bottom",
  "border-radius",
  "display",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-grow",
  "flex-shrink",
  "font-family",
  "font-size",
  "font-weight",
  "gap",
  "grid",
  "height",
  "inset",
  "justify-content",
  "left",
  "letter-spacing",
  "line-height",
  "margin",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "order",
  "overflow",
  "padding",
  "position",
  "right",
  "top",
  "transform",
  "width",
] as const;

describe("theme layout invariance", () => {
  it("keeps light-theme overrides color-only outside the toggle control", () => {
    const cssPath = fileURLToPath(
      new URL("../../app/globals.css", import.meta.url),
    );
    const css = readFileSync(cssPath, "utf8");
    const lightThemeRules = css.matchAll(
      /([^{}]*\[data-theme="light"\][^{]*)\{([^}]*)\}/g,
    );

    for (const [, selector, declarations] of lightThemeRules) {
      if (selector.includes("theme-toggle")) continue;

      for (const property of layoutChangingProperties) {
        expect(
          declarations,
          `${selector.trim()} must not override ${property}`,
        ).not.toMatch(new RegExp(`(^|\\n)\\s*${property}\\s*:`));
      }
    }
  });
});
