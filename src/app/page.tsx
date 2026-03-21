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
    <main className="flex-1">
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
    </main>
  );
}
