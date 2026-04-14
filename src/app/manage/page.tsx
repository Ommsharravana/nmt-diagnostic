"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  allDimensions,
  getSelections,
  saveSelections,
  resetSelections,
} from "@/lib/questions";

/* ============================================================================
 * Engineering aesthetic — Question Selection Tool
 * Select exactly 5 questions per dimension for the active diagnostic test.
 * ==========================================================================*/

export default function ManageQuestionsPage() {
  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    typeof window !== "undefined" ? getSelections() : {}
  );
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const toggleQuestion = (dimIndex: number, questionId: string) => {
    const key = dimIndex.toString();
    const current = selections[key] || [];
    if (current.includes(questionId)) {
      setSelections({ ...selections, [key]: current.filter((id) => id !== questionId) });
    } else {
      if (current.length >= 5) return;
      setSelections({ ...selections, [key]: [...current, questionId] });
    }
    setSaved(false);
  };

  const handleSave = () => {
    const valid = allDimensions.every(
      (dim) => (selections[dim.index.toString()] || []).length === 5
    );
    if (!valid) {
      alert("Each dimension must have exactly 5 questions selected.");
      return;
    }
    saveSelections(selections);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    resetSelections();
    setSelections(getSelections());
    setSaved(false);
  };

  const totalQuestions = allDimensions.reduce((s, d) => s + d.questions.length, 0);
  const allValid = allDimensions.every(
    (d) => (selections[d.index.toString()] || []).length === 5
  );

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f4f3ef] flex items-center justify-center font-mono text-xs text-navy/20 tracking-widest uppercase">
        loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      {/* ── Top rail ── */}
      <div className="bg-navy border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-white/25 tracking-[0.25em] uppercase">NMT</span>
            <span className="text-white/15 text-sm">›</span>
            <span className="font-mono text-[10px] text-gold/60 tracking-[0.25em] uppercase">Question Selection</span>
          </div>
          <Link
            href="/"
            className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/30 hover:text-white/70 px-3 py-1.5 border border-transparent hover:border-white/10 rounded-sm transition-colors"
          >
            ← Back to Test
          </Link>
        </div>
      </div>

      {/* ── Page title ── */}
      <div className="bg-navy/95 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-gold/50 mb-1">
            Active Test Configuration
          </p>
          <h1 className="font-display text-2xl text-white tracking-tight">
            Question Selection
          </h1>
          <p className="font-mono text-[10px] text-white/30 mt-1">
            {totalQuestions} questions in bank across {allDimensions.length} dimensions — select exactly 5 per dimension
          </p>
        </div>
      </div>

      {/* ── Summary bar ── */}
      <div className="bg-white border-b border-navy/8 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-navy/30 mr-2">
              selection status
            </span>
            {allDimensions.map((dim) => {
              const count = (selections[dim.index.toString()] || []).length;
              const isValid = count === 5;
              return (
                <span
                  key={dim.index}
                  className={`
                    font-mono text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-sm border
                    ${isValid
                      ? "border-emerald-200 text-emerald-700 bg-emerald-50/70"
                      : "border-amber-200 text-amber-700 bg-amber-50/60"
                    }
                  `}
                >
                  {dim.shortName}: {count}/5
                </span>
              );
            })}
            <span className={`ml-auto font-mono text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-sm border ${allValid ? "border-emerald-300 text-emerald-700 bg-emerald-50/70" : "border-navy/10 text-navy/35"}`}>
              {allValid ? "ready" : "incomplete"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Dimension cards ── */}
      <div className="max-w-3xl mx-auto px-6 py-7 space-y-4 pb-36">
        {allDimensions.map((dim) => {
          const selected = new Set(selections[dim.index.toString()] || []);
          const count = selected.size;
          const isValid = count === 5;
          const isFull = count >= 5;

          return (
            <div key={dim.index} className="border border-navy/8 bg-white rounded overflow-hidden">
              {/* Dimension header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-navy/6 bg-navy/[0.015]">
                <div>
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold/60">
                    dim_{dim.index} / {dim.shortName}
                  </span>
                  <h2 className="font-display text-base text-navy mt-0.5">{dim.name}</h2>
                  <p className="font-mono text-[9px] text-navy/30 mt-0.5">
                    {dim.questions.length} questions available — select exactly 5
                  </p>
                </div>
                <span
                  className={`
                    font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 border rounded-sm
                    ${isValid
                      ? "border-emerald-300 text-emerald-700 bg-emerald-50/80"
                      : isFull
                        ? "border-red-200 text-red-700 bg-red-50/60"
                        : "border-amber-200 text-amber-700 bg-amber-50/60"
                    }
                  `}
                >
                  {count}/5
                </span>
              </div>

              {/* Question list */}
              <div className="divide-y divide-navy/[0.04]">
                {dim.questions.map((q) => {
                  const isSelected = selected.has(q.id);
                  const isDisabled = !isSelected && isFull;

                  return (
                    <button
                      key={q.id}
                      onClick={() => toggleQuestion(dim.index, q.id)}
                      disabled={isDisabled}
                      aria-pressed={isSelected}
                      className={`
                        w-full text-left px-5 py-3.5 flex items-start gap-4 transition-colors
                        ${isSelected
                          ? "bg-navy/[0.03] hover:bg-navy/[0.05]"
                          : isDisabled
                            ? "opacity-35 cursor-not-allowed bg-transparent"
                            : "hover:bg-gold/[0.025] cursor-pointer"
                        }
                      `}
                    >
                      {/* Custom checkbox */}
                      <div
                        className={`
                          shrink-0 mt-0.5 w-4 h-4 border rounded-sm flex items-center justify-center transition-colors
                          ${isSelected
                            ? "bg-navy border-navy"
                            : "border-navy/20 bg-white"
                          }
                        `}
                      >
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Q label + text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2.5">
                          <span className="font-mono text-[9px] tracking-wider uppercase text-navy/25 shrink-0">
                            Q{q.questionNumber}
                          </span>
                          <span className={`text-sm leading-relaxed ${isSelected ? "text-navy" : "text-navy/60"}`}>
                            {q.text}
                          </span>
                        </div>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <span className="shrink-0 font-mono text-[8px] tracking-wider uppercase text-gold/60 border border-gold/20 px-1.5 py-0.5 rounded-sm mt-0.5">
                          active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Sticky bottom action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-navy/10 shadow-[0_-4px_20px_rgba(12,20,37,0.08)]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="font-mono text-[10px] text-navy/40 tracking-wider">
            {allValid
              ? "all dimensions complete — ready to commit"
              : `${allDimensions.filter((d) => (selections[d.index.toString()] || []).length === 5).length} of ${allDimensions.length} dimensions complete`
            }
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 rounded-sm border border-navy/12 text-navy/50 hover:text-navy/80 hover:border-navy/20 transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={!allValid}
              className={`
                font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-2 rounded-sm border transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed
                ${saved
                  ? "border-emerald-300 text-emerald-700 bg-emerald-50/80"
                  : "border-gold/50 text-gold hover:border-gold bg-gold/5 hover:bg-gold/10"
                }
              `}
            >
              {saved ? "committed" : "Commit Selection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
