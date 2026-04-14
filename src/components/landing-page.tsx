"use client";

import { Button } from "@/components/ui/button";

interface LandingPageProps {
  onStart: () => void;
}

const dimensions = [
  { name: "Strategic Clarity", abbr: "SC" },
  { name: "Chapter Penetration", abbr: "CP" },
  { name: "Execution Standards", abbr: "ES" },
  { name: "Regional Alignment", abbr: "RA" },
  { name: "Impact & Data", abbr: "ID" },
  { name: "Brand Visibility", abbr: "BV" },
  { name: "Continuity", abbr: "CS" },
];

const maturityLevels = [
  { level: 1, name: "Fragile", color: "#dc2626" },
  { level: 2, name: "Emerging", color: "#ea580c" },
  { level: 3, name: "Growing", color: "#ca8a04" },
  { level: 4, name: "Established", color: "#2563eb" },
  { level: 5, name: "Flagship", color: "#059669" },
];

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero — Dark navy with gold accents */}
      <div className="relative bg-navy overflow-hidden">
        {/* Subtle geometric pattern */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#c4a35a" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 py-20 sm:py-28 text-center">
          {/* Yi Badge */}
          <div className="animate-slide-up stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 text-gold text-xs font-medium tracking-widest uppercase mb-8">
            Young Indians &mdash; National Management Team
          </div>

          {/* Title */}
          <h1 className="animate-slide-up stagger-2 font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight">
            Vertical
            <br />
            <span className="gold-underline">Diagnostic</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-slide-up stagger-3 mt-6 text-lg sm:text-xl text-white/50 max-w-lg mx-auto leading-relaxed font-light">
            Assess maturity across 7 dimensions. Get systemic diagnosis,
            leverage points, and a 90-day action plan.
          </p>

          {/* Dimension tags */}
          <div className="animate-slide-up stagger-4 mt-10 flex flex-wrap justify-center gap-2">
            {dimensions.map((d) => (
              <span
                key={d.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 text-xs text-white/40 font-medium tracking-wide"
              >
                <span className="text-gold/60 font-semibold">{d.abbr}</span>
                <span className="hidden sm:inline">{d.name}</span>
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="animate-slide-up stagger-5 mt-12">
            <Button
              onClick={onStart}
              size="lg"
              className="h-14 px-12 text-base font-semibold rounded-lg bg-gold hover:bg-gold-light text-navy shadow-lg shadow-gold/20 transition-all hover:shadow-xl hover:shadow-gold/30 hover:-translate-y-0.5 tracking-wide"
            >
              Begin Assessment
            </Button>
            <p className="mt-4 text-xs text-white/30 tracking-wide">
              35 questions &middot; ~5 minutes &middot; Instant results
            </p>
          </div>
        </div>

        {/* Maturity scale bar */}
        <div className="relative z-10 max-w-md mx-auto px-6 pb-16">
          <div className="animate-slide-up stagger-6 flex gap-1">
            {maturityLevels.map((m) => (
              <div key={m.level} className="flex-1 text-center">
                <div
                  className="h-1.5 rounded-full opacity-50"
                  style={{ backgroundColor: m.color }}
                />
                <p className="text-[9px] text-white/25 mt-1.5 tracking-wider uppercase">
                  L{m.level}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works — warm parchment */}
      <div className="bg-warm-gray py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              {
                step: "01",
                title: "Assess",
                desc: "Rate 35 statements across 7 maturity dimensions",
              },
              {
                step: "02",
                title: "Diagnose",
                desc: "Get systemic analysis, pattern detection, and root causes",
              },
              {
                step: "03",
                title: "Act",
                desc: "Follow a sequenced 90-day plan with Pathfinder-aligned actions",
              },
            ].map((item) => (
              <div key={item.step}>
                <div className="font-display text-3xl text-gold-muted italic">
                  {item.step}
                </div>
                <h3 className="font-display text-xl text-navy mt-1">
                  {item.title}
                </h3>
                <p className="text-sm text-navy/50 mt-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 text-center space-y-2 bg-parchment">
        <div className="flex justify-center gap-6 text-xs">
          <a
            href="/manage"
            className="text-navy/40 hover:text-gold transition-colors tracking-wide uppercase"
          >
            Manage Questions
          </a>
          <a
            href="/demo"
            className="text-navy/40 hover:text-gold transition-colors tracking-wide uppercase"
          >
            View Demo
          </a>
        </div>
        <p className="text-[10px] text-navy/25 tracking-widest uppercase">
          Young Indians &mdash; Confederation of Indian Industry
        </p>
      </footer>
    </div>
  );
}
