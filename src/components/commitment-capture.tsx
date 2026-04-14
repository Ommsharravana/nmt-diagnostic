"use client";

import { useState, useMemo } from "react";

interface DimensionEntry {
  dimension: { name: string; shortName: string };
  score: number;
  maxScore: number;
  health: string;
}

interface CommitmentCaptureProps {
  assessmentId: string;
  verticalName: string;
  region: string;
  respondentName: string;
  dimensions: DimensionEntry[];
  currentLevel: number;
  weakestDimensionName: string;
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CommitmentCapture({
  assessmentId,
  verticalName,
  region,
  respondentName,
  dimensions,
  currentLevel,
  weakestDimensionName,
}: CommitmentCaptureProps) {
  const defaultDimension = useMemo(() => {
    const match = dimensions.find(
      (d) => d.dimension.name === weakestDimensionName,
    );
    return match ? match.dimension.name : dimensions[0]?.dimension.name ?? "";
  }, [dimensions, weakestDimensionName]);

  const initialTargetLevel = Math.min(5, Math.max(currentLevel + 1, 2));
  const defaultTargetDate = useMemo(() => addDays(new Date(), 90), []);

  const [focusDimension, setFocusDimension] = useState<string>(defaultDimension);
  const [targetLevel, setTargetLevel] = useState<number>(initialTargetLevel);
  const [actionItems, setActionItems] = useState<[string, string, string]>([
    "",
    "",
    "",
  ]);
  const [targetMeeting, setTargetMeeting] = useState<string>("NMT Madurai");
  const [targetDate, setTargetDate] = useState<string>(defaultTargetDate);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCommitted, setIsCommitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );

  const selectedDimension = useMemo(
    () => dimensions.find((d) => d.dimension.name === focusDimension),
    [dimensions, focusDimension],
  );

  const handleActionChange = (index: 0 | 1 | 2, value: string) => {
    setActionItems((prev) => {
      const next: [string, string, string] = [prev[0], prev[1], prev[2]];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setValidationMessage(null);

    const trimmed = actionItems.map((item) => item.trim());
    if (trimmed.some((item) => item.length === 0)) {
      setValidationMessage("Please fill in all 3 action items before committing.");
      return;
    }

    if (!selectedDimension) {
      setValidationMessage("Please select a focus dimension.");
      return;
    }

    if (targetLevel <= currentLevel) {
      setValidationMessage("Target level must be greater than current level.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          verticalName,
          region,
          respondentName,
          focusDimension: selectedDimension.dimension.name,
          focusDimensionScore: selectedDimension.score,
          currentLevel,
          targetLevel,
          actionItems: trimmed as [string, string, string],
          targetMeeting: targetMeeting.trim(),
          targetDate,
        }),
      });

      if (!response.ok) {
        let message = `Failed to save commitment (${response.status}).`;
        try {
          const data = await response.json();
          if (data && typeof data.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      setIsCommitted(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isSubmitting || isCommitted;

  const containerBorder = isCommitted
    ? "border-gold"
    : "border-gold/20";

  const labelClass =
    "text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold";

  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-navy/10 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className={`bg-white rounded-lg border ${containerBorder} p-6`}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="font-display text-2xl text-navy">
          Your Commitments for the Next NMT
        </h2>
        {isCommitted && (
          <div className="flex items-center gap-2 text-gold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-semibold uppercase tracking-wider">
              Committed!
            </span>
          </div>
        )}
      </div>
      <p className="text-sm text-navy/50 mb-6">
        Pick one dimension to strengthen. Commit to 3 specific actions before we
        meet again.
      </p>

      <div className="space-y-6">
        {/* Focus dimension picker */}
        <div>
          <label htmlFor="focus-dimension" className={`${labelClass} block mb-2`}>
            Focus Dimension
          </label>
          <select
            id="focus-dimension"
            value={focusDimension}
            onChange={(e) => setFocusDimension(e.target.value)}
            disabled={disabled}
            className={inputClass}
          >
            {dimensions.map((d) => (
              <option key={d.dimension.name} value={d.dimension.name}>
                {d.dimension.name} ({d.score}/{d.maxScore} — {d.health})
              </option>
            ))}
          </select>
        </div>

        {/* Target level selector */}
        <div>
          <label className={`${labelClass} block mb-2`}>
            Target Level (Current: L{currentLevel})
          </label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((level) => {
              const isCurrent = level === currentLevel;
              const isSelected = level === targetLevel;
              const isBelowCurrent = level <= currentLevel;
              const levelDisabled = disabled || isBelowCurrent;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setTargetLevel(level)}
                  disabled={levelDisabled}
                  className={[
                    "h-11 w-14 rounded-lg border text-sm font-semibold tracking-wider uppercase transition-colors",
                    isSelected && !levelDisabled
                      ? "bg-gold border-gold text-navy"
                      : isCurrent
                        ? "bg-navy/5 border-navy/10 text-navy/40"
                        : isBelowCurrent
                          ? "bg-white border-navy/10 text-navy/20"
                          : "bg-white border-navy/20 text-navy hover:bg-gold/10 hover:border-gold/50",
                    levelDisabled ? "cursor-not-allowed" : "",
                  ].join(" ")}
                  aria-pressed={isSelected}
                  aria-label={`Target level L${level}${isCurrent ? " (current)" : ""}`}
                >
                  L{level}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 action items */}
        <div className="space-y-4">
          <div className={labelClass}>Three Action Items</div>
          {[0, 1, 2].map((idx) => (
            <div key={idx}>
              <label
                htmlFor={`action-${idx + 1}`}
                className="text-xs text-navy/60 mb-1 block"
              >
                Action {idx + 1}
              </label>
              <textarea
                id={`action-${idx + 1}`}
                value={actionItems[idx]}
                onChange={(e) =>
                  handleActionChange(idx as 0 | 1 | 2, e.target.value)
                }
                disabled={disabled}
                required
                maxLength={500}
                rows={3}
                placeholder="e.g., Create a one-sentence vertical mission statement"
                className={`${inputClass} resize-y`}
              />
              <div className="text-[10px] text-navy/30 mt-1 text-right">
                {actionItems[idx].length}/500
              </div>
            </div>
          ))}
        </div>

        {/* Target meeting + date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="target-meeting" className={`${labelClass} block mb-2`}>
              Target Meeting
            </label>
            <input
              id="target-meeting"
              type="text"
              value={targetMeeting}
              onChange={(e) => setTargetMeeting(e.target.value)}
              disabled={disabled}
              className={inputClass}
              placeholder="NMT Madurai"
            />
          </div>
          <div>
            <label htmlFor="target-date" className={`${labelClass} block mb-2`}>
              Target Date
            </label>
            <input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled}
            className="bg-gold hover:bg-gold-light text-navy font-semibold h-12 px-8 rounded-lg tracking-wider uppercase text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isCommitted
              ? "Committed"
              : isSubmitting
                ? "Saving..."
                : "Commit & Save"}
          </button>

          {validationMessage && !isCommitted && (
            <p className="mt-3 text-sm text-red-600">{validationMessage}</p>
          )}
          {errorMessage && !isCommitted && (
            <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
