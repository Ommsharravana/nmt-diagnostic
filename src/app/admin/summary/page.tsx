"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { maturityLevels } from "@/lib/scoring";
import {
  downloadNMTSummaryPDF,
  type SummaryData,
} from "@/components/nmt-summary-pdf";

/* ============================================================
 * Types (match API shapes)
 * ============================================================ */
interface AssessmentRow {
  id: string;
  vertical_name: string;
  region: string | null;
  respondent_name: string | null;
  total_score: number;
  percentage: number;
  maturity_level: number;
  maturity_state: string;
  dimension_scores: {
    name: string;
    shortName: string;
    score: number;
    health?: string;
  }[];
  created_at: string;
}

interface Commitment {
  id: string;
  assessment_id: string | null;
  vertical_name: string;
  focus_dimension: string;
  focus_dimension_score: number;
  current_level: number;
  target_level: number;
  action_items: string[] | null;
  action_items_detailed: { text: string; owner?: string; deadline?: string; status?: string }[] | null;
  target_meeting: string | null;
  created_at: string;
}

/* ============================================================
 * Module-scoped fetch helpers (silent-failure auditor pattern)
 * ============================================================ */
async function listAssessments(
  params: URLSearchParams,
  pw: string,
): Promise<{ data?: AssessmentRow[]; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`/api/assessments?${params}`, {
      headers: { "x-admin-password": pw },
      signal: controller.signal,
    });
    if (!res.ok)
      return { error: `Failed to load assessments: ${res.status} ${res.statusText}` };
    const data = await res.json();
    return { data: Array.isArray(data) ? data : [] };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Assessments request timed out. Please retry." };
    }
    return { error: "Failed to load assessments. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

async function listCommitments(
  params: URLSearchParams,
  pw: string,
): Promise<{ data?: Commitment[]; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`/api/commitments?${params}`, {
      headers: { "x-admin-password": pw },
      signal: controller.signal,
    });
    if (!res.ok)
      return { error: `Failed to load commitments: ${res.status} ${res.statusText}` };
    const data = await res.json();
    return { data: Array.isArray(data) ? data : (data?.commitments ?? []) };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Commitments request timed out. Please retry." };
    }
    return { error: "Failed to load commitments. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

/* ============================================================
 * Constants
 * ============================================================ */
const maturityColorMap: Record<number, string> = {
  1: "#dc2626",
  2: "#ea580c",
  3: "#ca8a04",
  4: "#2563eb",
  5: "#059669",
};

const healthColorMap: Record<string, string> = {
  Strong: "#059669",
  Stable: "#2563eb",
  Weak: "#b45309",
  Critical: "#b91c1c",
};

// Classify a numeric dimension score into a health status (same thresholds as scoring.ts)
function scoreToHealth(score: number): "Strong" | "Stable" | "Weak" | "Critical" {
  if (score >= 21) return "Strong";
  if (score >= 17) return "Stable";
  if (score >= 13) return "Weak";
  return "Critical";
}

/* ============================================================
 * Page
 * ============================================================ */
export default function SummaryPage() {
  const [storedPassword, setStoredPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterMeeting, setFilterMeeting] = useState("");

  // Download feedback
  const [downloading, setDownloading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy Summary");

  // ---- Auth / session ----
  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (!saved) {
      window.location.href = "/admin";
      return;
    }
    setStoredPassword(saved);
    setAuthenticated(true);
  }, []);

  // ---- Data fetch ----
  const fetchData = useCallback(async () => {
    if (!storedPassword) return;
    setLoading(true);
    setLoadError(null);

    const aParams = new URLSearchParams();
    if (filterDateFrom) aParams.set("date_from", filterDateFrom);
    if (filterDateTo) aParams.set("date_to", filterDateTo);

    const cParams = new URLSearchParams();
    if (filterMeeting.trim()) cParams.set("target_meeting", filterMeeting.trim());

    const [aRes, cRes] = await Promise.all([
      listAssessments(aParams, storedPassword),
      listCommitments(cParams, storedPassword),
    ]);

    if (aRes.error) setLoadError(aRes.error);
    else if (cRes.error) setLoadError(cRes.error);

    if (aRes.data) setAssessments(aRes.data);
    if (cRes.data) setCommitments(cRes.data);
    setLoading(false);
  }, [storedPassword, filterDateFrom, filterDateTo, filterMeeting]);

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated, fetchData]);

  // ---- Derive summary data (group to most-recent-per-vertical) ----
  const summary = useMemo<SummaryData>(() => {
    // Most-recent assessment per vertical
    const latestByVertical = new Map<string, AssessmentRow>();
    for (const a of assessments) {
      const existing = latestByVertical.get(a.vertical_name);
      if (
        !existing ||
        new Date(a.created_at).getTime() > new Date(existing.created_at).getTime()
      ) {
        latestByVertical.set(a.vertical_name, a);
      }
    }
    const latest = Array.from(latestByVertical.values());
    const verticalsReported = latest.length;

    // ---- Maturity Distribution ----
    const maturityDistribution = [1, 2, 3, 4, 5].map((lvl) => {
      const info = maturityLevels.find((m) => m.level === lvl);
      const matching = latest.filter((a) => a.maturity_level === lvl);
      return {
        level: lvl,
        name: info?.state ?? `L${lvl}`,
        count: matching.length,
        verticals: matching.map((m) => m.vertical_name).sort(),
      };
    });

    // ---- Dimension Health Aggregation ----
    // Collect per-dimension scores & healths across latest verticals
    const dimensionAgg = new Map<
      string,
      { scores: number[]; strong: number; stable: number; weak: number; critical: number }
    >();

    for (const a of latest) {
      for (const d of a.dimension_scores ?? []) {
        const key = d.name || d.shortName || "Unknown";
        if (!dimensionAgg.has(key)) {
          dimensionAgg.set(key, {
            scores: [],
            strong: 0,
            stable: 0,
            weak: 0,
            critical: 0,
          });
        }
        const bucket = dimensionAgg.get(key)!;
        const score = typeof d.score === "number" ? d.score : 0;
        bucket.scores.push(score);
        const health = d.health ?? scoreToHealth(score);
        if (health === "Strong") bucket.strong += 1;
        else if (health === "Stable") bucket.stable += 1;
        else if (health === "Weak") bucket.weak += 1;
        else bucket.critical += 1;
      }
    }

    const dimensionHealth = Array.from(dimensionAgg.entries()).map(
      ([dimension, v]) => {
        const avg =
          v.scores.length > 0
            ? Math.round((v.scores.reduce((s, n) => s + n, 0) / v.scores.length) * 10) / 10
            : 0;
        return {
          dimension,
          strong: v.strong,
          stable: v.stable,
          weak: v.weak,
          critical: v.critical,
          average: avg,
        };
      },
    );

    // Systemic weakness: >=50% of reporting verticals weak or critical on this dimension
    const systemicWeaknesses: string[] = dimensionHealth
      .filter((d) => {
        const total = d.strong + d.stable + d.weak + d.critical;
        if (total === 0) return false;
        const weakish = d.weak + d.critical;
        return weakish / total >= 0.5;
      })
      .map((d) => d.dimension);

    // ---- Top/Bottom verticals ----
    const ranked = [...latest].sort((a, b) => b.total_score - a.total_score);
    const topVerticals = ranked.slice(0, 3).map((a) => ({
      name: a.vertical_name,
      total: a.total_score,
      level: a.maturity_level,
      state: a.maturity_state,
    }));
    const bottomVerticals = ranked
      .slice(-3)
      .reverse()
      .map((a) => ({
        name: a.vertical_name,
        total: a.total_score,
        level: a.maturity_level,
        state: a.maturity_state,
      }));

    // ---- Commitments ----
    const totalCommitments = commitments.length;

    const commitmentsByDimensionMap = new Map<string, number>();
    for (const c of commitments) {
      const key = c.focus_dimension || "Unspecified";
      commitmentsByDimensionMap.set(
        key,
        (commitmentsByDimensionMap.get(key) ?? 0) + 1,
      );
    }
    const commitmentsByDimension = Array.from(
      commitmentsByDimensionMap.entries(),
    )
      .map(([dimension, count]) => ({ dimension, count }))
      .sort((a, b) => b.count - a.count);

    const targetMeetingsMap = new Map<string, number>();
    for (const c of commitments) {
      const key = (c.target_meeting && c.target_meeting.trim()) || "Unassigned";
      targetMeetingsMap.set(key, (targetMeetingsMap.get(key) ?? 0) + 1);
    }
    const targetMeetings = Array.from(targetMeetingsMap.entries())
      .map(([meeting, count]) => ({ meeting, count }))
      .sort((a, b) => b.count - a.count);

    return {
      generatedAt: new Date().toISOString(),
      filters: {
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        meeting: filterMeeting || undefined,
      },
      verticalsReported,
      maturityDistribution,
      dimensionHealth,
      topVerticals,
      bottomVerticals,
      systemicWeaknesses,
      totalCommitments,
      commitmentsByDimension,
      targetMeetings,
    };
  }, [assessments, commitments, filterDateFrom, filterDateTo, filterMeeting]);

  // ---- Derived counts for cards/commitment insights ----
  const totalActionItemsCommitted = useMemo(() => {
    let n = 0;
    for (const c of commitments) {
      if (Array.isArray(c.action_items_detailed) && c.action_items_detailed.length > 0) {
        n += c.action_items_detailed.length;
      } else if (Array.isArray(c.action_items)) {
        n += c.action_items.length;
      }
    }
    return n;
  }, [commitments]);

  const verticalsWithoutCommitments = useMemo(() => {
    const committed = new Set(commitments.map((c) => c.vertical_name));
    const reported = new Set(
      assessments.map((a) => a.vertical_name),
    );
    return Array.from(reported).filter((v) => !committed.has(v)).sort();
  }, [assessments, commitments]);

  const mostSelectedFocusDimensions = useMemo(() => {
    return summary.commitmentsByDimension.slice(0, 3);
  }, [summary.commitmentsByDimension]);

  // ---- Actions ----
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await downloadNMTSummaryPDF(summary);
    } catch (err) {
      alert(err instanceof Error ? err.message : "PDF export failed");
    } finally {
      setDownloading(false);
    }
  };

  // Build the plain-text summary body shared by Copy Summary and Email Summary.
  const buildSummaryText = useCallback((): string => {
    const lines: string[] = [];
    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    lines.push(`NMT Vertical Diagnostic — Summary Report`);
    lines.push(`As of ${today} · ${summary.verticalsReported} verticals reported`);
    lines.push("");
    lines.push("Maturity Distribution:");
    for (const m of summary.maturityDistribution) {
      lines.push(`  L${m.level} ${m.name}: ${m.count}`);
    }
    lines.push("");
    if (summary.systemicWeaknesses.length > 0) {
      lines.push(
        `Systemic weaknesses (>=50% of verticals weak/critical): ${summary.systemicWeaknesses.join(", ")}`,
      );
    } else {
      lines.push("No systemic weaknesses detected.");
    }
    lines.push("");
    lines.push(`Total commitments captured: ${summary.totalCommitments}`);
    if (summary.commitmentsByDimension.length > 0) {
      lines.push("Focus dimensions (most selected):");
      for (const d of summary.commitmentsByDimension.slice(0, 5)) {
        lines.push(`  ${d.dimension}: ${d.count}`);
      }
    }
    return lines.join("\n");
  }, [summary]);

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy Summary"), 2000);
    } catch {
      alert("Clipboard copy failed.");
    }
  };

  /**
   * Open the admin's default mail client with a prefilled draft so the summary
   * can be shared with the National Chair & Vice Chair (Playbook §8).
   * We have no SMTP — the admin reviews and sends from their own client.
   */
  const handleEmailSummary = () => {
    const subject = "NMT Vertical Diagnostic — Summary Report";
    const intro = [
      "Hi,",
      "",
      "Please find the latest NMT Vertical Diagnostic summary below.",
      "",
      "— — —",
      "",
    ].join("\n");
    const outro = [
      "",
      "",
      "— Sent from the NMT diagnostic tracker",
    ].join("\n");
    const body = intro + buildSummaryText() + outro;
    const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <p className="text-navy/40 text-sm">Redirecting...</p>
      </div>
    );
  }

  const todayDisplay = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Totals used for stacked bar / percentages
  const distributionTotal = summary.maturityDistribution.reduce(
    (s, m) => s + m.count,
    0,
  );

  return (
    <div className="min-h-screen bg-parchment">
      {/* ================ Header band ================ */}
      <div className="bg-navy px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold/50">
              NMT Admin
            </p>
            <h1 className="font-display text-2xl text-white">
              NMT Summary Report
            </h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            <a
              href="/admin"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Dashboard
            </a>
            <a
              href="/admin/live"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Live
            </a>
            <a
              href="/admin/commitments"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Commitments
            </a>
            <a
              href="/admin/manage"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Manage
            </a>
            <a
              href="/admin/facilitator"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Facilitator
            </a>
            <span className="h-9 px-4 rounded-lg border border-gold/40 text-gold text-xs tracking-wider uppercase inline-flex items-center">
              Summary
            </span>
            <a
              href="/"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Back to Test
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* ================ Action buttons ================ */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-navy/40">
              Per Rohan&apos;s Playbook §8
            </p>
            <p className="font-display text-xl text-navy">
              One-click NMT summary for National Chair &amp; Vice Chair review
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleCopySummary}
              variant="outline"
              className="h-9 px-4 border-navy/15 text-navy text-xs tracking-wider uppercase hover:bg-navy/5"
            >
              {copyLabel}
            </Button>
            <Button
              onClick={handleEmailSummary}
              disabled={loading || summary.verticalsReported === 0}
              variant="outline"
              className="h-9 px-4 border-navy/10 text-navy/60 text-xs tracking-wider uppercase hover:border-gold hover:text-gold disabled:opacity-40"
              title="Open email draft for National Chair & Vice Chair"
            >
              Email Summary to Leadership
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={downloading || loading || summary.verticalsReported === 0}
              className="h-9 px-4 bg-navy hover:bg-navy-light text-white text-xs tracking-wider uppercase disabled:opacity-40"
            >
              {downloading ? "Preparing..." : "Download PDF"}
            </Button>
          </div>
        </div>

        {/* ================ Filters ================ */}
        <Card className="border border-navy/5 shadow-none bg-white">
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-1">
                Date from
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-9 px-3 rounded-lg border border-navy/10 bg-white text-sm text-navy/70"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-1">
                Date to
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="h-9 px-3 rounded-lg border border-navy/10 bg-white text-sm text-navy/70"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-1">
                Meeting name
              </label>
              <input
                type="text"
                value={filterMeeting}
                onChange={(e) => setFilterMeeting(e.target.value)}
                placeholder="e.g. NMT April 2026"
                className="h-9 px-3 rounded-lg border border-navy/10 bg-white text-sm text-navy/70 w-56"
              />
            </div>
            <div className="flex-1" />
            <Button
              onClick={fetchData}
              variant="outline"
              className="h-9 px-4 border-navy/15 text-navy text-xs tracking-wider uppercase hover:bg-navy/5"
            >
              Refresh
            </Button>
          </CardContent>
        </Card>

        {/* ================ Load error ================ */}
        {loadError && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">
            {loadError}{" "}
            <button onClick={fetchData} className="underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* ================ 1.1 Title block ================ */}
        <Card className="border border-navy/5 shadow-none bg-white">
          <CardContent className="p-6">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold/70 font-semibold">
              Yi · Young Indians · NMT Diagnostic
            </p>
            <h2 className="font-display text-3xl text-navy mt-1">
              NMT Vertical Diagnostic — Summary Report
            </h2>
            <p className="text-sm text-navy/50 mt-1">
              As of {todayDisplay} ·{" "}
              <span className="text-navy font-medium">
                {summary.verticalsReported} verticals reported
              </span>
              {summary.filters.meeting ? (
                <span> · Meeting: {summary.filters.meeting}</span>
              ) : null}
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="p-12 text-center text-navy/40 text-sm bg-white rounded-lg border border-navy/5">
            Loading summary data...
          </div>
        ) : summary.verticalsReported === 0 ? (
          <div className="p-12 text-center bg-white rounded-lg border border-navy/5">
            <p className="font-display text-xl text-navy/70 mb-1">
              No assessments reported yet
            </p>
            <p className="text-sm text-navy/40">
              Summary will populate as verticals complete their diagnostic.
            </p>
          </div>
        ) : (
          <>
            {/* ================ 1.2 Maturity Distribution ================ */}
            <section className="space-y-3">
              <h3 className="font-display text-2xl text-navy border-b border-navy/10 pb-2">
                Overall Maturity Distribution
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {summary.maturityDistribution.map((m) => {
                  const color = maturityColorMap[m.level];
                  return (
                    <Card
                      key={m.level}
                      className="border border-navy/5 shadow-none bg-white"
                    >
                      <CardContent className="p-4">
                        <p
                          className="text-[10px] tracking-[0.15em] uppercase font-semibold"
                          style={{ color }}
                        >
                          L{m.level} · {m.name}
                        </p>
                        <p
                          className="font-display text-4xl mt-1 tabular-nums"
                          style={{ color }}
                        >
                          {m.count}
                        </p>
                        <p className="text-[11px] text-navy/40 mt-1">
                          {m.count === 1 ? "vertical" : "verticals"}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Stacked distribution bar */}
              {distributionTotal > 0 && (
                <div>
                  <div className="flex h-6 rounded-md overflow-hidden border border-navy/10">
                    {summary.maturityDistribution.map((m) => {
                      const pct = (m.count / distributionTotal) * 100;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={m.level}
                          title={`L${m.level} ${m.name} — ${m.count} (${Math.round(pct)}%)`}
                          style={{
                            width: `${pct}%`,
                            backgroundColor: maturityColorMap[m.level],
                          }}
                          className="flex items-center justify-center text-[10px] text-white font-semibold"
                        >
                          {pct >= 8 ? `${Math.round(pct)}%` : ""}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 text-[10px] tracking-[0.1em] uppercase text-navy/50 mt-2 flex-wrap">
                    {summary.maturityDistribution.map((m) => (
                      <span
                        key={m.level}
                        className="inline-flex items-center gap-1"
                      >
                        <span
                          className="inline-block w-3 h-3 rounded-sm"
                          style={{ backgroundColor: maturityColorMap[m.level] }}
                        />
                        L{m.level} {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ================ 1.3 Dimension Health Across Verticals ================ */}
            <section className="space-y-3">
              <h3 className="font-display text-2xl text-navy border-b border-navy/10 pb-2">
                Dimension Health Across Verticals
              </h3>
              <Card className="border border-navy/5 shadow-none bg-white">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-navy/5 bg-navy/[0.02]">
                        <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                          Dimension
                        </th>
                        <th className="px-4 py-3 text-center text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                          Strong
                        </th>
                        <th className="px-4 py-3 text-center text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                          Stable
                        </th>
                        <th className="px-4 py-3 text-center text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                          Weak
                        </th>
                        <th className="px-4 py-3 text-center text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                          Critical
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                          Avg / 25
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.dimensionHealth.map((d) => {
                        const total = d.strong + d.stable + d.weak + d.critical;
                        const isSystemic =
                          total > 0 && (d.weak + d.critical) / total >= 0.5;
                        return (
                          <tr
                            key={d.dimension}
                            className={`border-b border-navy/5 ${isSystemic ? "bg-red-50/60" : ""}`}
                          >
                            <td className="px-4 py-3 font-medium text-navy">
                              {d.dimension}
                              {isSystemic && (
                                <span className="ml-2 text-[10px] tracking-wider uppercase text-red-700 font-semibold">
                                  Systemic
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center tabular-nums text-emerald-700">
                              {d.strong}
                            </td>
                            <td className="px-4 py-3 text-center tabular-nums text-blue-700">
                              {d.stable}
                            </td>
                            <td className="px-4 py-3 text-center tabular-nums text-amber-700">
                              {d.weak}
                            </td>
                            <td className="px-4 py-3 text-center tabular-nums text-red-700">
                              {d.critical}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium text-navy">
                              {d.average.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {summary.systemicWeaknesses.length > 0 ? (
                <p className="text-sm text-navy/70 bg-red-50/70 border border-red-100 rounded-md p-3">
                  <span className="font-semibold text-red-800">
                    {summary.systemicWeaknesses.length} dimension
                    {summary.systemicWeaknesses.length !== 1 ? "s are" : " is"}{" "}
                    systemically weak across Yi verticals:
                  </span>{" "}
                  {summary.systemicWeaknesses.join(", ")}.
                </p>
              ) : (
                <p className="text-sm text-navy/60 italic">
                  No systemic weakness detected — fewer than 50% of verticals are
                  weak/critical on any single dimension.
                </p>
              )}
            </section>

            {/* ================ 1.4 Average Scores by Dimension ================ */}
            <section className="space-y-3">
              <h3 className="font-display text-2xl text-navy border-b border-navy/10 pb-2">
                Average Scores by Dimension
              </h3>
              <Card className="border border-navy/5 shadow-none bg-white">
                <CardContent className="p-4">
                  <div style={{ height: `${Math.max(summary.dimensionHealth.length * 44, 260)}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[...summary.dimensionHealth].sort(
                          (a, b) => a.average - b.average,
                        )}
                        layout="vertical"
                        margin={{ top: 10, right: 32, left: 12, bottom: 10 }}
                      >
                        <CartesianGrid stroke="#e8e5df" strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          domain={[0, 25]}
                          tick={{ fontSize: 11, fill: "#6b6b6b" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="dimension"
                          width={170}
                          tick={{ fontSize: 11, fill: "#1a1a1a" }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(196,163,90,0.08)" }}
                          formatter={(value) => [
                            typeof value === "number"
                              ? value.toFixed(1)
                              : String(value ?? ""),
                            "Avg / 25",
                          ]}
                        />
                        <Bar dataKey="average" radius={[0, 4, 4, 0]}>
                          {[...summary.dimensionHealth]
                            .sort((a, b) => a.average - b.average)
                            .map((entry, idx) => (
                              <Cell
                                key={idx}
                                fill={
                                  healthColorMap[scoreToHealth(entry.average)] ||
                                  "#c4a35a"
                                }
                              />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] tracking-[0.1em] uppercase text-navy/40 mt-2">
                    Sorted weakest first · Color matches health threshold
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* ================ 1.5 Verticals at a Glance ================ */}
            <section className="space-y-3">
              <h3 className="font-display text-2xl text-navy border-b border-navy/10 pb-2">
                Verticals at a Glance
              </h3>
              <p className="text-xs text-navy/50 italic">
                Shown for orientation, not ranking — every vertical&apos;s journey
                is unique.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-navy/5 shadow-none bg-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-emerald-700 font-semibold mb-3">
                      Top 3 by total score
                    </p>
                    <ul className="space-y-2">
                      {summary.topVerticals.map((v, i) => (
                        <li
                          key={v.name}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-navy/40 tabular-nums w-5">
                            {i + 1}.
                          </span>
                          <span className="font-medium text-navy flex-1">
                            {v.name}
                          </span>
                          <span className="text-navy/60 tabular-nums">
                            {v.total}
                            <span className="text-navy/25">/175</span>
                          </span>
                          <span
                            className="text-[11px] italic"
                            style={{ color: maturityColorMap[v.level] }}
                          >
                            L{v.level} · {v.state}
                          </span>
                        </li>
                      ))}
                      {summary.topVerticals.length === 0 && (
                        <li className="text-navy/40 text-sm italic">
                          No data yet
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border border-navy/5 shadow-none bg-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-red-700 font-semibold mb-3">
                      Bottom 3 by total score
                    </p>
                    <ul className="space-y-2">
                      {summary.bottomVerticals.map((v, i) => (
                        <li
                          key={v.name}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-navy/40 tabular-nums w-5">
                            {i + 1}.
                          </span>
                          <span className="font-medium text-navy flex-1">
                            {v.name}
                          </span>
                          <span className="text-navy/60 tabular-nums">
                            {v.total}
                            <span className="text-navy/25">/175</span>
                          </span>
                          <span
                            className="text-[11px] italic"
                            style={{ color: maturityColorMap[v.level] }}
                          >
                            L{v.level} · {v.state}
                          </span>
                        </li>
                      ))}
                      {summary.bottomVerticals.length === 0 && (
                        <li className="text-navy/40 text-sm italic">
                          No data yet
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ================ 1.6 Aggregate Action Commitments ================ */}
            <section className="space-y-3">
              <h3 className="font-display text-2xl text-navy border-b border-navy/10 pb-2">
                Aggregate Action Commitments
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border border-navy/5 shadow-none bg-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-navy/30 font-semibold">
                      Total commitments
                    </p>
                    <p className="font-display text-3xl text-navy mt-1 tabular-nums">
                      {summary.totalCommitments}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-navy/5 shadow-none bg-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-navy/30 font-semibold">
                      Total action items
                    </p>
                    <p className="font-display text-3xl text-navy mt-1 tabular-nums">
                      {totalActionItemsCommitted}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-navy/5 shadow-none bg-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-navy/30 font-semibold">
                      Focus dimensions
                    </p>
                    <p className="font-display text-3xl text-navy mt-1 tabular-nums">
                      {summary.commitmentsByDimension.length}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-navy/5 shadow-none bg-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-navy/30 font-semibold">
                      Target meetings
                    </p>
                    <p className="font-display text-3xl text-navy mt-1 tabular-nums">
                      {summary.targetMeetings.length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {summary.commitmentsByDimension.length > 0 && (
                <Card className="border border-navy/5 shadow-none bg-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-3">
                      Commitments by focus dimension
                    </p>
                    <div
                      style={{
                        height: `${Math.max(
                          summary.commitmentsByDimension.length * 38,
                          200,
                        )}px`,
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={summary.commitmentsByDimension}
                          layout="vertical"
                          margin={{ top: 10, right: 24, left: 12, bottom: 10 }}
                        >
                          <CartesianGrid stroke="#e8e5df" strokeDasharray="3 3" />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#6b6b6b" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="dimension"
                            width={170}
                            tick={{ fontSize: 11, fill: "#1a1a1a" }}
                          />
                          <Tooltip cursor={{ fill: "rgba(196,163,90,0.08)" }} />
                          <Bar dataKey="count" fill="#c4a35a" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {summary.targetMeetings.length > 0 && (
                <Card className="border border-navy/5 shadow-none bg-white">
                  <CardContent className="p-4">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-3">
                      Target meetings
                    </p>
                    <ul className="divide-y divide-navy/5">
                      {summary.targetMeetings.map((m) => (
                        <li
                          key={m.meeting}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <span className="text-navy">{m.meeting}</span>
                          <span className="text-navy/50 tabular-nums">
                            {m.count} commitment{m.count !== 1 ? "s" : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* ================ 1.7 Patterns & Recommendations ================ */}
            <section className="space-y-3">
              <h3 className="font-display text-2xl text-navy border-b border-navy/10 pb-2">
                Patterns &amp; Recommendations
              </h3>
              <Card className="border border-navy/5 shadow-none bg-white">
                <CardContent className="p-5 space-y-4 text-sm text-navy/80 leading-relaxed">
                  {summary.systemicWeaknesses.length > 0 ? (
                    <p className="border-l-4 border-red-400 pl-3">
                      <span className="font-semibold text-navy">
                        National infrastructure gap.
                      </span>{" "}
                      {summary.systemicWeaknesses.length} dimension
                      {summary.systemicWeaknesses.length !== 1 ? "s" : ""} (
                      <span className="font-medium">
                        {summary.systemicWeaknesses.join(", ")}
                      </span>
                      ) show weak or critical health across a majority of
                      reporting verticals. When 10+ verticals score weak on the
                      same dimension, that&apos;s a national infrastructure
                      problem, not a vertical problem — address it centrally
                      rather than vertical-by-vertical.
                    </p>
                  ) : (
                    <p className="border-l-4 border-emerald-400 pl-3">
                      <span className="font-semibold text-navy">
                        No single dimension is systemically weak
                      </span>{" "}
                      across reporting verticals. Dimension gaps are
                      vertical-specific and can be addressed per vertical.
                    </p>
                  )}

                  {mostSelectedFocusDimensions.length > 0 && (
                    <p className="border-l-4 border-gold/60 pl-3">
                      <span className="font-semibold text-navy">
                        Most-selected focus dimensions:
                      </span>{" "}
                      {mostSelectedFocusDimensions
                        .map((d) => `${d.dimension} (${d.count})`)
                        .join(", ")}
                      . Verticals have self-identified where they want support —
                      consider a national-level session on the top pick.
                    </p>
                  )}

                  {verticalsWithoutCommitments.length > 0 ? (
                    <p className="border-l-4 border-amber-400 pl-3">
                      <span className="font-semibold text-navy">
                        Follow-up needed.
                      </span>{" "}
                      {verticalsWithoutCommitments.length} vertical
                      {verticalsWithoutCommitments.length !== 1 ? "s have" : " has"}{" "}
                      submitted a diagnostic but no action commitment yet:{" "}
                      {verticalsWithoutCommitments.join(", ")}.
                    </p>
                  ) : summary.verticalsReported > 0 ? (
                    <p className="border-l-4 border-emerald-400 pl-3">
                      <span className="font-semibold text-navy">
                        Every reporting vertical has captured commitments.
                      </span>{" "}
                      Strong closure from the session.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <p className="text-[10px] tracking-[0.2em] uppercase text-navy/30 text-center pt-4">
              Yi NMT · Vertical Health Diagnostic · Generated{" "}
              {new Date(summary.generatedAt).toLocaleString("en-IN")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
