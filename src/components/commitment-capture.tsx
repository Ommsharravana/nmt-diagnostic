"use client";

import { useState, useMemo } from "react";
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [yy, mm, dd] = ymd.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(dd).padStart(2, "0")} ${months[mm - 1]} ${yy}`;
}

// --- Module-scoped fetch helper with 10s AbortController timeout ---
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

// --- Health badge config ---
const healthConfig: Record<string, { pill: string; bar: string }> = {
  Strong:   { pill: "bg-emerald-50 border-emerald-200 text-emerald-700", bar: "bg-emerald-400" },
  Stable:   { pill: "bg-blue-50 border-blue-200 text-blue-700",          bar: "bg-blue-400"   },
  Weak:     { pill: "bg-amber-50 border-amber-200 text-amber-700",        bar: "bg-amber-400"  },
  Critical: { pill: "bg-red-50 border-red-200 text-red-700",              bar: "bg-red-400"    },
};

interface ActionRow {
  text: string;
  owner: string;
  deadline: string;
}

const LABEL = "block text-[10px] tracking-[0.2em] uppercase text-navy/40 font-semibold mb-2.5";
const INPUT = "w-full px-4 py-3 rounded-xl border border-navy/10 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm transition-all";
const INPUT_SM = "w-full px-3 py-2.5 rounded-lg border border-navy/10 bg-white text-navy text-sm placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all";
const SECTION_RULE = "w-full h-px bg-navy/8 my-8";

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
    const match = dimensions.find((d) => d.dimension.name === weakestDimensionName);
    return match ? match.dimension.name : dimensions[0]?.dimension.name ?? "";
  }, [dimensions, weakestDimensionName]);

  const initialTargetLevel = Math.min(5, Math.max(currentLevel + 1, 2));
  const todayYmd = useMemo(() => addDays(new Date(), 0), []);

  // Resolve next meeting once (pure function) — used to seed initial state.
  const initialNextMeeting = useMemo(
    () => (typeof window !== "undefined" ? getNextMeeting() : DEFAULT_NEXT_MEETING),
    [],
  );
  const initialDeadline = initialNextMeeting.date;

  // --- State ---
  const [chairValue, setChairValue] = useState<string>(chairName ?? "");
  const [coChairValue, setCoChairValue] = useState<string>(coChairName ?? "");
  const [dimensionObservations, setDimensionObservations] = useState<Record<string, string>>({});
  const [focusDimension, setFocusDimension] = useState<string>(defaultDimension);
  const [targetLevel, setTargetLevel] = useState<number>(initialTargetLevel);
  const [focusReason, setFocusReason] = useState<string>("");
  const [actionRows, setActionRows] = useState<[ActionRow, ActionRow, ActionRow]>(() => [
    { text: "", owner: "", deadline: initialDeadline },
    { text: "", owner: "", deadline: initialDeadline },
    { text: "", owner: "", deadline: initialDeadline },
  ]);
  const [targetMeeting, setTargetMeeting] = useState<string>(() => initialNextMeeting.name);
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

  const handleActionChange = (index: 0 | 1 | 2, field: keyof ActionRow, value: string) => {
    setActionRows((prev) => {
      const next: [ActionRow, ActionRow, ActionRow] = [{ ...prev[0] }, { ...prev[1] }, { ...prev[2] }];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // --- Validation ---
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

  // Per-field validity for inline error highlighting
  const fieldMissing = {
    dimension: !selectedDimension,
    reason: !reasonValid,
    actions: actionRows.map((r) => ({
      text: r.text.trim().length === 0,
      owner: r.owner.trim().length === 0,
      deadline: !/^\d{4}-\d{2}-\d{2}$/.test(r.deadline),
    })),
  };
  const missingList: string[] = [];
  if (fieldMissing.dimension) missingList.push("Focus dimension");
  if (fieldMissing.reason) missingList.push("Why this dimension");
  fieldMissing.actions.forEach((a, i) => {
    const miss: string[] = [];
    if (a.text) miss.push("description");
    if (a.owner) miss.push("owner");
    if (a.deadline) miss.push("deadline");
    if (miss.length > 0) missingList.push(`Action ${i + 1}: ${miss.join(" + ")}`);
  });
  const missingCount = missingList.length;

  const handleSubmit = async () => {
    setErrorMessage(null);
    setValidationMessage(null);

    if (!selectedDimension) { setValidationMessage("Please select a focus dimension."); return; }
    if (!reasonValid) { setValidationMessage("Please explain why this dimension matters (max 1000 chars)."); return; }
    if (!actionsValid) { setValidationMessage("Each action must have text, an owner, and a deadline."); return; }
    if (targetLevel <= currentLevel) { setValidationMessage("Target level must be greater than current level."); return; }

    setIsSubmitting(true);

    const deadlines = actionRows.map((r) => r.deadline).sort();
    const targetDate = deadlines[deadlines.length - 1];

    const actionItemsDetailed = actionRows.map((r) => ({
      text: r.text.trim(),
      owner: r.owner.trim(),
      deadline: r.deadline,
      status: "pending" as const,
      notes: "",
    }));

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

  const disabled = isSubmitting || isCommitted;

  // ─── Success state ──────────────────────────────────────────────────────────
  if (isCommitted) {
    return (
      <div className="bg-white rounded-2xl border border-gold/30 shadow-lg p-8 text-center">
        {/* Gold ornament */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-px h-6 bg-gold/35" />
          <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              className="w-7 h-7 text-gold" aria-hidden="true">
              <path fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                clipRule="evenodd" />
            </svg>
          </div>
          <div className="w-px h-6 bg-gold/35" />
        </div>
        <h3 className="font-display text-2xl text-navy mb-2">Commitments Saved</h3>
        <p className="text-sm text-navy/50 leading-relaxed max-w-sm mx-auto">
          Your commitments for <strong className="text-navy/70">{verticalName}</strong> have been recorded.
          We&apos;ll revisit them at the next NMT.
        </p>
        <div className="mt-6 pt-6 border-t border-navy/8">
          <p className="text-[10px] tracking-[0.2em] uppercase text-navy/35 font-medium">
            Target meeting · {targetMeeting}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-navy/8 shadow-sm">
      {/* ─── Page header ────────────────────────────────────────────────── */}
      <div className="px-6 pt-8 pb-6 border-b border-navy/8">
        {/* Chapter ornament */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-px h-5 bg-gold/35" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-gold/65 font-semibold">Commitments</span>
          <div className="w-px h-5 bg-gold/35" />
        </div>

        <h2 className="font-display text-2xl sm:text-3xl text-navy text-center mb-2 leading-tight">
          Your Commitments for the Next NMT
        </h2>
        <p className="text-center text-sm text-navy/45 leading-relaxed max-w-md mx-auto">
          Capture your scores, pick one dimension to strengthen, and commit to three actions.
        </p>
      </div>

      <div className="px-6 py-8 space-y-0">
        {/* ─── Info grid ──────────────────────────────────────────────────── */}
        <div className="bg-parchment/60 border border-navy/6 rounded-xl p-5 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            {/* Vertical */}
            <div>
              <div className={LABEL}>Vertical</div>
              <div className="text-sm text-navy font-semibold">{verticalName}</div>
            </div>
            {/* Date */}
            <div>
              <div className={LABEL}>Date</div>
              <div className="text-sm text-navy font-semibold">{formatDisplayDate(todayYmd)}</div>
            </div>
            {/* Region */}
            <div>
              <div className={LABEL}>Region</div>
              <div className="text-sm text-navy font-semibold">{region || "—"}</div>
            </div>
            {/* Chair */}
            <div>
              <div className={LABEL}>Chair</div>
              {chairName && chairName.trim().length > 0 ? (
                <div className="text-sm text-navy font-semibold">{chairName}</div>
              ) : (
                <input
                  type="text" value={chairValue} onChange={(e) => setChairValue(e.target.value)}
                  disabled={disabled} maxLength={100} placeholder="Chair name"
                  className={INPUT_SM} aria-label="Chair name"
                />
              )}
            </div>
            {/* Co-Chair */}
            <div>
              <div className={LABEL}>Co-Chair</div>
              {coChairName && coChairName.trim().length > 0 ? (
                <div className="text-sm text-navy font-semibold">{coChairName}</div>
              ) : (
                <input
                  type="text" value={coChairValue} onChange={(e) => setCoChairValue(e.target.value)}
                  disabled={disabled} maxLength={100} placeholder="Co-Chair name"
                  className={INPUT_SM} aria-label="Co-Chair name"
                />
              )}
            </div>
            {/* Score */}
            <div>
              <div className={LABEL}>Score / Maturity</div>
              <div className="text-sm text-navy font-semibold">
                {typeof totalScore === "number" ? `${totalScore}/175` : "—"}
                {maturityState ? (
                  <span className="text-navy/50 font-normal"> · L{currentLevel} {maturityState}</span>
                ) : (
                  <span className="text-navy/50 font-normal"> · L{currentLevel}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Section: Dimension Scores ──────────────────────────────────── */}
        <section aria-labelledby="dim-scores-heading">
          <div className="flex items-center gap-3 mb-5">
            <h3 id="dim-scores-heading" className="font-display text-lg text-navy">Dimension Scores</h3>
            <div className="flex-1 h-px bg-gold/20" />
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl border border-navy/8 overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-parchment/80">
                  <th className="text-left py-3 px-4 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold border-b border-navy/8 w-[30%]">Dimension</th>
                  <th className="text-left py-3 px-4 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold border-b border-navy/8 w-[12%]">Score</th>
                  <th className="text-left py-3 px-4 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold border-b border-navy/8 w-[16%]">Health</th>
                  <th className="text-left py-3 px-4 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold border-b border-navy/8">Quick Observation</th>
                </tr>
              </thead>
              <tbody>
                {dimensions.map((d, idx) => {
                  const hc = healthConfig[d.health] ?? { pill: "bg-navy/5 border-navy/10 text-navy/50", bar: "bg-navy/20" };
                  const obsValue = dimensionObservations[String(idx)] ?? "";
                  const pct = Math.round((d.score / d.maxScore) * 100);
                  return (
                    <tr key={d.dimension.name} className="border-b border-navy/5 last:border-b-0 hover:bg-parchment/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-navy">{d.dimension.name}</div>
                        {/* Score bar */}
                        <div className="mt-1.5 w-full h-1 bg-navy/6 rounded-full overflow-hidden">
                          <div className={`h-full ${hc.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="py-3 px-4 tabular-nums font-semibold text-navy">{d.score}/{d.maxScore}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${hc.pill}`}>
                          {d.health}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <input type="text" value={obsValue}
                          onChange={(e) => handleObservationChange(idx, e.target.value)}
                          disabled={disabled} maxLength={500}
                          placeholder="One-line observation..."
                          className={INPUT_SM}
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
              const hc = healthConfig[d.health] ?? { pill: "bg-navy/5 border-navy/10 text-navy/50", bar: "bg-navy/20" };
              const obsValue = dimensionObservations[String(idx)] ?? "";
              const pct = Math.round((d.score / d.maxScore) * 100);
              return (
                <div key={d.dimension.name} className="border border-navy/8 rounded-xl p-4 bg-white shadow-sm space-y-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <span className="font-medium text-sm text-navy leading-snug">{d.dimension.name}</span>
                      <div className="mt-1.5 w-full h-1 bg-navy/6 rounded-full overflow-hidden">
                        <div className={`h-full ${hc.bar} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <span className="text-sm font-bold text-navy tabular-nums">{d.score}/{d.maxScore}</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-semibold uppercase tracking-wider ${hc.pill}`}>
                        {d.health}
                      </span>
                    </div>
                  </div>
                  <input type="text" value={obsValue}
                    onChange={(e) => handleObservationChange(idx, e.target.value)}
                    disabled={disabled} maxLength={500}
                    placeholder="Optional observation"
                    className={INPUT_SM}
                    aria-label={`Quick observation for ${d.dimension.name}`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <div className={SECTION_RULE} />

        {/* ─── Section: Focus Dimension ────────────────────────────────────── */}
        <section aria-labelledby="focus-dim-heading">
          <div className="flex items-center gap-3 mb-5">
            <h3 id="focus-dim-heading" className="font-display text-lg text-navy">Focus Dimension</h3>
            <div className="flex-1 h-px bg-gold/20" />
          </div>

          <div className="space-y-6">
            {/* Dropdown */}
            <div>
              <label htmlFor="focus-dimension" className={LABEL}>
                Pick one dimension to strengthen
              </label>
              <select
                id="focus-dimension"
                value={focusDimension}
                onChange={(e) => setFocusDimension(e.target.value)}
                disabled={disabled}
                className={INPUT}
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
              <div className={LABEL}>Target Level — currently at L{currentLevel}</div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Current level pill (disabled) */}
                <div className="flex flex-col items-center gap-1">
                  <div className="h-11 w-14 rounded-xl border border-navy/15 bg-navy/5 text-navy/45 flex items-center justify-center text-sm font-bold tracking-wide">
                    L{currentLevel}
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-navy/35">Now</span>
                </div>

                <span className="text-navy/25 text-lg px-1 leading-none" aria-hidden="true">→</span>

                {[1, 2, 3, 4, 5].map((level) => {
                  const isSelected = level === targetLevel;
                  const isBelowOrAtCurrent = level <= currentLevel;
                  const levelDisabled = disabled || isBelowOrAtCurrent;
                  return (
                    <div key={level} className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTargetLevel(level)}
                        disabled={levelDisabled}
                        className={[
                          "h-11 w-14 rounded-xl border text-sm font-bold tracking-wide uppercase transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
                          isSelected && !levelDisabled
                            ? "bg-gold border-gold text-navy shadow-md scale-[1.05]"
                            : isBelowOrAtCurrent
                              ? "bg-white border-navy/8 text-navy/20 cursor-not-allowed"
                              : "bg-white border-navy/15 text-navy/55 hover:border-gold/50 hover:bg-gold/8 hover:text-navy",
                        ].join(" ")}
                        aria-pressed={isSelected}
                        aria-label={`Target level L${level}${level === currentLevel ? " — current level, cannot select" : ""}`}
                      >
                        L{level}
                      </button>
                      {isSelected && !levelDisabled && (
                        <span className="text-[9px] uppercase tracking-wider text-gold/70">Target</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Why this dimension */}
            <div>
              <label htmlFor="focus-reason" className={LABEL}>
                Why this dimension? <span className="text-gold normal-case tracking-normal text-xs font-normal">required</span>
              </label>
              <textarea
                id="focus-reason"
                value={focusReason}
                onChange={(e) => setFocusReason(e.target.value)}
                disabled={disabled}
                required
                maxLength={1000}
                rows={3}
                placeholder="What specifically holds this dimension back, and why is it the right lever to pull now?"
                className={`${INPUT} resize-y leading-relaxed`}
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-navy/30">
                  {trimmedReason.length === 0 && "Be specific — this becomes your team's north star"}
                </span>
                <span className={`text-[10px] ${focusReason.length > 900 ? "text-amber-500" : "text-navy/25"}`}>
                  {focusReason.length}/1000
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className={SECTION_RULE} />

        {/* ─── Section: Action Commitments ────────────────────────────────── */}
        <section aria-labelledby="actions-heading">
          <div className="flex items-center gap-3 mb-5">
            <h3 id="actions-heading" className="font-display text-lg text-navy">Action Commitments</h3>
            <div className="flex-1 h-px bg-gold/20" />
          </div>

          <div className="space-y-5">
            {([0, 1, 2] as const).map((idx) => {
              const row = actionRows[idx];
              const numeral = ["I", "II", "III"][idx];
              return (
                <div key={idx} className="rounded-xl border border-navy/8 overflow-hidden shadow-sm">
                  {/* Action header bar */}
                  <div className="flex items-center gap-3 px-5 py-3 bg-parchment/60 border-b border-navy/6">
                    <span className="font-display text-sm text-gold/70">{numeral}</span>
                    <span className="text-[10px] tracking-[0.2em] uppercase text-navy/40 font-semibold">
                      Action {idx + 1}
                    </span>
                    {row.text.trim().length > 0 && (
                      <span className="ml-auto text-[10px] tracking-wider uppercase text-navy/30">
                        {row.text.length}/500
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Action item text */}
                    <div>
                      <label htmlFor={`action-text-${idx}`} className="block text-xs text-navy/50 font-medium mb-2">
                        What exactly will you do? <span className="text-gold/70">*</span>
                      </label>
                      <textarea
                        id={`action-text-${idx}`}
                        value={row.text}
                        onChange={(e) => handleActionChange(idx, "text", e.target.value)}
                        disabled={disabled}
                        required
                        maxLength={500}
                        rows={2}
                        placeholder="Be specific and measurable..."
                        className={`${INPUT} resize-y text-sm leading-relaxed ${fieldMissing.actions[idx].text ? "border-red-400/60" : ""}`}
                      />
                    </div>

                    {/* Owner + Deadline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={`action-owner-${idx}`} className="block text-xs text-navy/50 font-medium mb-2">
                          Owner <span className="text-gold/70">*</span>
                        </label>
                        <input
                          id={`action-owner-${idx}`}
                          type="text"
                          value={row.owner}
                          onChange={(e) => handleActionChange(idx, "owner", e.target.value)}
                          disabled={disabled}
                          required
                          maxLength={100}
                          placeholder="Who is accountable?"
                          className={`${INPUT_SM} ${fieldMissing.actions[idx].owner ? "border-red-400/60" : ""}`}
                        />
                      </div>
                      <div>
                        <label htmlFor={`action-deadline-${idx}`} className="block text-xs text-navy/50 font-medium mb-2">
                          Deadline <span className="text-gold/70">*</span>
                        </label>
                        <input
                          id={`action-deadline-${idx}`}
                          type="date"
                          value={row.deadline}
                          onChange={(e) => handleActionChange(idx, "deadline", e.target.value)}
                          disabled={disabled}
                          required
                          className={INPUT_SM}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-navy/35 mt-4 italic leading-relaxed">
            Status of these actions will be captured during the next NMT review, not now.
          </p>
        </section>

        <div className={SECTION_RULE} />

        {/* ─── Target Meeting ──────────────────────────────────────────────── */}
        <section>
          <label htmlFor="target-meeting" className={LABEL}>
            Target Meeting
          </label>
          <input
            id="target-meeting"
            type="text"
            value={targetMeeting}
            onChange={(e) => setTargetMeeting(e.target.value)}
            disabled={disabled}
            className={INPUT}
            placeholder="e.g. NMT Madurai"
          />
        </section>

        {/* ─── Submit ──────────────────────────────────────────────────────── */}
        <div className="pt-8">
          {/* Validation / error messages */}
          {validationMessage && !isCommitted && (
            <div className="mb-4 border-l-2 border-amber-400 pl-4 py-1">
              <p className="text-sm text-amber-700">{validationMessage}</p>
            </div>
          )}
          {errorMessage && !isCommitted && (
            <div className="mb-4 border-l-2 border-red-400 pl-4 py-1">
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !canSubmit}
            className={[
              "group relative inline-flex items-center justify-center gap-3",
              "w-full sm:w-auto sm:px-10 h-13 rounded-xl",
              "text-sm font-semibold tracking-[0.08em] uppercase",
              "transition-all shadow-md",
              canSubmit && !disabled
                ? "bg-navy text-white hover:bg-navy/90 active:scale-[0.98] cursor-pointer"
                : "bg-navy/25 text-white/60 cursor-not-allowed",
            ].join(" ")}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              <>
                <span>Commit &amp; Save</span>
                <span className="text-gold/80 transition-transform group-hover:translate-x-0.5">→</span>
              </>
            )}
          </button>

          {!canSubmit && !disabled && (
            <p className="text-[11px] text-navy/35 mt-3">
              Complete all required fields to submit
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
