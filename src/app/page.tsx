"use client";

import { useState } from "react";
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
    setView("landing");
  };

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
            <ResultsDashboard results={results} onRetake={handleRetake} />
          )}
        </div>
      </main>
    </>
  );
}
