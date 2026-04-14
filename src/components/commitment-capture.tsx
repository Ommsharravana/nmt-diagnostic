"use client";

import { useState, useMemo, useEffect } from "react";
import { getNextMeeting, DEFAULT_NEXT_MEETING } from "@/lib/next-meeting";

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
  chairName?: string;
  coChairName?: string;
  dimensions: DimensionEntry[];
  currentLevel: number;
  weakestDimensionName: string;
  totalScore?: number;
  maturityState?: string;
}

// --- Utility helpers ---
function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(ymd: string): string {
  // ymd = YYYY-MM-DD — display as "14 Apr 2026"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [yy, mm, dd] = ymd.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${String(dd).padStart(2, "0")} ${months[mm - 1]} ${yy}`;
}

// --- Module-scoped fetch helper with 10s AbortController timeout ---
// (silent-failure-auditor compliance: always time-out, always surface an error)
async function postCommitment(
  body: Record<string, unknown>,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("/api/commitments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      let message = `Failed to save commitment (${response.status}).`;
      try {
        const data = await response.json();
        if (data && typeof data.error === "string") message = data.error;
      } catch {
        // ignore parse errors
      }
      return { ok: false, error: message };
    }
    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "Request timed out after 10s. Please try again." };
    }
    const message =
      err instanceof Error ? err.message : "Something went wrong. Please try again.";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

// --- Health badge color mapping ---
const healthBadgeClass: Record<string, string> = {
  Strong: "bg-emerald-50 border-emerald-300 text-emerald-800",
  Stable: "bg-blue-50 border-blue-300 text-blue-800",
  Weak: "bg-amber-50 border-amber-300 text-amber-800",
  Critical: "bg-red-50 border-red-300 text-red-800",
};

interface ActionRow {
  text: string;
  owner: string;
  deadline: string;
}

