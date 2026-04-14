"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import QRCode from "qrcode";
import { downloadBlankTestPDF } from "@/components/blank-test-pdf";

interface AssessmentRow {
  id: string;
  vertical_name: string;
  region: string | null;
  respondent_name: string | null;
  total_score: number;
  percentage: number;
  maturity_level: number;
  maturity_state: string;
  dimension_scores: { name: string; shortName: string; score: number }[];
  created_at: string;
}

// Module-scoped fetch helper — silent-failure compliant with AbortController
async function fetchAssessmentsApi(
  password: string
): Promise<{ data?: AssessmentRow[]; status?: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch("/api/assessments", {
      headers: { "x-admin-password": password },
      signal: controller.signal,
    });
    if (res.status === 401) return { status: 401 };
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = (await res.json()) as AssessmentRow[];
    return { data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "timeout" };
    }
    return { error: "network" };
  } finally {
    clearTimeout(timer);
  }
}

const maturityColors: Record<number, string> = {
  1: "#dc2626",
  2: "#ea580c",
  3: "#ca8a04",
  4: "#2563eb",
  5: "#059669",
};

const maturityLabels: Record<number, string> = {
  1: "Fragile",
  2: "Emerging",
  3: "Growing",
  4: "Established",
  5: "Flagship",
};

const TOTAL_VERTICALS = 15;

