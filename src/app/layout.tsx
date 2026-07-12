import type { Metadata } from "next";

import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/space-grotesk";

import "./globals.css";

const TITLE = "RenewalLens — See what you will actually pay";
const DESCRIPTION =
  "Upload a pricing screenshot and turn visible billing terms into a clear, evidence-backed timeline.";

export const metadata: Metadata = {
  // Phase 8 deploy sets NEXT_PUBLIC_APP_URL to the public Railway URL so
  // social images resolve absolutely.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "RenewalLens",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "RenewalLens — turn a pricing screenshot into an evidence-backed billing timeline",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
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