export default function CommitmentCapture({
  assessmentId,
  verticalName,
  region,
  respondentName,
  chairName,
  coChairName,
  dimensions,
  currentLevel,
  weakestDimensionName,
  totalScore,
  maturityState,
}: CommitmentCaptureProps) {
  // --- Derived defaults ---
  const defaultDimension = useMemo(() => {
    const match = dimensions.find(
      (d) => d.dimension.name === weakestDimensionName,
    );
    return match ? match.dimension.name : dimensions[0]?.dimension.name ?? "";
  }, [dimensions, weakestDimensionName]);

  const initialTargetLevel = Math.min(5, Math.max(currentLevel + 1, 2));
  // Seed synchronously from DEFAULT_NEXT_MEETING (SSR-safe); the effect
  // below replaces these with any admin-configured value on mount.
  const defaultDeadline = DEFAULT_NEXT_MEETING.date;
  const todayYmd = useMemo(() => addDays(new Date(), 0), []);

  // --- Header state (chair / co-chair editable if empty) ---
  const [chairValue, setChairValue] = useState<string>(chairName ?? "");
  const [coChairValue, setCoChairValue] = useState<string>(coChairName ?? "");

  // --- Dimension observations state ---
  const [dimensionObservations, setDimensionObservations] = useState<
    Record<string, string>
  >({});

  // --- Focus dimension state ---
  const [focusDimension, setFocusDimension] = useState<string>(defaultDimension);
  const [targetLevel, setTargetLevel] = useState<number>(initialTargetLevel);
  const [focusReason, setFocusReason] = useState<string>("");

  // --- Action commitments state (3 rows) ---
  const [actionRows, setActionRows] = useState<[ActionRow, ActionRow, ActionRow]>([
    { text: "", owner: "", deadline: defaultDeadline },
    { text: "", owner: "", deadline: defaultDeadline },
    { text: "", owner: "", deadline: defaultDeadline },
  ]);

  // --- Target meeting state ---
  // Seeded synchronously from the default so SSR and first client render match.
  // The effect below overrides both the meeting name and each row's deadline
  // with the admin-configured value (if any) once we can safely touch
  // localStorage.
  const [targetMeeting, setTargetMeeting] = useState<string>(
    DEFAULT_NEXT_MEETING.name,
  );

  useEffect(() => {
    // Run once on mount to pick up any admin-configured next meeting.
    const next = getNextMeeting();
    setTargetMeeting((curr) => (curr === DEFAULT_NEXT_MEETING.name ? next.name : curr));
    setActionRows((prev) => {
      // Only replace deadlines that still match the default — never clobber a
      // deadline the user has already edited.
      const apply = (r: ActionRow): ActionRow =>
        r.deadline === DEFAULT_NEXT_MEETING.date
          ? { ...r, deadline: next.date }
          : r;
      return [apply(prev[0]), apply(prev[1]), apply(prev[2])];
    });
  }, []);

  // --- Submission state ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCommitted, setIsCommitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const selectedDimension = useMemo(
    () => dimensions.find((d) => d.dimension.name === focusDimension),
    [dimensions, focusDimension],
  );

  // --- Handlers ---
  const handleObservationChange = (idx: number, value: string) => {
    setDimensionObservations((prev) => ({ ...prev, [String(idx)]: value }));
  };

  const handleActionChange = (
    index: 0 | 1 | 2,
    field: keyof ActionRow,
    value: string,
  ) => {
    setActionRows((prev) => {
      const next: [ActionRow, ActionRow, ActionRow] = [
        { ...prev[0] },
        { ...prev[1] },
        { ...prev[2] },
      ];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // --- Validation (derived from state) ---
  const trimmedReason = focusReason.trim();
  const reasonValid = trimmedReason.length > 0 && trimmedReason.length <= 1000;
  const actionsValid = actionRows.every(
    (r) =>
      r.text.trim().length > 0 &&
      r.text.length <= 500 &&
      r.owner.trim().length > 0 &&
      r.owner.length <= 100 &&
      /^\d{4}-\d{2}-\d{2}$/.test(r.deadline),
  );
  const canSubmit = reasonValid && actionsValid && !!selectedDimension;

  const handleSubmit = async () => {
    setErrorMessage(null);
    setValidationMessage(null);

    if (!selectedDimension) {
      setValidationMessage("Please select a focus dimension.");
      return;
    }
    if (!reasonValid) {
      setValidationMessage(
        "Please explain why this dimension matters (max 1000 chars).",
      );
      return;
    }
    if (!actionsValid) {
      setValidationMessage(
        "Each action must have text, an owner, and a deadline.",
      );
      return;
    }
    if (targetLevel <= currentLevel) {
      setValidationMessage("Target level must be greater than current level.");
      return;
    }

    setIsSubmitting(true);

    // Compute target date = max of the 3 deadlines
    const deadlines = actionRows.map((r) => r.deadline).sort();
    const targetDate = deadlines[deadlines.length - 1];

    // Build detailed action items
    const actionItemsDetailed = actionRows.map((r) => ({
      text: r.text.trim(),
      owner: r.owner.trim(),
      deadline: r.deadline,
      status: "pending" as const,
      notes: "",
    }));

    // Include only non-empty observations
    const observationsToSend: Record<string, string> = {};
    for (const [k, v] of Object.entries(dimensionObservations)) {
      if (v.trim().length > 0) observationsToSend[k] = v;
    }

    const body: Record<string, unknown> = {
      assessmentId,
      verticalName,
      region,
      respondentName,
      chairName: chairValue.trim() || undefined,
      coChairName: coChairValue.trim() || undefined,
      focusDimension: selectedDimension.dimension.name,
      focusDimensionScore: selectedDimension.score,
      currentLevel,
      targetLevel,
      focusReason: trimmedReason,
      // Legacy actionItems array (text-only) kept for back-compat
      actionItems: actionItemsDetailed.map((a) => a.text),
      actionItemsDetailed,
      dimensionObservations: observationsToSend,
      targetMeeting: targetMeeting.trim(),
      targetDate,
    };

    const result = await postCommitment(body);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.error ?? "Could not save your commitment.");
      return;
    }

    setIsCommitted(true);
  };

  // --- Style constants ---
  const disabled = isSubmitting || isCommitted;
  const containerBorder = isCommitted ? "border-gold" : "border-gold/20";

  const labelClass =
    "text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold";

  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-navy/10 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-60 disabled:cursor-not-allowed";

  const smallInputClass =
    "w-full px-3 py-2 rounded-md border border-navy/10 bg-white text-navy text-sm placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-60 disabled:cursor-not-allowed";

  const sectionHeadingClass =
    "font-display text-lg text-navy border-b border-gold/30 pb-2 mb-4";

  return (
    <div className={`bg-white rounded-lg border ${containerBorder} p-6`}>
      {/* =============================================================
          HEADER SECTION
          ============================================================= */}
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
        Capture the scores, pick one dimension to strengthen, and commit to
        three actions before the next NMT.
      </p>

      {/* Info grid — mirrors the top band of Rohan's paper sheet */}
      <div className="bg-parchment/40 border border-navy/5 rounded-lg p-4 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
          <div>
            <div className={labelClass}>Vertical</div>
            <div className="text-sm text-navy font-semibold mt-1">
              {verticalName}
            </div>
          </div>
          <div>
            <div className={labelClass}>Date</div>
            <div className="text-sm text-navy font-semibold mt-1">
              {formatDisplayDate(todayYmd)}
            </div>
          </div>
          <div>
            <div className={labelClass}>Region</div>
            <div className="text-sm text-navy font-semibold mt-1">
              {region || "—"}
            </div>
          </div>
          <div>
            <div className={labelClass}>Chair</div>
            {chairName && chairName.trim().length > 0 ? (
              <div className="text-sm text-navy font-semibold mt-1">
                {chairName}
              </div>
            ) : (
              <input
                type="text"
                value={chairValue}
                onChange={(e) => setChairValue(e.target.value)}
                disabled={disabled}
                maxLength={100}
                placeholder="Chair name"
                className={`${smallInputClass} mt-1`}
                aria-label="Chair name"
              />
            )}
          </div>
          <div>
            <div className={labelClass}>Co-Chair</div>
            {coChairName && coChairName.trim().length > 0 ? (
              <div className="text-sm text-navy font-semibold mt-1">
                {coChairName}
              </div>
            ) : (
              <input
                type="text"
                value={coChairValue}
                onChange={(e) => setCoChairValue(e.target.value)}
                disabled={disabled}
                maxLength={100}
                placeholder="Co-Chair name"
                className={`${smallInputClass} mt-1`}
                aria-label="Co-Chair name"
              />
            )}
          </div>
          <div>
            <div className={labelClass}>Total Score / Maturity</div>
            <div className="text-sm text-navy font-semibold mt-1">
              {typeof totalScore === "number" ? `${totalScore}/175` : "—"}
              {maturityState ? (
                <span className="text-navy/60 font-normal">
                  {" "}
                  &middot; L{currentLevel} {maturityState}
                </span>
              ) : (
                <span className="text-navy/60 font-normal">
                  {" "}
                  &middot; L{currentLevel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =============================================================
          DIMENSION SCORES TABLE
          ============================================================= */}
      <section className="mb-8">
        <h3 className={sectionHeadingClass}>Dimension Scores</h3>

        {/* Desktop: wide table */}
        <div className="hidden sm:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className="py-2 px-3 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold border-b border-navy/10 w-[28%]">
                  Dimension
                </th>
                <th className="py-2 px-3 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold border-b border-navy/10 w-[10%]">
                  /25
                </th>
                <th className="py-2 px-3 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold border-b border-navy/10 w-[14%]">
                  Health
                </th>
                <th className="py-2 px-3 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold border-b border-navy/10">
                  Quick Observation
                </th>
              </tr>
            </thead>
            <tbody>
              {dimensions.map((d, idx) => {
                const healthClass =
                  healthBadgeClass[d.health] ??
                  "bg-navy/5 border-navy/10 text-navy/60";
                const obsValue = dimensionObservations[String(idx)] ?? "";
                return (
                  <tr
                    key={d.dimension.name}
                    className="align-middle border-b border-navy/5 last:border-b-0"
                  >
                    <td className="py-2 px-3 text-sm text-navy font-medium">
                      {d.dimension.name}
                    </td>
                    <td className="py-2 px-3 text-sm text-navy tabular-nums">
                      {d.score}/{d.maxScore}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${healthClass}`}
                      >
                        {d.health}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={obsValue}
                        onChange={(e) =>
                          handleObservationChange(idx, e.target.value)
                        }
                        disabled={disabled}
                        maxLength={500}
                        placeholder="Optional: one line per dimension"
                        className={smallInputClass}
                        aria-label={`Quick observation for ${d.dimension.name}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards */}
        <div className="sm:hidden space-y-3">
          {dimensions.map((d, idx) => {
            const healthClass =
              healthBadgeClass[d.health] ??
              "bg-navy/5 border-navy/10 text-navy/60";
            const obsValue = dimensionObservations[String(idx)] ?? "";
            return (
              <div
                key={d.dimension.name}
                className="border border-navy/10 rounded-lg p-3 space-y-2 bg-white/50"
              >
                <div className="flex justify-between items-start gap-3">
                  <span className="font-medium text-sm text-navy leading-snug">
                    {d.dimension.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-navy tabular-nums">
                      {d.score}/{d.maxScore}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-semibold uppercase tracking-wider ${healthClass}`}
                    >
                      {d.health}
                    </span>
                  </div>
                </div>
                <input
                  type="text"
                  value={obsValue}
                  onChange={(e) =>
                    handleObservationChange(idx, e.target.value)
                  }
                  disabled={disabled}
                  maxLength={500}
                  placeholder="Optional observation"
                  className={smallInputClass}
                  aria-label={`Quick observation for ${d.dimension.name}`}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* =============================================================
          FOCUS DIMENSION SECTION
          ============================================================= */}
      <section className="mb-8">
        <h3 className={sectionHeadingClass}>Focus Dimension</h3>

        <div className="space-y-5">
          {/* Dropdown */}
          <div>
            <label
              htmlFor="focus-dimension"
              className={`${labelClass} block mb-2`}
            >
              Pick one dimension to strengthen
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

          {/* L→L picker */}
          <div>
            <label className={`${labelClass} block mb-2`}>
              Target Level (Current: L{currentLevel})
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className="h-11 w-14 rounded-lg border border-navy/15 bg-navy/5 text-navy/50 flex items-center justify-center text-sm font-semibold tracking-wider uppercase"
                  aria-label={`Current level L${currentLevel}`}
                >
                  L{currentLevel}
                </div>
                <span className="text-[9px] uppercase tracking-wider text-navy/40 mt-1">
                  Current
                </span>
              </div>
              <span
                className="text-navy/30 px-1 text-xl leading-none"
                aria-hidden="true"
              >
                &rarr;
              </span>
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

          {/* Why this dimension */}
          <div>
            <label htmlFor="focus-reason" className={`${labelClass} block mb-2`}>
              Why this dimension? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="focus-reason"
              value={focusReason}
              onChange={(e) => setFocusReason(e.target.value)}
              disabled={disabled}
              required
              maxLength={1000}
              rows={3}
              placeholder="Because..."
              className={`${inputClass} resize-y`}
            />
            <div className="text-[10px] text-navy/30 mt-1 text-right">
              {focusReason.length}/1000
            </div>
          </div>
        </div>
      </section>

      {/* =============================================================
          ACTION COMMITMENTS TABLE (3 required)
          ============================================================= */}
      <section className="mb-8">
        <h3 className={sectionHeadingClass}>Action Commitments (3 required)</h3>

        <div className="space-y-4">
          {[0, 1, 2].map((idx) => {
            const row = actionRows[idx];
            return (
              <div
                key={idx}
                className="border border-navy/10 rounded-lg p-4 bg-parchment/20"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-7 w-7 rounded-full bg-gold/90 text-navy text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div className={labelClass}>Action {idx + 1}</div>
                </div>

                <div className="space-y-3">
                  {/* Action item text */}
                  <div>
                    <label
                      htmlFor={`action-text-${idx}`}
                      className="text-xs text-navy/60 mb-1 block"
                    >
                      Action item <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id={`action-text-${idx}`}
                      value={row.text}
                      onChange={(e) =>
                        handleActionChange(
                          idx as 0 | 1 | 2,
                          "text",
                          e.target.value,
                        )
                      }
                      disabled={disabled}
                      required
                      maxLength={500}
                      rows={2}
                      placeholder="Be specific: what exactly will you do?"
                      className={`${inputClass} resize-y`}
                    />
                    <div className="text-[10px] text-navy/30 mt-1 text-right">
                      {row.text.length}/500
                    </div>
                  </div>

                  {/* Owner + Deadline row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor={`action-owner-${idx}`}
                        className="text-xs text-navy/60 mb-1 block"
                      >
                        Owner <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`action-owner-${idx}`}
                        type="text"
                        value={row.owner}
                        onChange={(e) =>
                          handleActionChange(
                            idx as 0 | 1 | 2,
                            "owner",
                            e.target.value,
                          )
                        }
                        disabled={disabled}
                        required
                        maxLength={100}
                        placeholder="Who owns this?"
                        className={smallInputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`action-deadline-${idx}`}
                        className="text-xs text-navy/60 mb-1 block"
                      >
                        Deadline <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`action-deadline-${idx}`}
                        type="date"
                        value={row.deadline}
                        onChange={(e) =>
                          handleActionChange(
                            idx as 0 | 1 | 2,
                            "deadline",
                            e.target.value,
                          )
                        }
                        disabled={disabled}
                        required
                        className={smallInputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-navy/40 mt-3 italic">
          Next NMT status will be captured during the follow-up review, not now.
        </p>
      </section>

      {/* =============================================================
          TARGET MEETING
          ============================================================= */}
      <section className="mb-8">
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
      </section>

      {/* =============================================================
          SUBMIT
          ============================================================= */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !canSubmit}
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
  );
}
