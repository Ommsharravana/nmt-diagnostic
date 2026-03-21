"use client";

import { Button } from "@/components/ui/button";

interface LandingPageProps {
  onStart: () => void;
}

const dimensions = [
  { name: "Strategic Clarity", icon: "🎯" },
  { name: "Chapter Penetration", icon: "🌍" },
  { name: "Execution Standards", icon: "⚙️" },
  { name: "Regional Alignment", icon: "🤝" },
  { name: "Impact & Data", icon: "📊" },
  { name: "Brand Visibility", icon: "✨" },
  { name: "Continuity", icon: "🔄" },
];

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Yi Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
            Young Indians — National Management Team
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Vertical Diagnostic
            <span className="block text-blue-600">Maturity Test</span>
          </h1>

          {/* Description */}
          <p className="text-lg text-slate-600 max-w-lg mx-auto leading-relaxed">
            Assess your vertical&apos;s health across 7 dimensions. Answer 35
            questions, get instant insights on maturity level, strengths, and
            priority areas for improvement.
          </p>

          {/* Dimension pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {dimensions.map((d) => (
              <span
                key={d.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-sm text-slate-700 shadow-sm"
              >
                <span>{d.icon}</span>
                {d.name}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-4">
            <Button
              onClick={onStart}
              size="lg"
              className="h-14 px-10 text-lg font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:shadow-blue-200 hover:-translate-y-0.5"
            >
              Start Diagnostic
            </Button>
            <p className="mt-3 text-sm text-slate-400">
              Takes about 5 minutes
            </p>
          </div>

          {/* Scoring preview */}
          <div className="pt-8 grid grid-cols-5 gap-1 max-w-xs mx-auto">
            {[
              { label: "Level 1", color: "bg-red-400" },
              { label: "Level 2", color: "bg-orange-400" },
              { label: "Level 3", color: "bg-yellow-400" },
              { label: "Level 4", color: "bg-blue-400" },
              { label: "Level 5", color: "bg-emerald-400" },
            ].map((level) => (
              <div key={level.label} className="text-center">
                <div
                  className={`h-2 rounded-full ${level.color} opacity-60`}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {level.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400">
        Young Indians — CII &middot; NMT Vertical Diagnostic Tool
      </footer>
    </div>
  );
}
