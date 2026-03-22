"use client";

import ResultsDashboard from "@/components/results-dashboard";
import { calculateResults } from "@/lib/scoring";

// Realistic mock data — MASOOM vertical assessed by SRTN region
// Scores designed to trigger multiple insight patterns:
// - Strategy weak (14) → Root cause diagnosis
// - Execution very weak (12) → High-leverage intervention
// - Impact strong (21) → "Execution Without Evidence" won't trigger
// - Brand moderate (18) → Hidden Gem won't trigger
// This creates: Strategy-Execution gap, adoption barrier, and cascade effects

const mockAnswers: Record<string, number> = {
  // Dim 0: Strategic Clarity (3,2,4,2,3 = 14 → Weak)
  d0_q0: 3, d0_q1: 2, d0_q2: 4, d0_q3: 2, d0_q4: 3,
  // Dim 1: Chapter Penetration (3,2,3,4,3 = 15 → Weak)
  d1_q0: 3, d1_q1: 2, d1_q2: 3, d1_q3: 4, d1_q4: 3,
  // Dim 2: Execution & Standardisation (2,2,2,3,3 = 12 → Critical)
  d2_q0: 2, d2_q1: 2, d2_q2: 2, d2_q3: 3, d2_q4: 3,
  // Dim 3: Regional Alignment (2,4,3,5,3 = 17 → Stable)
  d3_q0: 2, d3_q1: 4, d3_q2: 3, d3_q3: 5, d3_q4: 3,
  // Dim 4: Impact Measurement (5,4,4,5,3 = 21 → Strong)
  d4_q0: 5, d4_q1: 4, d4_q2: 4, d4_q3: 5, d4_q4: 3,
  // Dim 5: Brand Visibility (3,4,4,3,4 = 18 → Stable)
  d5_q0: 3, d5_q1: 4, d5_q2: 4, d5_q3: 3, d5_q4: 4,
  // Dim 6: Continuity (3,3,4,3,5 = 18 → Stable)
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
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      <main className="flex-1">
        <div className="animate-fade-in">
          {/* Demo banner */}
          <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium sticky top-0 z-50">
            Demo Mode — MASOOM vertical with sample scores (115/175 = Level 3 Growing)
          </div>
          <ResultsDashboard
            results={mockResults}
            onRetake={() => (window.location.href = "/")}
          />
        </div>
      </main>
    </>
  );
}