export default function AdminLivePage() {
  const [storedPassword, setStoredPassword] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const previousIdsRef = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const [qrSmallSrc, setQrSmallSrc] = useState<string>("");
  const [qrLargeSrc, setQrLargeSrc] = useState<string>("");
  const [assessmentUrl, setAssessmentUrl] = useState<string>("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [isDownloadingPaper, setIsDownloadingPaper] = useState(false);
  const [paperProgress, setPaperProgress] = useState<string>("");

  // Auth check on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (!saved) {
      window.location.href = "/admin";
      return;
    }
    setStoredPassword(saved);
    setAuthChecked(true);
  }, []);

  // QR generation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/`;
    setAssessmentUrl(url);
    const qrOpts = { margin: 2, color: { dark: "#c4a35a", light: "#0c1425" } };
    QRCode.toDataURL(url, { ...qrOpts, width: 150 })
      .then((d) => setQrSmallSrc(d))
      .catch((e) => console.error("QR small failed", e));
    QRCode.toDataURL(url, { ...qrOpts, width: 400 })
      .then((d) => setQrLargeSrc(d))
      .catch((e) => console.error("QR large failed", e));
  }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!showQrModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowQrModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showQrModal]);

  const handleDownloadPaperTest = async () => {
    if (isDownloadingPaper) return;
    setIsDownloadingPaper(true);
    setPaperProgress("Starting…");
    try {
      await downloadBlankTestPDF((msg) => setPaperProgress(msg));
    } catch (err) {
      console.error("PDF download failed", err);
      alert("Could not generate the paper test PDF. Please try again.");
    } finally {
      setIsDownloadingPaper(false);
      setPaperProgress("");
    }
  };

  // Fetch assessments
  const fetchAssessments = useCallback(async () => {
    if (!storedPassword) return;
    const result = await fetchAssessmentsApi(storedPassword);
    if (result.status === 401) {
      sessionStorage.removeItem("nmt-admin-pw");
      window.location.href = "/admin";
      return;
    }
    if (result.error || !result.data) return;
    const data = result.data;

    const currentIds = new Set(data.map((a) => a.id));
    const previousIds = previousIdsRef.current;
    const freshlyAdded = new Set<string>();
    currentIds.forEach((id) => {
      if (!previousIds.has(id) && previousIds.size > 0) {
        freshlyAdded.add(id);
      }
    });
    if (freshlyAdded.size > 0) {
      setNewIds(freshlyAdded);
      setTimeout(() => setNewIds(new Set()), 2400);
    }
    previousIdsRef.current = currentIds;
    setAssessments(data);
    setLastUpdated(new Date());
  }, [storedPassword]);

  // Initial + polling
  useEffect(() => {
    if (!authChecked || !storedPassword) return;
    fetchAssessments();
    const interval = setInterval(fetchAssessments, 10000);
    return () => clearInterval(interval);
  }, [authChecked, storedPassword, fetchAssessments]);

  // Seconds-ago ticker
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  // Most recent per vertical
  const latestByVertical = (() => {
    const map = new Map<string, AssessmentRow>();
    for (const a of assessments) {
      const existing = map.get(a.vertical_name);
      if (!existing || new Date(a.created_at) > new Date(existing.created_at)) {
        map.set(a.vertical_name, a);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  })();

  const reportingCount = latestByVertical.length;

  const dateString = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <p
          className="font-body text-white/30 text-xs tracking-[0.4em] uppercase"
        >
          Verifying access
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy relative">
      <style jsx>{`
        @keyframes cardIn {
          0%   { opacity: 0; transform: translateY(20px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1;   transform: scale(1);   }
          50%       { opacity: 0.3; transform: scale(1.4); }
        }
        @keyframes scanLine {
          0%   { transform: translateY(-100%); opacity: 0.06; }
          100% { transform: translateY(100vh); opacity: 0.02; }
        }
        @keyframes cornerGlow {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1;   }
        }
        .card-new {
          animation: cardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-shadow:
            0 0 0 1px rgba(196, 163, 90, 0.6),
            0 0 24px rgba(196, 163, 90, 0.15);
        }
        .pulse-dot {
          animation: pulseDot 2s ease-in-out infinite;
        }
        .scan-line {
          animation: scanLine 8s linear infinite;
        }
        .corner-glow {
          animation: cornerGlow 3s ease-in-out infinite;
        }
        /* Art deco corner bracket */
        .deco-corner {
          position: absolute;
          width: 16px;
          height: 16px;
        }
        .deco-corner-tl { top: 0; left: 0; border-top: 1px solid; border-left: 1px solid; }
        .deco-corner-tr { top: 0; right: 0; border-top: 1px solid; border-right: 1px solid; }
        .deco-corner-bl { bottom: 0; left: 0; border-bottom: 1px solid; border-left: 1px solid; }
        .deco-corner-br { bottom: 0; right: 0; border-bottom: 1px solid; border-right: 1px solid; }
        .card-frame {
          position: relative;
        }
        .card-frame .deco-corner {
          color: rgba(196, 163, 90, 0.5);
        }
        .card-frame:hover .deco-corner {
          color: rgba(196, 163, 90, 0.9);
          transition: color 0.2s ease;
        }
        /* Horizontal rule with center diamond */
        .rule-diamond::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(196,163,90,0.4) 20%, rgba(196,163,90,0.4) 80%, transparent);
        }
        .rule-diamond::after {
          content: '◆';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 8px;
          color: rgba(196, 163, 90, 0.7);
          background: #0c1425;
          padding: 0 6px;
        }
        /* Grid background overlay */
        .grid-bg {
          background-image:
            linear-gradient(rgba(196,163,90,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(196,163,90,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        /* Maturity bar fill */
        .maturity-fill {
          transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      {/* Grid bg */}
      <div className="grid-bg fixed inset-0 pointer-events-none" aria-hidden />

      {/* Scanning light */}
      <div
        className="scan-line fixed left-0 right-0 h-24 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(196,163,90,0.03), transparent)",
        }}
        aria-hidden
      />

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-gold/10 bg-navy/95 backdrop-blur-md">
        {/* Top accent line */}
        <div
          className="h-[2px] w-full"
          style={{
            background:
              "linear-gradient(to right, transparent 0%, #c4a35a 30%, #dfc088 50%, #c4a35a 70%, transparent 100%)",
          }}
        />

        <div className="max-w-[1680px] mx-auto px-6 md:px-10 py-4 flex items-center justify-between gap-6 flex-wrap">
          {/* Left: title block */}
          <div className="flex items-start gap-5">
            {/* Emblem */}
            <div
              className="corner-glow hidden sm:flex w-10 h-10 items-center justify-center border border-gold/40 rounded-sm relative flex-shrink-0 mt-0.5"
              style={{ background: "rgba(196,163,90,0.06)" }}
            >
              <span className="text-gold font-display text-base select-none">
                Yi
              </span>
              <span
                className="deco-corner deco-corner-tl"
                style={{ color: "rgba(196,163,90,0.7)" }}
              />
              <span
                className="deco-corner deco-corner-br"
                style={{ color: "rgba(196,163,90,0.7)" }}
              />
            </div>

            <div>
              <p className="text-[9px] tracking-[0.45em] uppercase text-gold/50 mb-0.5">
                {dateString}
              </p>
              <h1 className="font-display text-2xl md:text-3xl text-white leading-none tracking-tight">
                NMT Diagnostic
                <span className="text-gold/50 mx-2 font-body font-light">
                  ·
                </span>
                <span className="text-gold">Live</span>
              </h1>
              <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mt-1">
                National Member Testing · Chapter Assessment
              </p>
            </div>
          </div>

          {/* Right: controls cluster */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Progress meter */}
            <div className="flex items-center gap-3 px-4 py-2.5 border border-gold/15 rounded-sm bg-white/[0.02]">
              <div>
                <p className="text-[8px] tracking-[0.35em] uppercase text-white/30 mb-1">
                  Verticals Reporting
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-28 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="maturity-fill h-full rounded-full"
                      style={{
                        width: `${(reportingCount / TOTAL_VERTICALS) * 100}%`,
                        background:
                          "linear-gradient(to right, #c4a35a, #dfc088)",
                      }}
                    />
                  </div>
                  <span className="font-display text-sm text-gold tabular-nums">
                    {reportingCount}
                  </span>
                  <span className="text-white/30 text-xs">
                    / {TOTAL_VERTICALS}
                  </span>
                </div>
              </div>
            </div>

            {/* Live pulse */}
            <div className="flex items-center gap-2 px-3 py-2.5 border border-gold/15 rounded-sm bg-white/[0.02]">
              <span className="pulse-dot w-2 h-2 rounded-full bg-gold inline-block flex-shrink-0" />
              <span className="text-[9px] tracking-[0.3em] uppercase text-white/50">
                Live
              </span>
              <span className="text-[9px] text-white/25 font-body">
                · {secondsAgo}s ago
              </span>
            </div>

            {/* QR button */}
            {qrSmallSrc && (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                aria-label="Show assessment QR code"
                title="Scan to open the assessment"
                className="w-12 h-12 border border-gold/20 rounded-sm overflow-hidden hover:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/40 transition-colors bg-navy"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSmallSrc}
                  alt="QR"
                  className="w-full h-full object-contain"
                />
              </button>
            )}

            {/* Exit */}
            <a
              href="/admin"
              className="h-9 px-4 border border-white/10 rounded-sm text-white/40 hover:text-gold hover:border-gold/30 text-[9px] tracking-[0.3em] uppercase inline-flex items-center transition-colors font-body"
            >
              ← Exit
            </a>
          </div>
        </div>

        {/* Bottom accent */}
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(to right, transparent 0%, rgba(196,163,90,0.12) 50%, transparent 100%)",
          }}
        />
      </header>

      {/* ── BODY ─────────────────────────────────────────────────────── */}
      <main className="max-w-[1680px] mx-auto px-6 md:px-10 py-8 relative z-10">
        {latestByVertical.length === 0 ? (
          /* ── EMPTY STATE ───────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-28 text-center select-none">
            {/* Geometric waiting indicator */}
            <div className="relative w-24 h-24 mb-10">
              <div
                className="absolute inset-0 border border-gold/20 rounded-sm"
                style={{ transform: "rotate(0deg)" }}
              />
              <div
                className="absolute inset-2 border border-gold/15 rounded-sm"
                style={{ transform: "rotate(45deg)" }}
              />
              <div
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="pulse-dot w-3 h-3 rounded-full bg-gold" />
              </div>
            </div>

            <p className="text-[9px] tracking-[0.55em] uppercase text-gold/50 mb-4">
              Awaiting Input
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-white mb-3 leading-tight">
              Waiting for submissions
            </h2>
            <p className="font-body text-white/35 text-sm leading-relaxed max-w-sm">
              As each vertical completes their diagnostic, their card will
              materialise here in real time.
            </p>

            <div className="rule-diamond relative mt-12 w-32 h-4" />
          </div>
        ) : (
          /* ── GRID ──────────────────────────────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {latestByVertical.map((a, idx) => {
              const isNew = newIds.has(a.id);
              const radarData = a.dimension_scores.map((d) => ({
                dimension: d.shortName,
                score: d.score,
                fullMark: 25,
              }));
              const color = maturityColors[a.maturity_level] || "#c4a35a";
              const label =
                a.maturity_state || maturityLabels[a.maturity_level];

              return (
                <article
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${a.vertical_name} — ${label}. Click to view full results.`}
                  onClick={() => window.open(`/results/${a.id}`, "_blank")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      window.open(`/results/${a.id}`, "_blank");
                  }}
                  className={[
                    "card-frame group cursor-pointer select-none focus:outline-none bg-navy/60 border border-gold/12 hover:border-gold/35 transition-all duration-200",
                    isNew ? "card-new" : `animate-slide-up stagger-${Math.min(idx + 1, 10)}`,
                  ].join(" ")}
                  style={{
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                >
                  {/* Art deco corners */}
                  <span className="deco-corner deco-corner-tl" />
                  <span className="deco-corner deco-corner-tr" />
                  <span className="deco-corner deco-corner-bl" />
                  <span className="deco-corner deco-corner-br" />

                  <div className="p-5">
                    {/* ── Card top row ─────────────── */}
                    <div className="flex items-start justify-between mb-4 gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Maturity state label — small, above title */}
                        <p
                          className="text-[8px] tracking-[0.4em] uppercase mb-1.5 font-body"
                          style={{ color: `${color}` }}
                        >
                          {label}
                        </p>
                        <h3 className="font-display text-lg text-white leading-snug">
                          {a.vertical_name}
                        </h3>
                        {(a.region || a.respondent_name) && (
                          <p className="text-[9px] tracking-[0.15em] text-white/30 mt-1 font-body">
                            {a.region || "National"}
                            {a.respondent_name && (
                              <span className="text-white/20">
                                {" "}· {a.respondent_name}
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Level badge */}
                      <div
                        className="flex-shrink-0 w-11 h-11 flex items-center justify-center font-display text-base font-semibold border"
                        style={{
                          background: `${color}10`,
                          color: color,
                          borderColor: `${color}35`,
                        }}
                      >
                        L{a.maturity_level}
                      </div>
                    </div>

                    {/* ── Radar chart ─────────────── */}
                    <div
                      className="h-[130px] -mx-1 mb-1"
                      aria-hidden
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} outerRadius="72%">
                          <PolarGrid
                            stroke="rgba(196,163,90,0.12)"
                            strokeDasharray="2 4"
                          />
                          <PolarAngleAxis
                            dataKey="dimension"
                            tick={{
                              fontSize: 8,
                              fill: "rgba(255,255,255,0.35)",
                              fontFamily: "var(--font-body)",
                            }}
                          />
                          <Radar
                            name={a.vertical_name}
                            dataKey="score"
                            stroke={color}
                            fill={color}
                            fillOpacity={0.18}
                            strokeWidth={1.5}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* ── Divider ─────────────────── */}
                    <div
                      className="h-px mb-4"
                      style={{
                        background:
                          "linear-gradient(to right, transparent, rgba(196,163,90,0.2), transparent)",
                      }}
                    />

                    {/* ── Score row ────────────────── */}
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <p className="text-[8px] tracking-[0.35em] uppercase text-white/25 mb-1">
                          Score
                        </p>
                        <p className="font-display text-2xl text-white tabular-nums leading-none">
                          {a.total_score}
                          <span className="text-white/20 text-sm">/175</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] tracking-[0.35em] uppercase text-white/25 mb-1">
                          Percentile
                        </p>
                        <p
                          className="font-display text-2xl tabular-nums leading-none"
                          style={{ color }}
                        >
                          {a.percentage}
                          <span
                            className="text-base"
                            style={{ color: `${color}80` }}
                          >
                            %
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* ── Progress bar ─────────────── */}
                    <div className="h-1 bg-white/8 rounded-full overflow-hidden mb-4">
                      <div
                        className="maturity-fill h-full rounded-full"
                        style={{
                          width: `${a.percentage}%`,
                          background: `linear-gradient(to right, ${color}80, ${color})`,
                        }}
                      />
                    </div>

                    {/* ── Present commitments CTA ──── */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `/admin/commitments?vertical=${encodeURIComponent(
                            a.vertical_name
                          )}`,
                          "_blank"
                        );
                      }}
                      aria-label={`Present commitments for ${a.vertical_name}`}
                      className="w-full h-8 border border-gold/20 text-gold/70 hover:border-gold/50 hover:text-gold hover:bg-gold/5 text-[8px] tracking-[0.35em] uppercase inline-flex items-center justify-center transition-all duration-150 font-body focus:outline-none focus:ring-1 focus:ring-gold/30"
                    >
                      Present Commitments
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ── QR MODAL ─────────────────────────────────────────────────── */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-8"
          onClick={() => setShowQrModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Assessment QR code"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full bg-navy border border-gold/25"
            style={{
              boxShadow:
                "0 0 0 1px rgba(196,163,90,0.08), 0 32px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Art deco corners on modal */}
            <span
              className="deco-corner deco-corner-tl"
              style={{ color: "rgba(196,163,90,0.8)", width: 20, height: 20 }}
            />
            <span
              className="deco-corner deco-corner-tr"
              style={{ color: "rgba(196,163,90,0.8)", width: 20, height: 20 }}
            />
            <span
              className="deco-corner deco-corner-bl"
              style={{ color: "rgba(196,163,90,0.8)", width: 20, height: 20 }}
            />
            <span
              className="deco-corner deco-corner-br"
              style={{ color: "rgba(196,163,90,0.8)", width: 20, height: 20 }}
            />

            {/* Top accent */}
            <div
              className="h-[2px]"
              style={{
                background:
                  "linear-gradient(to right, transparent, #c4a35a, transparent)",
              }}
            />

            <div className="p-8">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                aria-label="Close QR code modal"
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-white/30 hover:text-gold border border-white/10 hover:border-gold/30 text-lg leading-none transition-colors"
              >
                ×
              </button>

              <p className="text-[9px] tracking-[0.45em] uppercase text-gold/60 mb-2 text-center">
                Share Assessment
              </p>
              <h2 className="font-display text-2xl text-white text-center mb-6">
                Scan to take the diagnostic
              </h2>

              <div className="flex items-center justify-center mb-6">
                {qrLargeSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrLargeSrc}
                    alt="Assessment QR code (large)"
                    className="w-[280px] h-[280px] border border-gold/20"
                  />
                ) : (
                  <div className="w-[280px] h-[280px] border border-white/10 flex items-center justify-center text-white/30 text-sm">
                    Generating…
                  </div>
                )}
              </div>

              <div className="mb-5">
                <p className="text-[9px] tracking-[0.3em] uppercase text-white/30 mb-1.5">
                  Assessment URL
                </p>
                <input
                  type="text"
                  readOnly
                  value={assessmentUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full text-xs font-mono text-gold/80 bg-white/5 border border-gold/15 px-3 py-2 focus:outline-none focus:border-gold/40"
                />
              </div>

              <p className="text-xs text-white/40 text-center mb-5 leading-relaxed font-body">
                Share this with NMT members so they can take the diagnostic on
                their phones.
              </p>

              <button
                type="button"
                onClick={handleDownloadPaperTest}
                disabled={isDownloadingPaper}
                className="w-full h-10 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 hover:border-gold/50 text-[9px] tracking-[0.35em] uppercase font-body disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isDownloadingPaper ? (paperProgress || "Preparing PDF…") : "Download blank test PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
