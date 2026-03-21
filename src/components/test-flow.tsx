"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getTestQuestions } from "@/lib/questions";
import { TestState } from "@/lib/types";

interface TestFlowProps {
  state: TestState;
  setState: (state: TestState) => void;
  onComplete: (state: TestState) => void;
}

const testDimensions = getTestQuestions();
const TOTAL_STEPS = testDimensions.length + 1; // info step + 7 dimensions

const ratingLabels = [
  { value: 1, label: "Strongly Disagree", short: "1" },
  { value: 2, label: "Disagree", short: "2" },
  { value: 3, label: "Neutral", short: "3" },
  { value: 4, label: "Agree", short: "4" },
  { value: 5, label: "Strongly Agree", short: "5" },
];

export default function TestFlow({ state, setState, onComplete }: TestFlowProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const progress = (state.currentStep / TOTAL_STEPS) * 100;

  const updateField = (field: keyof TestState, value: string) => {
    setState({ ...state, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const setAnswer = (questionId: string, score: number) => {
    setState({
      ...state,
      answers: { ...state.answers, [questionId]: score },
    });
  };

  const validateInfoStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!state.verticalName.trim()) {
      newErrors.verticalName = "Please enter the vertical name";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDimensionStep = (): boolean => {
    const dim = testDimensions[state.currentStep - 1];
    const unanswered = dim.questions.filter((q) => !state.answers[q.id]);
    if (unanswered.length > 0) {
      setErrors({ dimension: "Please rate all 5 statements before continuing" });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (state.currentStep === 0) {
      if (!validateInfoStep()) return;
    } else {
      if (!validateDimensionStep()) return;
    }

    if (state.currentStep === TOTAL_STEPS - 1) {
      onComplete(state);
    } else {
      setState({ ...state, currentStep: state.currentStep + 1 });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (state.currentStep > 0) {
      setState({ ...state, currentStep: state.currentStep - 1 });
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress Header */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-slate-500">
            <span>
              {state.currentStep === 0
                ? "Getting Started"
                : `Dimension ${state.currentStep} of ${testDimensions.length}`}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Info Step */}
        {state.currentStep === 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Before we begin...</CardTitle>
              <p className="text-slate-500">
                Tell us which vertical you&apos;re assessing
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="verticalName" className="text-sm font-medium text-slate-700">
                  Vertical Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="verticalName"
                  type="text"
                  value={state.verticalName}
                  onChange={(e) => updateField("verticalName", e.target.value)}
                  placeholder="e.g., MASOOM, Health, Climate Change..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {errors.verticalName && (
                  <p className="text-sm text-red-500">{errors.verticalName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="respondentName" className="text-sm font-medium text-slate-700">
                  Your Name{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="respondentName"
                  type="text"
                  value={state.respondentName}
                  onChange={(e) =>
                    updateField("respondentName", e.target.value)
                  }
                  placeholder="Name of the respondent"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="region" className="text-sm font-medium text-slate-700">
                  Region / Chapter{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="region"
                  type="text"
                  value={state.region}
                  onChange={(e) => updateField("region", e.target.value)}
                  placeholder="e.g., SRTN, National, Erode..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>How it works:</strong> You&apos;ll rate 35 statements
                  across 7 dimensions on a scale of 1-5. It takes about 5
                  minutes. Your results are calculated instantly — nothing is
                  stored.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dimension Steps */}
        {state.currentStep > 0 &&
          state.currentStep <= testDimensions.length && (
            <DimensionStep
              dimension={testDimensions[state.currentStep - 1]}
              answers={state.answers}
              onAnswer={setAnswer}
              error={errors.dimension}
              stepNumber={state.currentStep}
            />
          )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={state.currentStep === 0}
            className="text-slate-500"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-700 px-8 h-12 text-base font-medium rounded-xl shadow-md"
          >
            {state.currentStep === TOTAL_STEPS - 1
              ? "View Results"
              : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Sub-component for each dimension's questions
function DimensionStep({
  dimension,
  answers,
  onAnswer,
  error,
  stepNumber,
}: {
  dimension: ReturnType<typeof getTestQuestions>[number];
  answers: Record<string, number>;
  onAnswer: (id: string, score: number) => void;
  error?: string;
  stepNumber: number;
}) {
  const dimensionColors = [
    "from-blue-500 to-blue-600",
    "from-indigo-500 to-indigo-600",
    "from-violet-500 to-violet-600",
    "from-purple-500 to-purple-600",
    "from-fuchsia-500 to-fuchsia-600",
    "from-pink-500 to-pink-600",
    "from-rose-500 to-rose-600",
  ];

  return (
    <div className="space-y-4">
      {/* Dimension header */}
      <div
        className={`bg-gradient-to-r ${dimensionColors[stepNumber - 1]} rounded-xl p-6 text-white shadow-lg`}
      >
        <p className="text-sm font-medium opacity-80">
          Dimension {stepNumber} of 7
        </p>
        <h2 className="text-2xl font-bold mt-1">{dimension.name}</h2>
        <p className="text-sm opacity-80 mt-2">
          Rate each statement from 1 (Strongly Disagree) to 5 (Strongly Agree)
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Questions */}
      {dimension.questions.map((question, index) => (
        <Card
          key={question.id}
          className={`border-0 shadow-md transition-all ${
            answers[question.id] ? "bg-white" : "bg-white/80"
          }`}
        >
          <CardContent className="p-5">
            <p className="text-sm text-slate-500 mb-2">
              Statement {index + 1} of 5
            </p>
            <p className="text-base font-medium text-slate-800 mb-4 leading-relaxed">
              {question.text}
            </p>

            {/* Rating buttons */}
            <div className="flex gap-2" role="group" aria-label={`Rating for statement ${index + 1}`}>
              {ratingLabels.map((rating) => (
                <button
                  key={rating.value}
                  onClick={() => onAnswer(question.id, rating.value)}
                  className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                    answers[question.id] === rating.value
                      ? "bg-blue-600 text-white shadow-md scale-105"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  title={rating.label}
                  aria-label={`Rate statement ${index + 1} as ${rating.value} - ${rating.label}`}
                >
                  {rating.short}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1.5 px-1">
              <span className="text-[10px] text-slate-400">
                Strongly Disagree
              </span>
              <span className="text-[10px] text-slate-400">Strongly Agree</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
