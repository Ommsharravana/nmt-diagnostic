"use client";

import { useState, useEffect, useCallback } from "react";
import LandingPage from "@/components/landing-page";
import TestFlow from "@/components/test-flow";
import ResultsDashboard from "@/components/results-dashboard";
import { OverallResult, TestState } from "@/lib/types";
import { calculateResults } from "@/lib/scoring";

type AppView = "landing" | "test" | "results";

export default function Home() {
  const [view, setView] = useState<AppView>("landing");
  const [testState, setTestState] = useState<TestState>({
    verticalName: "",
    respondentName: "",
    region: "",
    currentStep: 0,
    answers: {},
  });
  const [results, setResults] = useState<OverallResult | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    if (view === "test") {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [view]);

  // Auto-save results to Supabase
  const saveResults = useCallback(async (result: OverallResult) => {
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      if (data.id) {
        setAssessmentId(data.id);
        window.history.replaceState(null, "", `/results/${data.id}`);
      }
    } catch {
      // Silent fail — results still show locally
    }
  }, []);

  const handleStartTest = () => {
    setView("test");
  };

  const handleTestComplete = (state: TestState) => {
    const result = calculateResults(
      state.answers,
      state.verticalName,
      state.respondentName,
      state.region
    );
    setResults(result);
    setView("results");
    saveResults(result);
  };

  const handleRetake = () => {
    setTestState({
      verticalName: "",
      respondentName: "",
      region: "",
      currentStep: 0,
      answers: {},
    });
    setResults(null);
    setAssessmentId(null);
    window.history.replaceState(null, "", "/");
    setView("landing");
  };

  return (
    <main className="flex-1">
      <div key={view} className="animate-fade-in">
        {view === "landing" && <LandingPage onStart={handleStartTest} />}
        {view === "test" && (
          <TestFlow
            state={testState}
            setState={setTestState}
            onComplete={handleTestComplete}
          />
        )}
        {view === "results" && results && (
          <ResultsDashboard
            results={results}
            onRetake={handleRetake}
            assessmentId={assessmentId}
          />
        )}
      </div>
    </main>
  );
}
