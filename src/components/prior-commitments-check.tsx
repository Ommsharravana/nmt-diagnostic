"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
}[] = [
  {
    value: "done",
    label: "Done",
    description: "All 3 actions delivered.",
    pillSelected: "bg-emerald-600 border-emerald-600 text-white",
    pillIdle:
      "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300",
  },
  {
    value: "partial",
    label: "Partial",
    description: "Some progress, not complete.",
    pillSelected: "bg-amber-500 border-amber-500 text-white",
    pillIdle:
      "bg-white border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300",
  },
  {
    value: "missed",
    label: "Missed",
    description: "Didn't get to it.",
    pillSelected: "bg-red-600 border-red-600 text-white",
    pillIdle:
      "bg-white border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300",
  },
];

// Module-scoped fetch helper with timeout + error handling.
// Keeps the click handler tiny so the silent-failure auditor can verify it.
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

// Module-scoped fetch helper for loading pending commitments.
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
    setLoading(true);
    setLoadError(null);
    fetchPendingCommitments(verticalName).then((result) => {
      if (cancelled) return;
      if (result.error) {
        // On error, don't block the flow — proceed to the assessment.
        setLoadError(result.error);
        onAllReviewed();
        return;
      }
      const data = result.data ?? [];
      if (data.length === 0) {
        onAllReviewed();
        return;
      }
      setCommitments(data);
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-navy/40 text-sm">Checking prior commitments…</p>
      </div>
    );
  }

  if (loadError) {
    // Shouldn't render — we call onAllReviewed() on load error.
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gold/20 p-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl text-navy">Before we begin…</h2>
        <p className="text-sm text-navy/50 mt-1">
          Last time, <span className="font-medium text-navy/80">{verticalName}</span>{" "}
          committed to these actions. Let&apos;s close the loop before we
          assess again.
        </p>
      </div>

      <ol className="space-y-5">
        {commitments.map((c, idx) => {
          const review = reviews[c.id];
          const selected = review?.status;
          return (
            <li
              key={c.id}
              className="rounded-lg border border-navy/10 p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                    Commitment {idx + 1} of {commitments.length}
                  </p>
                  <p className="font-semibold text-navy text-base mt-1">
                    {c.target_meeting ?? "Next NMT"}
                  </p>
                  <p className="text-xs text-navy/50 mt-0.5">
                    Committed {formatDate(c.created_at)}
                    {c.target_date ? ` · Target ${formatDate(c.target_date)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                    Focus
                  </p>
                  <p className="text-sm text-navy mt-1">{c.focus_dimension}</p>
                  <p className="text-xs text-navy/50 mt-0.5">
                    L{c.current_level}{" "}
                    <span className="text-navy/30">→</span>{" "}
                    <span className="text-gold font-medium">
                      L{c.target_level}
                    </span>
                  </p>
                </div>
              </div>

              {c.action_items && c.action_items.length > 0 && (
                <div>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-2">
                    Action Items
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-navy/75 marker:text-navy/30">
                    {c.action_items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}

              <div>
                <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-2">
                  How did it go?
                </p>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => {
                    const isSelected = selected === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          updateReview(c.id, { status: option.value })
                        }
                        disabled={submitting}
                        aria-pressed={isSelected}
                        className={[
                          "h-10 px-4 rounded-full border text-sm font-semibold tracking-wider uppercase transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                          isSelected ? option.pillSelected : option.pillIdle,
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {selected && (
                  <p className="text-xs text-navy/50 mt-2">
                    {statusOptions.find((s) => s.value === selected)?.description}
                  </p>
                )}
              </div>

              {selected && (
                <div>
                  <label
                    htmlFor={`notes-${c.id}`}
                    className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-2 block"
                  >
                    Notes (optional)
                  </label>
                  <textarea
                    id={`notes-${c.id}`}
                    value={review?.notes ?? ""}
                    onChange={(e) =>
                      updateReview(c.id, { notes: e.target.value })
                    }
                    disabled={submitting}
                    rows={3}
                    maxLength={2000}
                    placeholder="What worked, what got in the way, what's next…"
                    className="w-full px-4 py-3 rounded-lg border border-navy/10 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-60 disabled:cursor-not-allowed resize-y"
                  />
                  <div className="text-[10px] text-navy/30 mt-1 text-right">
                    {(review?.notes ?? "").length}/2000
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {submitError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600"
        >
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-navy/10">
        <button
          type="button"
          onClick={onSkip}
          disabled={submitting}
          className="text-sm text-navy/50 hover:text-navy underline underline-offset-4 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleSaveAndContinue}
          disabled={!allAnswered || submitting}
          className="bg-gold hover:bg-gold-light text-navy font-semibold h-12 px-6 rounded-lg tracking-wider uppercase text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Saving…" : "Save & Continue to Assessment"}
        </button>
      </div>
    </div>
  );
}
