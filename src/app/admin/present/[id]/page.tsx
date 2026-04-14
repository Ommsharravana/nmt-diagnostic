"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
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
// Module-scoped fetch — silent-failure compliant
// ---------------------------------------------------------------------------
async function loadCommitment(
  id: string
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
// Component
// ---------------------------------------------------------------------------
export default function PresentCommitmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [authChecked, setAuthChecked] = useState(false);
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth gate
  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (!saved) {
      window.location.href = "/admin";
      return;
    }
    setAuthChecked(true);
  }, []);

  // Load commitment
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

  // Keyboard: Esc = exit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitPresentation();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitPresentation]);

  // ── Gates ────────────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <p className="font-body text-white/30 text-xs tracking-[0.4em] uppercase">
          Verifying access
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-10 h-10 border border-gold/50 border-t-gold mx-auto mb-4"
            style={{ animation: "spin 1s linear infinite" }}
          />
          <p className="text-white/30 text-xs tracking-[0.4em] uppercase font-body">
            Loading
          </p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !commitment) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <p className="text-[9px] tracking-[0.45em] uppercase text-gold/50 mb-4">
            Presentation Mode
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-white mb-4">
            Commitment not found
          </h1>
          <p className="text-white/40 text-sm mb-8 font-body">
            {error || "This commitment may have been removed."}
          </p>
          <a
            href="/admin/live"
            className="inline-flex items-center h-10 px-5 border border-gold/30 text-gold hover:bg-gold/10 text-[9px] tracking-[0.3em] uppercase transition-colors font-body"
          >
            ← Return to live view
          </a>
        </div>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const chairLine = [
    commitment.chair_name ? `Chair — ${commitment.chair_name}` : null,
    commitment.co_chair_name
      ? `Co-Chair — ${commitment.co_chair_name}`
      : null,
    !commitment.chair_name && !commitment.co_chair_name && commitment.respondent_name
      ? commitment.respondent_name
      : null,
  ]
    .filter(Boolean)
    .join("   ·   ");

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-navy text-white flex flex-col overflow-hidden relative">
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes revealLine {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.06; }
          50%       { opacity: 0.12; }
        }
        .entrance-1 {
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }
        .entrance-2 {
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
        }
        .entrance-3 {
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
        }
        .entrance-4 {
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both;
        }
        .card-entrance-1 {
          animation: slideUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.65s both;
        }
        .card-entrance-2 {
          animation: slideUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.78s both;
        }
        .card-entrance-3 {
          animation: slideUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.91s both;
        }
        .footer-entrance {
          animation: fadeIn 1s ease 1.1s both;
        }
        .reveal-line {
          animation: revealLine 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
          transform-origin: center;
        }
        .glow-pulse {
          animation: glowPulse 4s ease-in-out infinite;
        }
        /* Grid overlay */
        .grid-bg {
          background-image:
            linear-gradient(rgba(196,163,90,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(196,163,90,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        /* Art deco corner */
        .deco-corner {
          position: absolute;
          width: 20px;
          height: 20px;
        }
        .deco-corner-tl { top: 0; left: 0; border-top: 1px solid; border-left: 1px solid; }
        .deco-corner-tr { top: 0; right: 0; border-top: 1px solid; border-right: 1px solid; }
        .deco-corner-bl { bottom: 0; left: 0; border-bottom: 1px solid; border-left: 1px solid; }
        .deco-corner-br { bottom: 0; right: 0; border-bottom: 1px solid; border-right: 1px solid; }
        /* Ornamental divider with center flourish */
        .ornament-line {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ornament-line::before,
        .ornament-line::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(196,163,90,0.4));
        }
        .ornament-line::after {
          background: linear-gradient(to left, transparent, rgba(196,163,90,0.4));
        }
      `}</style>

      {/* Architectural background layers */}
      <div className="grid-bg fixed inset-0 pointer-events-none" aria-hidden />

      {/* Radial gold corona — central focus */}
      <div
        className="glow-pulse fixed pointer-events-none"
        aria-hidden
        style={{
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(196,163,90,0.09) 0%, transparent 65%)",
        }}
      />

      {/* Top edge gradient — depth cue */}
      <div
        className="fixed top-0 left-0 right-0 h-48 pointer-events-none"
        aria-hidden
        style={{
          background:
            "linear-gradient(to bottom, rgba(196,163,90,0.04), transparent)",
        }}
      />

      {/* ── TOP CHROME ───────────────────────────────────────────────────── */}
      {/* Gold top rule — full width */}
      <div
        className="w-full h-[2px] flex-shrink-0"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, #c4a35a 25%, #dfc088 50%, #c4a35a 75%, transparent 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex items-center justify-between px-6 md:px-12 xl:px-16 pt-5 pb-3 flex-shrink-0">
        {/* Session label */}
        <div className="flex items-center gap-3 entrance-1">
          <div
            className="w-1 h-4"
            style={{
              background: "linear-gradient(to bottom, #c4a35a, #dfc088)",
            }}
          />
          <div>
            <p className="text-[8px] tracking-[0.5em] uppercase text-gold/50 font-body">
              NMT Diagnostic · Presentation Mode
            </p>
            <p className="text-[8px] tracking-[0.3em] uppercase text-white/20 font-body mt-0.5">
              Commitments & Action Plan
            </p>
          </div>
        </div>

        {/* Exit control */}
        <button
          type="button"
          onClick={exitPresentation}
          aria-label="Exit presentation mode"
          className="entrance-1 relative group h-8 px-4 border border-white/10 text-white/30 hover:text-gold hover:border-gold/30 text-[8px] tracking-[0.3em] uppercase transition-all font-body focus:outline-none focus:ring-1 focus:ring-gold/20"
        >
          <span className="deco-corner deco-corner-tl" style={{ color: "rgba(196,163,90,0)", width: 8, height: 8 }} />
          <span className="deco-corner deco-corner-br" style={{ color: "rgba(196,163,90,0)", width: 8, height: 8 }} />
          Esc · Exit
        </button>
      </div>

      {/* Thin sub-rule */}
      <div
        className="mx-6 md:mx-12 xl:mx-16 h-px flex-shrink-0"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(196,163,90,0.12), transparent)",
        }}
        aria-hidden
      />

      {/* ── MAIN STAGE ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 md:px-12 xl:px-16 py-8 md:py-10">
        {/* ── VERTICAL IDENTITY ─────────────────────────────────────── */}
        <div className="text-center mb-8 md:mb-10 max-w-5xl w-full entrance-1">
          {/* Roman numeral classification */}
          <p className="text-[8px] tracking-[0.6em] uppercase text-gold/40 font-body mb-3">
            Young Indians · National Member Testing · Chapter Commitments
          </p>

          {/* Ornamental top rule */}
          <div className="ornament-line mb-5">
            <span className="text-gold/50 text-xs">◆</span>
          </div>

          {/* VERTICAL NAME — the centrepiece */}
          <h1
            className="font-display leading-[0.92] tracking-tight text-gold mb-4"
            style={{
              fontSize: "clamp(3rem, 9vw, 7.5rem)",
              textShadow:
                "0 0 80px rgba(196,163,90,0.2), 0 2px 40px rgba(196,163,90,0.1)",
            }}
          >
            {commitment.vertical_name}
          </h1>

          {/* Leadership line */}
          {chairLine && (
            <p className="font-body text-sm md:text-base text-white/45 tracking-[0.12em] mt-3">
              {chairLine}
            </p>
          )}

          {/* Ornamental bottom rule */}
          <div className="ornament-line mt-5">
            <span className="text-gold/50 text-xs">◆</span>
          </div>
        </div>

        {/* ── FOCUS DIMENSION ───────────────────────────────────────── */}
        <div className="w-full max-w-4xl mb-8 md:mb-10 entrance-2">
          <div
            className="relative border border-gold/20"
            style={{ background: "rgba(196,163,90,0.04)" }}
          >
            {/* Corner brackets */}
            <span className="deco-corner deco-corner-tl" style={{ color: "rgba(196,163,90,0.5)" }} />
            <span className="deco-corner deco-corner-tr" style={{ color: "rgba(196,163,90,0.5)" }} />
            <span className="deco-corner deco-corner-bl" style={{ color: "rgba(196,163,90,0.5)" }} />
            <span className="deco-corner deco-corner-br" style={{ color: "rgba(196,163,90,0.5)" }} />

            {/* Left accent bar */}
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, #c4a35a, #dfc088, #c4a35a, transparent)",
              }}
            />

            <div className="px-8 md:px-10 py-6 md:py-7 pl-10 md:pl-12">
              <p className="text-[8px] tracking-[0.5em] uppercase text-gold/50 mb-2 font-body">
                Focus Dimension
              </p>

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <h2 className="font-display text-2xl md:text-3xl xl:text-4xl text-white leading-snug">
                  {commitment.focus_dimension}
                </h2>
                <div className="flex items-center gap-1.5 pb-1">
                  <span className="font-display text-lg text-gold tabular-nums">
                    L{commitment.current_level}
                  </span>
                  <span className="text-white/25 text-sm font-body">→</span>
                  <span className="font-display text-lg text-gold tabular-nums">
                    L{commitment.target_level}
                  </span>
                </div>
              </div>

              {commitment.focus_reason &&
                commitment.focus_reason.trim().length > 0 && (
                  <p className="mt-3 text-sm md:text-base text-white/60 italic leading-relaxed font-body border-t border-gold/10 pt-3">
                    <span className="not-italic text-gold/70 text-[9px] tracking-[0.35em] uppercase font-semibold mr-3">
                      Why
                    </span>
                    &ldquo;{commitment.focus_reason}&rdquo;
                  </p>
                )}
            </div>
          </div>
        </div>

        {/* ── COMMITMENTS HEADING ───────────────────────────────────── */}
        <div className="text-center mb-6 md:mb-8 entrance-3">
          <p className="font-display text-base md:text-xl xl:text-2xl text-white/70 italic tracking-wide">
            Our three commitments before{" "}
            <span className="text-gold not-italic">
              {targetMeeting}
            </span>
          </p>
        </div>

        {/* ── ACTION ITEMS ──────────────────────────────────────────── */}
        {items.length > 0 ? (
          <div
            className={`w-full max-w-5xl grid gap-4 md:gap-5 grid-cols-1 entrance-4 ${
              items.length >= 3
                ? "md:grid-cols-3"
                : items.length === 2
                ? "md:grid-cols-2"
                : "md:grid-cols-1 max-w-2xl mx-auto"
            }`}
          >
            {items.map((item, i) => {
              const cardClass =
                i === 0
                  ? "card-entrance-1"
                  : i === 1
                  ? "card-entrance-2"
                  : "card-entrance-3";

              return (
                <div
                  key={i}
                  className={`${cardClass} relative border border-gold/15 flex flex-col`}
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(196,163,90,0.05) 0%, rgba(12,20,37,0.6) 100%)",
                  }}
                >
                  {/* Corner brackets */}
                  <span
                    className="deco-corner deco-corner-tl"
                    style={{ color: "rgba(196,163,90,0.4)" }}
                  />
                  <span
                    className="deco-corner deco-corner-tr"
                    style={{ color: "rgba(196,163,90,0.4)" }}
                  />
                  <span
                    className="deco-corner deco-corner-bl"
                    style={{ color: "rgba(196,163,90,0.4)" }}
                  />
                  <span
                    className="deco-corner deco-corner-br"
                    style={{ color: "rgba(196,163,90,0.4)" }}
                  />

                  {/* Top gold line on card */}
                  <div
                    className="h-[1px]"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, rgba(196,163,90,0.5), transparent)",
                    }}
                  />

                  <div className="p-6 md:p-7 flex flex-col flex-1">
                    {/* Large ordinal */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-9 h-9 flex-shrink-0 border border-gold/30 flex items-center justify-center"
                        style={{ background: "rgba(196,163,90,0.08)" }}
                      >
                        <span className="font-display text-gold text-xl leading-none tabular-nums">
                          {i + 1}
                        </span>
                      </div>
                      <div
                        className="flex-1 h-px"
                        style={{
                          background:
                            "linear-gradient(to right, rgba(196,163,90,0.3), transparent)",
                        }}
                      />
                    </div>

                    {/* Action text */}
                    <p className="text-white text-base md:text-lg leading-snug flex-1 font-body">
                      {item.text}
                    </p>

                    {/* Owner + deadline footer */}
                    {(item.owner || item.deadline) && (
                      <div
                        className="mt-5 pt-4 border-t border-gold/10 space-y-2"
                      >
                        {item.owner && (
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[8px] tracking-[0.4em] uppercase text-gold/50 font-body">
                              Owner
                            </p>
                            <p className="text-sm text-white font-body font-medium">
                              {item.owner}
                            </p>
                          </div>
                        )}
                        {item.deadline && (
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[8px] tracking-[0.4em] uppercase text-gold/50 font-body">
                              Deadline
                            </p>
                            <p className="text-sm text-gold font-body tabular-nums font-medium">
                              {formatDeadline(item.deadline)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom gold line */}
                  <div
                    className="h-[1px]"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, rgba(196,163,90,0.25), transparent)",
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-white/30 text-sm py-8 font-body entrance-4">
            No action items recorded for this commitment.
          </div>
        )}

        {/* ── CLOSING DECLARATION ─────────────────────────────────── */}
        <div className="mt-8 md:mt-10 text-center max-w-2xl footer-entrance">
          <div
            className="h-px mb-6 reveal-line"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(196,163,90,0.3), transparent)",
            }}
          />
          <p className="font-display text-sm md:text-base xl:text-lg text-white/50 italic leading-relaxed">
            We commit to these actions before{" "}
            {commitment.target_meeting ? (
              <>
                our next meeting in{" "}
                <span className="text-gold not-italic font-semibold">
                  {commitment.target_meeting}
                </span>
                .
              </>
            ) : (
              "our next meeting."
            )}
          </p>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 pb-5 footer-entrance flex-shrink-0">
        {/* Bottom rule */}
        <div
          className="mx-6 md:mx-12 xl:mx-16 h-px mb-4"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(196,163,90,0.15), transparent)",
          }}
        />
        <p className="text-center text-[8px] tracking-[0.55em] uppercase text-white/20 font-body">
          Young Indians · National Member Testing · Chapter Assessment 2026
        </p>
      </div>

      {/* Bottom edge gradient */}
      <div
        className="fixed bottom-0 left-0 right-0 h-24 pointer-events-none"
        aria-hidden
        style={{
          background:
            "linear-gradient(to top, rgba(196,163,90,0.03), transparent)",
        }}
      />
    </div>
  );
}
