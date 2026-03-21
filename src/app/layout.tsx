import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NMT Vertical Diagnostic Test",
  description:
    "Assess the maturity of your Yi vertical across 7 key dimensions. A diagnostic tool by Young Indians National Management Team.",
  openGraph: {
    title: "NMT Vertical Diagnostic Test — Young Indians",
    description:
      "35-question maturity assessment across 7 dimensions. Instant radar chart, scoring, and recommendations for Yi vertical leaders.",
    type: "website",
    siteName: "Young Indians NMT",
  },
  twitter: {
    card: "summary",
    title: "NMT Vertical Diagnostic Test",
    description:
      "35-question maturity assessment for Yi vertical leaders. Instant results.",
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
      className={`light ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
        {children}
      </body>
    </html>
  );
}
