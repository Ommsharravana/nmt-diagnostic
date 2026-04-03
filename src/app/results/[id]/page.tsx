"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ResultsDashboard from "@/components/results-dashboard";
import { OverallResult } from "@/lib/types";

export default function SharedResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const [results, setResults] = useState<OverallResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/assessments/${id}`);
        if (!res.ok) {
          setError("Assessment not found");
          return;
        }
        const data = await res.json();
        setResults(data.full_result);
      } catch {
        setError("Failed to load assessment");
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-navy/40 text-sm mt-3 tracking-wide">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <div className="text-center max-w-md px-6">
          <h2 className="font-display text-2xl text-navy">Assessment Not Found</h2>
          <p className="text-navy/40 text-sm mt-2">
            This assessment link may have expired or the ID is incorrect.
          </p>
          <a
            href="/"
            className="inline-block mt-6 px-6 py-3 bg-navy text-white rounded-lg text-sm tracking-wider uppercase hover:bg-navy-light transition-colors"
          >
            Take New Assessment
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1">
      <div className="animate-fade-in">
        <div className="bg-gold/80 text-navy text-center py-2 text-[10px] font-semibold tracking-[0.2em] uppercase sticky top-0 z-50">
          Saved Assessment &middot; {results.date}
        </div>
        <ResultsDashboard
          results={results}
          onRetake={() => (window.location.href = "/")}
          assessmentId={id}
        />
      </div>
    </main>
  );
}
