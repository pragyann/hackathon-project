import type { Metadata } from "next";
import { Newsreader, Overpass, Overpass_Mono } from "next/font/google";
import "./globals.css";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

/*
  Overpass descends from Highway Gothic, the letterform of road signage — the
  right voice for a product named after a road element that draws routes.
  Overpass Mono carries unit codes and statistics; Newsreader is the
  editorial display voice, and its italic is reserved for text quoted
  verbatim from university handbooks.
*/
const sans = Overpass({
  variable: "--font-sans-var",
  subsets: ["latin"],
  display: "swap",
});

const mono = Overpass_Mono({
  variable: "--font-mono-var",
  subsets: ["latin"],
  display: "swap",
});

const serif = Newsreader({
  variable: "--font-serif-var",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Onramp — your degree, mapped to the job you want",
  description:
    "Turns the units you have actually completed into a stage-aware skill roadmap for the roles you want, and points you at the Melbourne rooms where those people are.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: browser extensions inject attributes into
    // <html> before React hydrates (e.g. bbai-tooltip-injected), which is
    // noise, not a bug. Applies to this element's attributes only.
    <html
      lang="en-AU"
      data-scroll-behavior="smooth"
      className={`${sans.variable} ${mono.variable} ${serif.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
