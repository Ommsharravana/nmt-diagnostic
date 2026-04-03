"use client";

import ResultsDashboard from "@/components/results-dashboard";
import { calculateResults } from "@/lib/scoring";

const mockAnswers: Record<string, number> = {
  d0_q0: 3, d0_q1: 2, d0_q2: 4, d0_q3: 2, d0_q4: 3,
  d1_q0: 3, d1_q1: 2, d1_q2: 3, d1_q3: 4, d1_q4: 3,
  d2_q0: 2, d2_q1: 2, d2_q2: 2, d2_q3: 3, d2_q4: 3,
  d3_q0: 2, d3_q1: 4, d3_q2: 3, d3_q3: 5, d3_q4: 3,
  d4_q0: 5, d4_q1: 4, d4_q2: 4, d4_q3: 5, d4_q4: 3,
  d5_q0: 3, d5_q1: 4, d5_q2: 4, d5_q3: 3, d5_q4: 4,
  d6_q0: 3, d6_q1: 3, d6_q2: 4, d6_q3: 3, d6_q4: 5,
};

const mockResults = calculateResults(
  mockAnswers,
  "MASOOM",
  "NMT Assessment Team",
  "SRTN"
);

export default function DemoPage() {
  return (
    <main className="flex-1">
      <div className="animate-fade-in">
        <div className="bg-gold text-navy text-center py-2 text-[10px] font-semibold tracking-[0.2em] uppercase sticky top-0 z-50">
          Demo — MASOOM &middot; 115/175 &middot; Level 3 Growing
        </div>
        <ResultsDashboard
          results={mockResults}
          onRetake={() => (window.location.href = "/")}
        />
      </div>
    </main>
  );
}
