"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// SelectGroup and SelectLabel used in vertical dropdown
import { getTestQuestions } from "@/lib/questions";
import { verticals, regions } from "@/lib/yi-data";
import type { TestState } from "@/lib/types";

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
  const stepHeadingRef = useRef<HTMLDivElement>(null);

  // Progress: 0% at step 0, 100% at last step
  const progress = (state.currentStep / (TOTAL_STEPS - 1)) * 100;

  // Focus the step heading on step change for screen readers
  useEffect(() => {
    if (state.currentStep > 0 && stepHeadingRef.current) {
      stepHeadingRef.current.focus();
    }
  }, [state.currentStep]);

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
        {/* Screen reader announcement for step changes */}
        <div aria-live="polite" className="sr-only">
          {state.currentStep === 0
            ? "Getting started — enter your vertical information"
            : `Dimension ${state.currentStep} of ${testDimensions.length}: ${testDimensions[state.currentStep - 1]?.name}`}
        </div>

        {/* Progress Header */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-navy/40">
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
              <CardTitle className="font-display text-2xl">Before we begin...</CardTitle>
              <p className="text-navy/40">
                Tell us which vertical you&apos;re assessing
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Vertical Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-navy/70">
                  Vertical <span className="text-red-500">*</span>
                </label>
                <Select
                  value={state.verticalName}
                  onValueChange={(value) => value && updateField("verticalName", value)}
                >
                  <SelectTrigger
                    className="w-full h-12 px-4 text-base bg-white"
                    aria-describedby={errors.verticalName ? "verticalName-error" : undefined}
                  >
                    <SelectValue placeholder="Select a vertical..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Nation Building Projects</SelectLabel>
                      {verticals
                        .filter((v) => v.category === "project")
                        .map((v) => (
                          <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                        ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>MYTRI Stakeholders</SelectLabel>
                      {verticals
                        .filter((v) => v.category === "stakeholder")
                        .map((v) => (
                          <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                        ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Youth Leadership Initiatives</SelectLabel>
                      {verticals
                        .filter((v) => v.category === "initiative")
                        .map((v) => (
                          <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                        ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Other</SelectLabel>
                      {verticals
                        .filter((v) => v.category === "other")
                        .map((v) => (
                          <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.verticalName && (
                  <p id="verticalName-error" className="text-sm text-red-500">{errors.verticalName}</p>
                )}
              </div>

              {/* Region Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-navy/70">
                  Region{" "}
                  <span className="text-navy/30 font-normal">(optional)</span>
                </label>
                <Select
                  value={state.region}
                  onValueChange={(value) => value && updateField("region", value)}
                >
                  <SelectTrigger className="w-full h-12 px-4 text-base bg-white">
                    <SelectValue placeholder="Select region..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="National">National</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.code} — {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Respondent Name */}
              <div className="space-y-2">
                <label htmlFor="respondentName" className="text-sm font-medium text-navy/70">
                  Your Name{" "}
                  <span className="text-navy/30 font-normal">(optional)</span>
                </label>
                <input
                  id="respondentName"
                  type="text"
                  maxLength={60}
                  value={state.respondentName}
                  onChange={(e) =>
                    updateField("respondentName", e.target.value)
                  }
                  placeholder="Name of the respondent"
                  className="w-full px-4 py-3 rounded-lg border border-navy/10 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
                />
              </div>

              <div className="bg-navy/[0.03] rounded-lg p-4 border border-navy/10">
                <p className="text-sm text-navy/70">
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
              ref={stepHeadingRef}
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
            className="text-navy/40"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="bg-navy hover:bg-navy-light px-8 h-12 text-base font-medium rounded-xl shadow-md"
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
import { forwardRef } from "react";

const DimensionStep = forwardRef<
  HTMLDivElement,
  {
    dimension: ReturnType<typeof getTestQuestions>[number];
    answers: Record<string, number>;
    onAnswer: (id: string, score: number) => void;
    error?: string;
    stepNumber: number;
  }
>(function DimensionStep({ dimension, answers, onAnswer, error, stepNumber }, ref) {
  const dimensionColors = [
    "from-[#0c1425] to-[#162033]",
    "from-[#0f1a2e] to-[#1a2744]",
    "from-[#121d30] to-[#1d2e4a]",
    "from-[#151f32] to-[#203450]",
    "from-[#0e1928] to-[#182a42]",
    "from-[#111c2f] to-[#1c3048]",
    "from-[#141e31] to-[#1f334e]",
  ];

  return (
    <div className="space-y-4">
      {/* Dimension header */}
      <div
        ref={ref}
        tabIndex={-1}
        className={`bg-gradient-to-r ${dimensionColors[stepNumber - 1]} rounded-xl p-6 text-white shadow-lg outline-none`}
      >
        <p className="text-sm font-medium opacity-80">
          Dimension {stepNumber} of 7
        </p>
        <h2 className="font-display text-2xl mt-1">{dimension.name}</h2>
        <p className="text-sm opacity-80 mt-2">
          Rate each statement from 1 (Strongly Disagree) to 5 (Strongly Agree)
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600" role="alert">
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
            <p className="text-sm text-navy/40 mb-2">
              Statement {index + 1} of 5
            </p>
            <p className="text-base font-medium text-navy mb-4 leading-relaxed">
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
                      ? "bg-navy text-white shadow-md scale-105"
                      : "bg-navy/5 text-navy/50 hover:bg-navy/10"
                  }`}
                  title={rating.label}
                  aria-label={`Rate statement ${index + 1} as ${rating.value} - ${rating.label}`}
                >
                  {rating.short}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1.5 px-1">
              <span className="text-[10px] text-navy/30">
                Strongly Disagree
              </span>
              <span className="text-[10px] text-navy/30">Strongly Agree</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
