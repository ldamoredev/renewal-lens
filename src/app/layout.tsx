import type { Metadata } from "next";

import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/space-grotesk";

import "./globals.css";

export const metadata: Metadata = {
  title: "RenewalLens — See what you will actually pay",
  description:
    "Upload a pricing screenshot and turn visible billing terms into a clear, evidence-backed timeline.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
