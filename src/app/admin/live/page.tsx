"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

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

  // Fetch assessments
  const fetchAssessments = useCallback(async () => {
    if (!storedPassword) return;
    try {
      const res = await fetch("/api/assessments", {
        headers: { "x-admin-password": storedPassword },
      });
      if (res.ok) {
        const data: AssessmentRow[] = await res.json();

        // Detect new assessments for entrance animation
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
          // Remove "new" tag after animation completes
          setTimeout(() => {
            setNewIds(new Set());
          }, 2000);
        }

        previousIdsRef.current = currentIds;
        setAssessments(data);
        setLastUpdated(new Date());
      } else if (res.status === 401) {
        // Password invalid — kick to admin
        sessionStorage.removeItem("nmt-admin-pw");
        window.location.href = "/admin";
      }
    } catch (err) {
      console.error("Failed to fetch assessments", err);
    }
  }, [storedPassword]);

  // Initial + polling fetch
  useEffect(() => {
    if (!authChecked || !storedPassword) return;
    fetchAssessments();
    const interval = setInterval(fetchAssessments, 10000);
    return () => clearInterval(interval);
  }, [authChecked, storedPassword, fetchAssessments]);

  // "Seconds ago" ticker
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  // Group by vertical, take most recent per vertical
  const latestByVertical = (() => {
    const map = new Map<string, AssessmentRow>();
    for (const a of assessments) {
      const existing = map.get(a.vertical_name);
      if (!existing || new Date(a.created_at) > new Date(existing.created_at)) {
        map.set(a.vertical_name, a);
      }
    }
    // Sort newest-first
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
        <p className="text-white/40 text-sm tracking-wider uppercase">
          Checking access...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy">
      <style jsx>{`
        @keyframes cardEntrance {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pulseDot {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.3);
          }
        }
        .card-new {
          animation: cardEntrance 0.6s ease-out;
          box-shadow: 0 0 0 2px rgba(196, 163, 90, 0.5);
        }
        .pulse-dot {
          animation: pulseDot 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5 sticky top-0 bg-navy z-10">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold/50 mb-1">
              {dateString}
            </p>
            <h1 className="font-display text-3xl text-white leading-tight">
              NMT Diagnostic — Live
            </h1>
          </div>

          <div className="flex items-center gap-8">
            {/* Reporting count */}
            <div className="text-right">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
                Reporting
              </p>
              <p className="font-display text-2xl text-white">
                <span className="text-gold">{reportingCount}</span>
                <span className="text-white/30"> / {TOTAL_VERTICALS}</span>
                <span className="text-white/50 text-sm ml-2">
                  verticals
                </span>
              </p>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/5">
              <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-gold" />
              <span className="text-[11px] tracking-wider uppercase text-white/60">
                Live · Updated {secondsAgo}s ago
              </span>
            </div>

            {/* Exit */}
            <a
              href="/admin"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center transition-colors"
            >
              Exit
            </a>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {latestByVertical.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="flex items-center gap-3 mb-6">
              <span className="pulse-dot inline-block w-3 h-3 rounded-full bg-gold" />
              <p className="text-[10px] tracking-[0.3em] uppercase text-gold/60">
                Awaiting Input
              </p>
              <span className="pulse-dot inline-block w-3 h-3 rounded-full bg-gold" />
            </div>
            <h2 className="font-display text-5xl text-white mb-4">
              Waiting for submissions...
            </h2>
            <p className="text-white/40 text-sm tracking-wide max-w-md">
              As each vertical submits their assessment, their card will appear
              here in real time.
            </p>
            <div className="mt-10 h-px w-24 bg-gold/30" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {latestByVertical.map((a) => {
              const isNew = newIds.has(a.id);
              const radarData = a.dimension_scores.map((d) => ({
                dimension: d.shortName,
                score: d.score,
                fullMark: 25,
              }));
              const color = maturityColors[a.maturity_level] || "#c4a35a";

              return (
                <div
                  key={a.id}
                  onClick={() => window.open(`/results/${a.id}`, "_blank")}
                  className={`bg-white rounded-lg border border-navy/5 shadow-none p-5 cursor-pointer hover:border-gold/30 transition-colors ${
                    isNew ? "card-new" : ""
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl text-navy leading-tight truncate">
                        {a.vertical_name}
                      </h3>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40 mt-1">
                        {a.region || "National"}
                        {a.respondent_name && (
                          <span className="text-navy/30 normal-case tracking-normal">
                            {" "}
                            · {a.respondent_name}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Maturity level badge */}
                    <div
                      className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-display text-lg font-semibold"
                      style={{
                        backgroundColor: `${color}18`,
                        color: color,
                        border: `2px solid ${color}40`,
                      }}
                    >
                      L{a.maturity_level}
                    </div>
                  </div>

                  {/* Radar chart */}
                  <div className="h-[150px] -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="75%">
                        <PolarGrid stroke="#e8e5df" />
                        <PolarAngleAxis
                          dataKey="dimension"
                          tick={{ fontSize: 9, fill: "#6b6b6b" }}
                        />
                        <Radar
                          name={a.vertical_name}
                          dataKey="score"
                          stroke="#c4a35a"
                          fill="#c4a35a"
                          fillOpacity={0.25}
                          strokeWidth={1.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-navy/5">
                    <div>
                      <p className="text-[10px] tracking-[0.15em] uppercase text-navy/30">
                        Score
                      </p>
                      <p className="font-display text-lg text-navy tabular-nums">
                        {a.total_score}
                        <span className="text-navy/25 text-sm">/175</span>
                        <span className="text-navy/40 text-xs ml-2">
                          {a.percentage}%
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] tracking-[0.15em] uppercase text-navy/30">
                        Maturity
                      </p>
                      <p
                        className="font-display text-lg italic"
                        style={{ color }}
                      >
                        {a.maturity_state || maturityLabels[a.maturity_level]}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
