"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTestQuestions } from "@/lib/questions";
import { verticals, regions } from "@/lib/yi-data";
import type { TestState } from "@/lib/types";
import PriorCommitmentsCheck from "@/components/prior-commitments-check";
import { forwardRef } from "react";

// Module-scoped helper: does this vertical have pending commitments?
async function hasPendingCommitments(verticalName: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `/api/commitments/pending?vertical=${encodeURIComponent(verticalName)}`,
      { signal: controller.signal },
    );
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

interface TestFlowProps {
  state: TestState;
  setState: (state: TestState) => void;
  onComplete: (state: TestState) => void;
}

const ratingLabels = [
  { value: 1, label: "Strongly Disagree", short: "1" },
  { value: 2, label: "Disagree", short: "2" },
  { value: 3, label: "Neutral", short: "3" },
  { value: 4, label: "Agree", short: "4" },
  { value: 5, label: "Strongly Agree", short: "5" },
];

// Dimension chapter marks — Roman numerals for ceremonial gravitas
const CHAPTER_MARKS = ["I", "II", "III", "IV", "V", "VI", "VII"];

export default function TestFlow({ state, setState, onComplete }: TestFlowProps) {
  const testDimensions = useMemo(() => getTestQuestions(), []);
  const TOTAL_STEPS = testDimensions.length + 1;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const stepHeadingRef = useRef<HTMLDivElement>(null);

  const [showingPriorReview, setShowingPriorReview] = useState(false);
  const [checkingPriorCommitments, setCheckingPriorCommitments] = useState(false);

  const progress = (state.currentStep / (TOTAL_STEPS - 1)) * 100;

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
      newErrors.verticalName = "Please select a vertical";
    }
    if (!state.chairName.trim()) {
      newErrors.chairName = "Please enter the Chair's name";
    }
    if (!state.coChairName.trim()) {
      newErrors.coChairName = "Please enter the Co-Chair's name";
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

  const advanceStep = useCallback(() => {
    if (state.currentStep === TOTAL_STEPS - 1) {
      const finalState: TestState = {
        ...state,
        respondentName: state.respondentName.trim() || state.chairName.trim(),
      };
      onComplete(finalState);
    } else {
      setState({ ...state, currentStep: state.currentStep + 1 });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state, setState, onComplete, TOTAL_STEPS]);

  const handleNext = async () => {
    if (state.currentStep === 0) {
      if (!validateInfoStep()) return;
      setCheckingPriorCommitments(true);
      const hasPending = await hasPendingCommitments(state.verticalName);
      setCheckingPriorCommitments(false);
      if (hasPending) {
        setShowingPriorReview(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      advanceStep();
      return;
    }

    if (!validateDimensionStep()) return;
    advanceStep();
  };

  const handlePriorReviewDone = useCallback(() => {
    setShowingPriorReview(false);
    advanceStep();
  }, [advanceStep]);

  const handlePriorReviewSkip = useCallback(() => {
    setShowingPriorReview(false);
    advanceStep();
  }, [advanceStep]);

  const handleBack = () => {
    if (state.currentStep > 0) {
      setState({ ...state, currentStep: state.currentStep - 1 });
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isLastStep = state.currentStep === TOTAL_STEPS - 1;
  const answeredCount = state.currentStep > 0
    ? testDimensions[state.currentStep - 1]?.questions.filter((q) => state.answers[q.id]).length ?? 0
    : 0;
  const totalQuestions = state.currentStep > 0
    ? testDimensions[state.currentStep - 1]?.questions.length ?? 0
    : 0;

  return (
    <div className="min-h-screen bg-parchment">
      {/* Screen reader announcement */}
      <div aria-live="polite" className="sr-only">
        {showingPriorReview
          ? "Reviewing prior commitments before the assessment"
          : state.currentStep === 0
            ? "Getting started — enter your vertical information"
            : `Dimension ${state.currentStep} of ${testDimensions.length}: ${testDimensions[state.currentStep - 1]?.name}`}
      </div>

      {/* ─── Progress bar — fixed at very top, hairline ─────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-navy/5">
        <div
          className="h-full bg-gold transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Assessment progress"
        />
      </div>

      <div className="max-w-xl mx-auto px-4 pb-24 pt-8">
        {/* Step counter — subtle, top-right feel */}
        <div className="flex justify-between items-center mb-8 text-xs tracking-[0.12em] uppercase text-navy/35 font-medium">
          <span>
            {showingPriorReview
              ? "Closing the Loop"
              : state.currentStep === 0
                ? "Getting Started"
                : `Chapter ${CHAPTER_MARKS[state.currentStep - 1]} of ${CHAPTER_MARKS[testDimensions.length - 1]}`}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>

        {/* Prior Commitments Review */}
        {showingPriorReview && (
          <PriorCommitmentsCheck
            verticalName={state.verticalName}
            onAllReviewed={handlePriorReviewDone}
            onSkip={handlePriorReviewSkip}
          />
        )}

        {/* ─── Info Step ─────────────────────────────────────────────────── */}
        {!showingPriorReview && state.currentStep === 0 && (
          <div className="animate-slide-up">
            {/* Chapter opening ornament */}
            <div className="text-center mb-10">
              <div className="inline-block">
                <div className="w-px h-8 bg-gold/40 mx-auto mb-3" />
                <div className="text-[10px] tracking-[0.3em] uppercase text-gold/70 font-semibold mb-3">
                  National Management Team
                </div>
                <div className="w-px h-8 bg-gold/40 mx-auto" />
              </div>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl text-navy text-center mb-2 leading-tight">
              Before we begin
            </h1>
            <p className="text-center text-navy/45 text-sm mb-10 leading-relaxed">
              Tell us which vertical you&apos;re assessing today.<br />
              You&apos;ll rate 35 statements across 7 dimensions — about 5 minutes.
            </p>

            {/* Vertical Select */}
            <div className="mb-6">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-navy/50 font-semibold mb-3">
                Vertical <span className="text-gold">*</span>
              </label>
              <Select
                value={state.verticalName}
                onValueChange={(value) => value && updateField("verticalName", value)}
              >
                <SelectTrigger
                  className="w-full h-13 px-4 text-base bg-white border-navy/12 rounded-xl shadow-sm text-navy data-placeholder:text-navy/35 focus:ring-gold/40 focus:border-gold/50"
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
                <p id="verticalName-error" className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <span aria-hidden="true">—</span> {errors.verticalName}
                </p>
              )}
            </div>

            {/* Region Select */}
            <div className="mb-6">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-navy/50 font-semibold mb-3">
                Region <span className="text-navy/25 font-normal normal-case tracking-normal text-xs">optional</span>
              </label>
              <Select
                value={state.region}
                onValueChange={(value) => value && updateField("region", value)}
              >
                <SelectTrigger className="w-full h-13 px-4 text-base bg-white border-navy/12 rounded-xl shadow-sm text-navy data-placeholder:text-navy/35 focus:ring-gold/40 focus:border-gold/50">
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

            {/* Horizontal rule */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-navy/8" />
              <div className="w-1 h-1 rounded-full bg-gold/50" />
              <div className="flex-1 h-px bg-navy/8" />
            </div>

            {/* Chair + Co-Chair side by side on sm+, stacked on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div>
                <label htmlFor="chairName" className="block text-[10px] tracking-[0.2em] uppercase text-navy/50 font-semibold mb-3">
                  Chair <span className="text-gold">*</span>
                </label>
                <input
                  id="chairName"
                  type="text"
                  maxLength={100}
                  value={state.chairName}
                  onChange={(e) => updateField("chairName", e.target.value)}
                  placeholder="Chair's name"
                  aria-describedby={errors.chairName ? "chairName-error" : undefined}
                  className="w-full h-13 px-4 rounded-xl border border-navy/12 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/50 shadow-sm text-base transition-all"
                />
                {errors.chairName && (
                  <p id="chairName-error" className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <span aria-hidden="true">—</span> {errors.chairName}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="coChairName" className="block text-[10px] tracking-[0.2em] uppercase text-navy/50 font-semibold mb-3">
                  Co-Chair <span className="text-gold">*</span>
                </label>
                <input
                  id="coChairName"
                  type="text"
                  maxLength={100}
                  value={state.coChairName}
                  onChange={(e) => updateField("coChairName", e.target.value)}
                  placeholder="Co-Chair's name"
                  aria-describedby={errors.coChairName ? "coChairName-error" : undefined}
                  className="w-full h-13 px-4 rounded-xl border border-navy/12 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/50 shadow-sm text-base transition-all"
                />
                {errors.coChairName && (
                  <p id="coChairName-error" className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <span aria-hidden="true">—</span> {errors.coChairName}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-navy/40 mb-10 leading-relaxed">
              Per the Yi playbook, Chair and Co-Chair take the assessment jointly.
            </p>

            {/* How it works — muted callout */}
            <div className="border-l-2 border-gold/30 pl-5 py-1">
              <p className="text-sm text-navy/55 leading-relaxed">
                You&apos;ll rate <strong className="text-navy/70 font-semibold">35 statements</strong> across{" "}
                <strong className="text-navy/70 font-semibold">7 dimensions</strong> on a 1–5 scale.
                Results are calculated instantly and a shareable link is generated.
              </p>
            </div>
          </div>
        )}

        {/* ─── Dimension Steps ───────────────────────────────────────────── */}
        {!showingPriorReview && state.currentStep > 0 && state.currentStep <= testDimensions.length && (
          <DimensionStep
            ref={stepHeadingRef}
            dimension={testDimensions[state.currentStep - 1]}
            answers={state.answers}
            onAnswer={setAnswer}
            error={errors.dimension}
            stepNumber={state.currentStep}
            chapterMark={CHAPTER_MARKS[state.currentStep - 1]}
            answeredCount={answeredCount}
            totalQuestions={totalQuestions}
          />
        )}

        {/* ─── Navigation ────────────────────────────────────────────────── */}
        {!showingPriorReview && (
          <div className="mt-10 flex justify-between items-center">
            <button
              type="button"
              onClick={handleBack}
              disabled={state.currentStep === 0 || checkingPriorCommitments}
              className="text-sm text-navy/40 hover:text-navy/70 disabled:opacity-0 disabled:pointer-events-none transition-all tracking-wide"
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={checkingPriorCommitments}
              className="group relative inline-flex items-center gap-3 bg-navy text-white text-sm font-semibold tracking-[0.08em] uppercase px-8 h-13 rounded-xl shadow-lg hover:bg-navy/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {checkingPriorCommitments ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Checking…
                </span>
              ) : isLastStep ? (
                <>
                  <span>View Results</span>
                  <span className="text-gold/80 transition-transform group-hover:translate-x-0.5">→</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <span className="text-gold/80 transition-transform group-hover:translate-x-0.5">→</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DimensionStep sub-component ─────────────────────────────────────────────

const DimensionStep = forwardRef<
  HTMLDivElement,
  {
    dimension: ReturnType<typeof getTestQuestions>[number];
    answers: Record<string, number>;
    onAnswer: (id: string, score: number) => void;
    error?: string;
    stepNumber: number;
    chapterMark: string;
    answeredCount: number;
    totalQuestions: number;
  }
>(function DimensionStep(
  { dimension, answers, onAnswer, error, stepNumber, chapterMark, answeredCount, totalQuestions },
  ref,
) {
  return (
    <div>
      {/* Chapter header — the "turning the page" moment */}
      <div
        ref={ref}
        tabIndex={-1}
        className="outline-none mb-10"
        aria-label={`Dimension ${stepNumber}: ${dimension.name}`}
      >
        {/* Gold chapter mark */}
        <div className="text-center mb-6">
          <div className="inline-flex flex-col items-center gap-2">
            <div className="w-px h-6 bg-gold/35 mx-auto" />
            <span className="font-display text-gold/60 text-sm tracking-[0.3em]">{chapterMark}</span>
            <div className="w-px h-6 bg-gold/35 mx-auto" />
          </div>
        </div>

        {/* Dimension name — large, serif, centered */}
        <h2 className="font-display text-2xl sm:text-3xl text-navy text-center leading-tight mb-3">
          {dimension.name}
        </h2>

        {/* Subtitle row */}
        <div className="flex items-center justify-center gap-4 text-xs tracking-[0.15em] uppercase text-navy/35 font-medium">
          <span>Dimension {stepNumber} of 7</span>
          <span className="w-1 h-1 rounded-full bg-navy/20" />
          <span>{answeredCount}/{totalQuestions} rated</span>
        </div>

        {/* Hairline rule under header */}
        <div className="mt-6 h-px bg-navy/8" />
      </div>

      {/* Validation error */}
      {error && (
        <div
          role="alert"
          className="mb-6 border-l-2 border-red-400 pl-4 py-1"
        >
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {dimension.questions.map((question, index) => {
          const isAnswered = !!answers[question.id];
          return (
            <div
              key={question.id}
              className={`transition-all duration-200 ${isAnswered ? "opacity-100" : "opacity-90"}`}
            >
              {/* Statement number + text */}
              <div className="mb-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-navy/30 font-semibold mb-2">
                  {index + 1} of 5
                </p>
                <p className="text-base text-navy leading-relaxed font-medium">
                  {question.text}
                </p>
              </div>

              {/* Rating buttons — 5 in a row, ceremonial feel */}
              <div
                className="flex gap-2"
                role="group"
                aria-label={`Rating for statement ${index + 1}`}
              >
                {ratingLabels.map((rating) => {
                  const isSelected = answers[question.id] === rating.value;
                  return (
                    <button
                      key={rating.value}
                      type="button"
                      onClick={() => onAnswer(question.id, rating.value)}
                      className={[
                        "flex-1 min-h-[44px] rounded-lg text-sm font-bold transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
                        isSelected
                          ? "bg-navy text-white shadow-md scale-[1.05] ring-1 ring-navy/20"
                          : "bg-white border border-navy/10 text-navy/40 hover:border-navy/25 hover:text-navy/70 hover:bg-navy/[0.03] shadow-sm",
                      ].join(" ")}
                      title={rating.label}
                      aria-label={`Rate statement ${index + 1} as ${rating.value} — ${rating.label}`}
                      aria-pressed={isSelected}
                    >
                      {rating.short}
                    </button>
                  );
                })}
              </div>

              {/* Scale labels */}
              <div className="flex justify-between mt-2 px-0.5">
                <span className="text-[9px] tracking-[0.1em] uppercase text-navy/25">Strongly Disagree</span>
                <span className="text-[9px] tracking-[0.1em] uppercase text-navy/25">Strongly Agree</span>
              </div>

              {/* Answered indicator — subtle gold underline */}
              {isAnswered && (
                <div className="mt-3 h-px bg-gold/20" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
