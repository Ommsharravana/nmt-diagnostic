import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "NMT Vertical Diagnostic — Young Indians",
  description:
    "Assess the maturity of your Yi vertical across 7 key dimensions. A strategic tool for Young Indians National Management Team.",
  openGraph: {
    title: "NMT Vertical Diagnostic — Young Indians",
    description:
      "35-question maturity assessment across 7 dimensions. Instant radar chart, scoring, and actionable recommendations for Yi vertical leaders.",
    type: "website",
    siteName: "Young Indians NMT",
  },
  twitter: {
    card: "summary",
    title: "NMT Vertical Diagnostic",
    description:
      "Strategic maturity assessment for Yi vertical leaders. Instant results.",
  },
  other: {
    "color-scheme": "light only",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`light ${dmSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-[#fafaf8]">
        {children}
      </body>
    </html>
  );
}
