import type { Metadata } from "next";

import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/space-grotesk";

import "./globals.css";

export const metadata: Metadata = {
  title: "RenewalLens — See what you will actually pay",
  description:
    "Upload a pricing screenshot and turn visible billing terms into a clear, evidence-backed timeline.",
};

const themeScript = `
  (() => {
    try {
      const stored = localStorage.getItem("renewallens-theme");
      const theme = stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = "dark";
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
