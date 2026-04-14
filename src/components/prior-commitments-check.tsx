"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

interface PriorCommitmentsCheckProps {
  verticalName: string;
  onAllReviewed: () => void;
  onSkip: () => void;
}

interface PendingCommitment {
  id: string;
  vertical_name: string;
  focus_dimension: string;
  focus_dimension_score: number;
  current_level: number;
  target_level: number;
  action_items: string[];
  target_meeting: string | null;
  target_date: string | null;
  status: "pending" | "in_progress" | "done" | "missed" | "partial";
  completion_notes: string | null;
  created_at: string;
}

type ReviewStatus = "done" | "partial" | "missed";

const statusOptions: {
  value: ReviewStatus;
  label: string;
  description: string;
  pillSelected: string;
  pillIdle: string;
  iconPath: string;
}[] = [
  {
    value: "done",
    label: "Done",
    description: "All 3 actions delivered.",
    pillSelected: "bg-emerald-600 border-emerald-600 text-white shadow-md",
    pillIdle: "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400",
    iconPath: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  {
    value: "partial",
    label: "Partial",
    description: "Some progress, not complete.",
    pillSelected: "bg-amber-500 border-amber-500 text-white shadow-md",
    pillIdle: "bg-white border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-400",
    iconPath: "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z",
  },
  {
    value: "missed",
    label: "Missed",
    description: "Didn't get to it.",
    pillSelected: "bg-red-600 border-red-600 text-white shadow-md",
    pillIdle: "bg-white border-red-200 text-red-700 hover:bg-red-50 hover:border-red-400",
    iconPath: "m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
];

// Module-scoped fetch helpers with timeout
async function patchCommitment(
  id: string,
  update: { status: ReviewStatus; completion_notes?: string },
): Promise<{ ok?: true; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`/api/commitments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: update.status,
        completion_notes: update.completion_notes ?? "",
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { error: `Save failed: ${res.status} ${res.statusText}` };
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Save timed out. Please check your connection and retry." };
    }
    return { error: "Save failed. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPendingCommitments(
  vertical: string,
): Promise<{ data?: PendingCommitment[]; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(
      `/api/commitments/pending?vertical=${encodeURIComponent(vertical)}`,
      { signal: controller.signal },
    );
    if (!res.ok) return { error: `Failed to load (${res.status}).` };
    const body = await res.json();
    if (!Array.isArray(body)) return { error: "Unexpected response shape." };
    return { data: body as PendingCommitment[] };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Request timed out. Please check your connection." };
    }
    return { error: "Failed to load prior commitments." };
  } finally {
    clearTimeout(timer);
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function PriorCommitmentsCheck({
  verticalName,
  onAllReviewed,
  onSkip,
}: PriorCommitmentsCheckProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commitments, setCommitments] = useState<PendingCommitment[]>([]);
  const [reviews, setReviews] = useState<
    Record<string, { status?: ReviewStatus; notes: string }>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      startTransition(() => {
        setLoading(true);
        setLoadError(null);
      });
    });
    fetchPendingCommitments(verticalName).then((result) => {
      if (cancelled) return;
      if (result.error) {
        startTransition(() => {
          setLoadError(result.error!);
        });
        onAllReviewed();
        return;
      }
      const data = result.data ?? [];
      if (data.length === 0) {
        onAllReviewed();
        return;
      }
      startTransition(() => {
        setCommitments(data);
        setLoading(false);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [verticalName, onAllReviewed]);

  const updateReview = useCallback(
    (id: string, patch: Partial<{ status: ReviewStatus; notes: string }>) => {
      setReviews((prev) => ({
        ...prev,
        [id]: {
          status: prev[id]?.status,
          notes: prev[id]?.notes ?? "",
          ...patch,
        },
      }));
    },
    [],
  );

  const allAnswered = useMemo(
    () =>
      commitments.length > 0 &&
      commitments.every((c) => reviews[c.id]?.status !== undefined),
    [commitments, reviews],
  );

  const handleSaveAndContinue = useCallback(async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    for (const commitment of commitments) {
      const review = reviews[commitment.id];
      if (!review?.status) continue;
      const result = await patchCommitment(commitment.id, {
        status: review.status,
        completion_notes: review.notes.trim(),
      });
      if (result.error) {
        setSubmitError(
          `Couldn't save review for "${commitment.focus_dimension}". ${result.error}`,
        );
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    onAllReviewed();
  }, [allAnswered, submitting, commitments, reviews, onAllReviewed]);

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
        <div className="w-8 h-8 border-2 border-navy/15 border-t-gold/60 rounded-full animate-spin" />
        <p className="text-sm text-navy/40 tracking-wide">Checking prior commitments…</p>
      </div>
    );
  }

  if (loadError) return null;

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Chapter header */}
      <div className="text-center">
        <div className="inline-flex flex-col items-center gap-2 mb-5">
          <div className="w-px h-6 bg-gold/35" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-gold/65 font-semibold">Closing the Loop</span>
          <div className="w-px h-6 bg-gold/35" />
        </div>

        <h2 className="font-display text-2xl sm:text-3xl text-navy mb-2 leading-tight">
          Before we begin…
        </h2>
        <p className="text-sm text-navy/45 leading-relaxed max-w-sm mx-auto">
          Last time, <span className="font-semibold text-navy/70">{verticalName}</span>{" "}
          committed to these actions. Let&apos;s close the loop before the new assessment.
        </p>
      </div>

      {/* Commitment cards */}
      <ol className="space-y-5" aria-label="Prior commitments to review">
        {commitments.map((c, idx) => {
          const review = reviews[c.id];
          const selectedStatus = review?.status;

          return (
            <li
              key={c.id}
              className="bg-white rounded-2xl border border-navy/8 shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="bg-parchment/60 border-b border-navy/6 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-navy/35 font-semibold mb-1">
                      Commitment {idx + 1} of {commitments.length}
                    </p>
                    <p className="font-display text-base text-navy leading-snug">
                      {c.target_meeting ?? "Next NMT"}
                    </p>
                    <p className="text-xs text-navy/40 mt-1">
                      Committed {formatDate(c.created_at)}
                      {c.target_date ? ` · Target ${formatDate(c.target_date)}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-navy/35 font-semibold mb-1">Focus</p>
                    <p className="text-sm font-semibold text-navy leading-snug">{c.focus_dimension}</p>
                    <p className="text-xs text-navy/40 mt-1 tabular-nums">
                      L{c.current_level}
                      <span className="text-navy/25 mx-1">→</span>
                      <span className="text-gold font-semibold">L{c.target_level}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action items */}
              {c.action_items && c.action_items.length > 0 && (
                <div className="px-5 py-4 border-b border-navy/5">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-navy/35 font-semibold mb-3">
                    Action Items
                  </p>
                  <ol className="space-y-2">
                    {c.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-navy/70 leading-relaxed">
                        <span className="font-display text-[11px] text-gold/60 mt-0.5 shrink-0 w-4 text-right">
                          {["I", "II", "III"][i] ?? i + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Status selection */}
              <div className="px-5 py-4 space-y-4">
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-navy/35 font-semibold mb-3">
                    How did it go?
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {statusOptions.map((option) => {
                      const isSelected = selectedStatus === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateReview(c.id, { status: option.value })}
                          disabled={submitting}
                          aria-pressed={isSelected}
                          className={[
                            "inline-flex items-center gap-2 h-11 px-4 rounded-xl border text-sm font-semibold tracking-wide",
                            "transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                            isSelected ? option.pillSelected : option.pillIdle,
                          ].join(" ")}
                        >
                          {/* Icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                            strokeWidth={2} stroke="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d={option.iconPath} />
                          </svg>
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {selectedStatus && (
                    <p className="text-xs text-navy/40 mt-2 italic">
                      {statusOptions.find((s) => s.value === selectedStatus)?.description}
                    </p>
                  )}
                </div>

                {/* Notes (shown when status selected) */}
                {selectedStatus && (
                  <div>
                    <label
                      htmlFor={`notes-${c.id}`}
                      className="block text-[10px] tracking-[0.2em] uppercase text-navy/35 font-semibold mb-2.5"
                    >
                      Notes <span className="text-navy/25 font-normal normal-case tracking-normal text-xs">optional</span>
                    </label>
                    <textarea
                      id={`notes-${c.id}`}
                      value={review?.notes ?? ""}
                      onChange={(e) => updateReview(c.id, { notes: e.target.value })}
                      disabled={submitting}
                      rows={3}
                      maxLength={2000}
                      placeholder="What worked, what got in the way, what's next…"
                      className="w-full px-4 py-3 rounded-xl border border-navy/10 bg-white text-navy text-sm placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm resize-y leading-relaxed transition-all"
                    />
                    <div className="text-[10px] text-navy/25 mt-1 text-right">
                      {(review?.notes ?? "").length}/2000
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Submit error */}
      {submitError && (
        <div
          role="alert"
          className="border-l-2 border-red-400 pl-4 py-1"
        >
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      {/* Progress indicator */}
      {commitments.length > 1 && (
        <div className="text-center">
          <p className="text-xs text-navy/35 tracking-wide">
            {commitments.filter((c) => reviews[c.id]?.status !== undefined).length} of {commitments.length} reviewed
          </p>
          <div className="mt-2 h-1 bg-navy/6 rounded-full overflow-hidden max-w-[160px] mx-auto">
            <div
              className="h-full bg-gold/60 rounded-full transition-all duration-500"
              style={{
                width: `${(commitments.filter((c) => reviews[c.id]?.status !== undefined).length / commitments.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer navigation */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-navy/8">
        <button
          type="button"
          onClick={onSkip}
          disabled={submitting}
          className="text-sm text-navy/40 hover:text-navy/65 disabled:opacity-50 disabled:cursor-not-allowed transition-colors underline underline-offset-4"
        >
          Skip for now
        </button>

        <button
          type="button"
          onClick={handleSaveAndContinue}
          disabled={!allAnswered || submitting}
          className={[
            "group inline-flex items-center gap-2.5 h-13 px-7 rounded-xl",
            "text-sm font-semibold tracking-[0.08em] uppercase",
            "transition-all shadow-md",
            allAnswered && !submitting
              ? "bg-navy text-white hover:bg-navy/90 active:scale-[0.98]"
              : "bg-navy/20 text-white/50 cursor-not-allowed",
          ].join(" ")}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </span>
          ) : (
            <>
              <span>Save &amp; Continue</span>
              <span className="text-gold/80 transition-transform group-hover:translate-x-0.5">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
