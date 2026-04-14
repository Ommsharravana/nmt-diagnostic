"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types — mirror the commitment row shape (see /api/commitments/[id])
// ---------------------------------------------------------------------------
type StatusType = "pending" | "in_progress" | "done" | "missed" | "partial";

interface ActionItemDetail {
  text: string;
  owner: string;
  deadline: string;
  status: StatusType;
  notes?: string;
}

interface Commitment {
  id: string;
  vertical_name: string;
  region: string | null;
  respondent_name: string | null;
  focus_dimension: string;
  focus_dimension_score: number;
  current_level: number;
  target_level: number;
  action_items: string[] | null;
  action_items_detailed: ActionItemDetail[] | null;
  target_meeting: string | null;
  target_date: string | null;
  chair_name: string | null;
  co_chair_name: string | null;
  focus_reason: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Module-scoped fetch helper (silent-failure-auditor compliant)
// ---------------------------------------------------------------------------
async function loadCommitment(
  id: string,
): Promise<{ data?: Commitment; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`/api/commitments/${id}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        error:
          res.status === 404
            ? "Commitment not found"
            : `Error ${res.status}: failed to load`,
      };
    }
    const body = (await res.json()) as Commitment;
    return { data: body };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        error: "Request timed out — please check your connection and try again.",
      };
    }
    return { error: "Failed to load commitment. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDeadline(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Presentation page
// ---------------------------------------------------------------------------
export default function PresentCommitmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [authChecked, setAuthChecked] = useState(false);
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth gate — redirect to /admin if no session password is stored
  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (!saved) {
      window.location.href = "/admin";
      return;
    }
    setAuthChecked(true);
  }, []);

  // Fetch the commitment once auth is confirmed
  useEffect(() => {
    if (!authChecked || !id) return;
    let cancelled = false;
    setLoading(true);
    loadCommitment(id).then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      else if (result.data) setCommitment(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authChecked, id]);

  const exitPresentation = useCallback(() => {
    router.push("/admin/live");
  }, [router]);

  // Keyboard shortcuts: Esc = exit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitPresentation();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitPresentation]);

  // --- Gates ---------------------------------------------------------------
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <p className="text-white/40 text-sm tracking-wider uppercase">
          Checking access...
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/40 text-sm mt-4 tracking-[0.2em] uppercase">
            Loading commitment...
          </p>
        </div>
      </div>
    );
  }

  if (error || !commitment) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold/50 mb-3">
            Presentation Mode
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-white mb-4">
            Commitment not found
          </h1>
          <p className="text-white/50 text-sm mb-8">
            {error || "This commitment may have been removed."}
          </p>
          <a
            href="/admin/live"
            className="inline-flex items-center h-10 px-5 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 text-xs tracking-[0.2em] uppercase transition-colors"
          >
            Return to admin
          </a>
        </div>
      </div>
    );
  }

  // --- Derived values ------------------------------------------------------
  const headerMetaParts: string[] = [];
  if (commitment.chair_name) {
    headerMetaParts.push(`Chair: ${commitment.chair_name}`);
  }
  if (commitment.co_chair_name) {
    headerMetaParts.push(`Co-Chair: ${commitment.co_chair_name}`);
  }
  if (headerMetaParts.length === 0 && commitment.respondent_name) {
    headerMetaParts.push(commitment.respondent_name);
  }
  const headerMeta = headerMetaParts.join("  |  ");

  const hasDetailed =
    Array.isArray(commitment.action_items_detailed) &&
    commitment.action_items_detailed.length > 0;

  const items: ActionItemDetail[] = hasDetailed
    ? commitment.action_items_detailed!
    : Array.isArray(commitment.action_items)
      ? commitment.action_items.map((text) => ({
          text,
          owner: "",
          deadline: "",
          status: "pending" as StatusType,
        }))
      : [];

  const targetMeeting = commitment.target_meeting?.trim() || "our next meeting";

  // --- Render --------------------------------------------------------------
  return (
    <div className="min-h-screen bg-navy text-white flex flex-col relative overflow-hidden">
      {/* Subtle gold glow backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, #c4a35a 0%, transparent 55%)",
        }}
      />

      {/* Top chrome — minimal */}
      <div className="relative z-10 flex items-center justify-between px-8 md:px-14 pt-8">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-gold" />
          <p className="text-[10px] md:text-[11px] tracking-[0.35em] uppercase text-gold/60">
            Commitments From
          </p>
        </div>
        <button
          type="button"
          onClick={exitPresentation}
          className="h-8 px-3 rounded-md border border-white/10 text-white/50 hover:text-gold hover:border-gold/30 text-[10px] tracking-[0.25em] uppercase transition-colors"
        >
          Esc · Exit
        </button>
      </div>

      {/* Main stage */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 md:px-14 py-10">
        {/* Vertical name + leadership */}
        <div className="text-center mb-10 md:mb-14">
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl xl:text-8xl text-gold leading-[1.05] tracking-tight">
            {commitment.vertical_name}
          </h1>
          {headerMeta && (
            <p className="mt-5 text-sm md:text-base text-white/55 tracking-wide">
              {headerMeta}
            </p>
          )}
        </div>

        {/* Focus dimension banner */}
        <div className="w-full max-w-5xl mb-10 md:mb-14">
          <div className="relative rounded-xl border border-gold/25 bg-white/[0.03] backdrop-blur-sm px-6 md:px-10 py-6 md:py-8">
            <span
              aria-hidden
              className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r bg-gold"
            />
            <p className="text-[10px] md:text-[11px] tracking-[0.35em] uppercase text-gold/70 mb-2">
              Focus Dimension
            </p>
            <h2 className="font-display text-2xl md:text-3xl xl:text-4xl text-white leading-snug">
              {commitment.focus_dimension}
              <span className="text-white/30 mx-3">·</span>
              <span className="text-gold tabular-nums">
                L{commitment.current_level}
                <span className="text-white/40 mx-2">→</span>
                L{commitment.target_level}
              </span>
            </h2>
            {commitment.focus_reason && commitment.focus_reason.trim().length > 0 && (
              <p className="mt-4 text-base md:text-lg text-white/70 italic leading-relaxed">
                <span className="not-italic text-gold/80 font-semibold tracking-wide text-sm mr-2">
                  Why this?
                </span>
                &ldquo;{commitment.focus_reason}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Section heading */}
        <div className="text-center mb-8 md:mb-10">
          <p className="font-display text-xl md:text-2xl xl:text-3xl text-gold italic tracking-wide">
            Our three commitments before {targetMeeting}
          </p>
          <div className="mx-auto mt-4 h-px w-24 bg-gold/40" />
        </div>

        {/* Action items — 3 big cards */}
        {items.length > 0 ? (
          <div
            className={`w-full max-w-6xl grid gap-5 md:gap-6 grid-cols-1 ${
              items.length >= 3
                ? "md:grid-cols-3"
                : items.length === 2
                  ? "md:grid-cols-2"
                  : "md:grid-cols-1"
            }`}
          >
            {items.map((item, i) => (
              <div
                key={i}
                className="relative rounded-xl border border-white/10 bg-white text-navy p-6 md:p-7 flex flex-col hover:border-gold/40 transition-colors"
              >
                {/* Big gold number */}
                <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-gold/15 border-2 border-gold/50 text-gold font-display text-2xl md:text-3xl font-semibold mb-4 tabular-nums">
                  {i + 1}
                </div>

                {/* Action text */}
                <p className="text-lg md:text-xl font-medium text-navy leading-snug flex-1">
                  {item.text}
                </p>

                {/* Owner + deadline */}
                {(item.owner || item.deadline) && (
                  <div className="mt-5 pt-4 border-t border-navy/10 space-y-1.5">
                    {item.owner && (
                      <p className="text-sm md:text-base text-navy/70">
                        <span className="text-[10px] tracking-[0.2em] uppercase text-navy/40 font-semibold mr-2">
                          Owner
                        </span>
                        <span className="font-semibold text-navy">
                          {item.owner}
                        </span>
                      </p>
                    )}
                    {item.deadline && (
                      <p className="text-sm md:text-base text-navy/70">
                        <span className="text-[10px] tracking-[0.2em] uppercase text-navy/40 font-semibold mr-2">
                          Deadline
                        </span>
                        <span className="font-semibold text-navy tabular-nums">
                          {formatDeadline(item.deadline)}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-white/40 text-sm py-12">
            No action items recorded for this commitment yet.
          </div>
        )}

        {/* Closing line */}
        <div className="mt-12 md:mt-16 text-center max-w-3xl">
          <p className="font-display text-lg md:text-2xl text-white/70 italic leading-relaxed">
            We commit to these before
            {commitment.target_meeting ? (
              <>
                {" "}our next meeting in{" "}
                <span className="text-gold not-italic font-semibold">
                  {commitment.target_meeting}
                </span>
                .
              </>
            ) : (
              <> our next meeting.</>
            )}
          </p>
        </div>
      </div>

      {/* Footer — tiny brand line */}
      <div className="relative z-10 pb-6 text-center">
        <p className="text-[10px] tracking-[0.4em] uppercase text-white/25">
          Yi · NMT Diagnostic
        </p>
      </div>
    </div>
  );
}
