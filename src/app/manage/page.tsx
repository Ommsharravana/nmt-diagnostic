"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  allDimensions,
  getSelections,
  saveSelections,
  resetSelections,
} from "@/lib/questions";

export default function ManagePage() {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSelections(getSelections());
    setMounted(true);
  }, []);

  const toggleQuestion = (dimIndex: number, questionId: string) => {
    const key = dimIndex.toString();
    const current = selections[key] || [];

    if (current.includes(questionId)) {
      setSelections({
        ...selections,
        [key]: current.filter((id) => id !== questionId),
      });
    } else {
      if (current.length >= 5) return;
      setSelections({
        ...selections,
        [key]: [...current, questionId],
      });
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

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <p className="text-navy/30">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-parchment">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <a href="/" className="text-xs text-gold-muted hover:text-gold tracking-wider uppercase">
              &larr; Back to test
            </a>
          </div>
          <h1 className="font-display text-2xl text-navy">
            Manage Questions
          </h1>
          <p className="text-sm text-navy/40 mt-1">
            Select exactly 5 questions per dimension for the diagnostic test.
            The full bank has {allDimensions.reduce((s, d) => s + d.questions.length, 0)} questions across 7 dimensions.
            Changes are saved to this browser.
          </p>
        </div>

        <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-navy/5">
          <div className="flex gap-2 flex-wrap flex-1">
            {allDimensions.map((dim) => {
              const count = (selections[dim.index.toString()] || []).length;
              const isValid = count === 5;
              return (
                <Badge
                  key={dim.index}
                  variant="outline"
                  className={`text-xs ${
                    isValid
                      ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                      : "border-red-300 text-red-700 bg-red-50"
                  }`}
                >
                  {dim.shortName}: {count}/5
                </Badge>
              );
            })}
          </div>
        </div>

        {allDimensions.map((dim) => {
          const selected = new Set(selections[dim.index.toString()] || []);
          const count = selected.size;
          const isValid = count === 5;

          return (
            <Card key={dim.index} className="border border-navy/5 shadow-none bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-base text-navy">
                    {dim.index + 1}. {dim.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      isValid
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                        : count > 5
                          ? "border-red-300 text-red-700 bg-red-50"
                          : "border-amber-300 text-amber-700 bg-amber-50"
                    }`}
                  >
                    {count}/5 selected
                  </Badge>
                </div>
                <p className="text-xs text-navy/30">
                  {dim.questions.length} questions available — select exactly 5
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {dim.questions.map((q) => {
                  const isSelected = selected.has(q.id);
                  return (
                    <button
                      key={q.id}
                      onClick={() => toggleQuestion(dim.index, q.id)}
                      disabled={!isSelected && count >= 5}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-navy/[0.03] border-navy/15 hover:bg-navy/[0.06]"
                          : count >= 5
                            ? "bg-navy/[0.01] border-navy/5 opacity-40 cursor-not-allowed"
                            : "bg-white border-navy/10 hover:bg-navy/[0.02] hover:border-navy/15"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? "bg-navy border-navy"
                            : "border-navy/20"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-navy/70 leading-relaxed">
                          Q{q.questionNumber}. {q.text}
                        </span>
                        {isSelected && count === 5 && (
                          <span className="text-[10px] text-gold-muted ml-2">
                            (deselect another first to swap)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        <Separator />

        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center sticky bottom-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-navy/10">
          <div className="text-sm text-navy/40">
            {allDimensions.every(
              (d) => (selections[d.index.toString()] || []).length === 5
            )
              ? "All dimensions have 5 questions — ready to save"
              : "Select exactly 5 questions per dimension"}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="rounded-lg border-navy/10 text-navy/50"
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-lg bg-navy hover:bg-navy-light"
              disabled={
                !allDimensions.every(
                  (d) =>
                    (selections[d.index.toString()] || []).length === 5
                )
              }
            >
              {saved ? "Saved!" : "Save Selection"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
