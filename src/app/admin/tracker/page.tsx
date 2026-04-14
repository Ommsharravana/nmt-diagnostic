"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { verticals, regions } from "@/lib/yi-data";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
} from "recharts";

// ---------- Types ----------
interface DimensionScore {
  name: string;
  shortName: string;
  score: number;
}

interface AssessmentRow {
  id: string;
  vertical_name: string;
  region: string | null;
  total_score: number;
  percentage: number;
  maturity_level: number;
  maturity_state: string;
  dimension_scores: DimensionScore[];
  created_at: string;
}

interface CommitmentRow {
  id: string;
  assessment_id: string | null;
  vertical_name: string;
  focus_dimension: string;
  focus_dimension_score: number;
  current_level: number;
  target_level: number;
  status: string;
  created_at: string;
}

// ---------- Fetch helpers (silent-failure-auditor compliant) ----------
async function listAssessments(
  pw: string
): Promise<{ data?: AssessmentRow[]; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`/api/assessments`, {
      headers: { "x-admin-password": pw },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { error: `Failed to load: ${res.status} ${res.statusText}` };
    }
    const data = await res.json();
    return { data: Array.isArray(data) ? data : [] };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Request timed out. Please check your connection and retry." };
    }
    return { error: "Failed to load assessments. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

async function listCommitments(
  pw: string
): Promise<{ data?: CommitmentRow[]; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`/api/commitments`, {
      headers: { "x-admin-password": pw },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { error: `Failed to load commitments: ${res.status}` };
    }
    const raw = await res.json();
    const data = Array.isArray(raw) ? raw : raw?.commitments ?? [];
    return { data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Commitments request timed out." };
    }
    return { error: "Failed to load commitments." };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Constants ----------
// Line color palette (rotating)
const LINE_COLORS = [
  "#c4a35a", // gold
  "#2563eb", // blue
  "#059669", // emerald
  "#dc2626", // red
  "#7c3aed", // purple
  "#d97706", // amber
  "#ec4899", // pink
  "#0d9488", // teal
];

// Maturity thresholds on the 0-175 total-score scale
// L1: <87 / L2: 87-110 / L3: 111-138 / L4: 139-156 / L5: 157+
const LEVEL_THRESHOLDS: { score: number; label: string }[] = [
  { score: 87, label: "L2" },
  { score: 111, label: "L3" },
  { score: 139, label: "L4" },
  { score: 157, label: "L5" },
];

const maturityLabels: Record<number, string> = {
  1: "Fragile",
  2: "Emerging",
  3: "Growing",
  4: "Established",
  5: "Flagship",
};

const maturityBadgeStyles: Record<number, string> = {
  1: "bg-red-50 text-red-700 border-red-300",
  2: "bg-orange-50 text-orange-700 border-orange-300",
  3: "bg-amber-50 text-amber-700 border-amber-300",
  4: "bg-blue-50 text-blue-700 border-blue-300",
  5: "bg-emerald-50 text-emerald-700 border-emerald-300",
};

// ---------- Helpers ----------
function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function levelForScore(total: number): number {
  if (total >= 157) return 5;
  if (total >= 139) return 4;
  if (total >= 111) return 3;
  if (total >= 87) return 2;
  return 1;
}

function pickColor(index: number): string {
  return LINE_COLORS[index % LINE_COLORS.length];
}

// ---------- Page ----------
export default function TrackerPage() {
  // Auth
  const [storedPassword, setStoredPassword] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  // Data
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [commitments, setCommitments] = useState<CommitmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterVertical, setFilterVertical] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Highlight selection when many verticals on chart
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  // --- Auth check ---
  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (!saved) {
      window.location.href = "/admin";
      return;
    }
    setStoredPassword(saved);
    setAuthChecked(true);
  }, []);

  // --- Fetch data ---
  const fetchAll = useCallback(async () => {
    if (!storedPassword) return;
    setLoading(true);
    setError(null);
    const [a, c] = await Promise.all([
      listAssessments(storedPassword),
      listCommitments(storedPassword),
    ]);
    if (a.error) {
      setError(a.error);
    } else if (a.data) {
      setAssessments(a.data);
    }
    if (c.data) setCommitments(c.data);
    // commitments failure is non-fatal — trajectory still works without
    setLoading(false);
  }, [storedPassword]);

  useEffect(() => {
    if (authChecked) fetchAll();
  }, [authChecked, fetchAll]);

  // --- Filtered dataset ---
  const filtered = useMemo(() => {
    return assessments.filter((a) => {
      if (filterVertical !== "all" && a.vertical_name !== filterVertical) return false;
      if (filterRegion !== "all" && (a.region ?? "") !== filterRegion) return false;
      if (dateFrom) {
        if (new Date(a.created_at) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        // include the whole end day
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(a.created_at) > end) return false;
      }
      return true;
    });
  }, [assessments, filterVertical, filterRegion, dateFrom, dateTo]);

  // --- Group by vertical, sorted ascending by date ---
  const byVertical = useMemo(() => {
    const map = new Map<string, AssessmentRow[]>();
    filtered.forEach((a) => {
      const bucket = map.get(a.vertical_name) ?? [];
      bucket.push(a);
      map.set(a.vertical_name, bucket);
    });
    for (const [, list] of map) {
      list.sort(
        (x, y) =>
          new Date(x.created_at).getTime() - new Date(y.created_at).getTime()
      );
    }
    return map;
  }, [filtered]);

  const verticalList = useMemo(
    () => Array.from(byVertical.keys()).sort(),
    [byVertical]
  );

  // Vertical -> color map (stable order)
  const verticalColor = useMemo(() => {
    const m: Record<string, string> = {};
    verticalList.forEach((v, i) => {
      m[v] = pickColor(i);
    });
    return m;
  }, [verticalList]);

  // --- Overall trajectory data (wide format for Recharts) ---
  const overallData = useMemo(() => {
    // x-axis = unique created_at (rounded to date string)
    // each row has: { date, [vertical]: score, ... }
    const allDates = new Set<string>();
    byVertical.forEach((list) => list.forEach((a) => allDates.add(a.created_at)));
    const sortedDates = Array.from(allDates).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    // Build one row per assessment date, across verticals
    return sortedDates.map((iso) => {
      const row: Record<string, string | number | null> = { date: iso };
      byVertical.forEach((list, vert) => {
        const match = list.find((a) => a.created_at === iso);
        row[vert] = match ? match.total_score : null;
      });
      return row;
    });
  }, [byVertical]);

  // --- Aggregate movement (verticals with >=2 assessments) ---
  const movements = useMemo(() => {
    const rows: {
      vertical: string;
      firstScore: number;
      latestScore: number;
      delta: number;
      firstLevel: number;
      latestLevel: number;
      firstDate: string;
      latestDate: string;
      count: number;
    }[] = [];
    byVertical.forEach((list, vert) => {
      if (list.length < 2) return;
      const first = list[0];
      const last = list[list.length - 1];
      rows.push({
        vertical: vert,
        firstScore: first.total_score,
        latestScore: last.total_score,
        delta: last.total_score - first.total_score,
        firstLevel: first.maturity_level,
        latestLevel: last.maturity_level,
        firstDate: first.created_at,
        latestDate: last.created_at,
        count: list.length,
      });
    });
    rows.sort((a, b) => b.delta - a.delta);
    return rows;
  }, [byVertical]);

  const anyLongitudinal = movements.length > 0;

  // --- Single-vertical detail ---
  const singleVerticalData = useMemo(() => {
    if (filterVertical === "all") return null;
    const list = byVertical.get(filterVertical) ?? [];
    if (list.length === 0) return null;
    return list;
  }, [filterVertical, byVertical]);

  // Commitments review — previous commitments on dimensions where NO improvement observed
  const commitmentReview = useMemo(() => {
    if (!singleVerticalData || singleVerticalData.length < 2) return [];
    const vertCommits = commitments.filter(
      (c) => c.vertical_name === filterVertical
    );
    if (vertCommits.length === 0) return [];

    // Look at each commitment: find the assessment right after it.
    // Compare dimension score at commitment time vs. assessment after.
    const review: {
      commitment: CommitmentRow;
      beforeScore: number | null;
      afterScore: number | null;
      improved: boolean;
    }[] = [];

    vertCommits.forEach((c) => {
      const cDate = new Date(c.created_at).getTime();
      const before = singleVerticalData
        .filter((a) => new Date(a.created_at).getTime() <= cDate)
        .pop();
      const after = singleVerticalData
        .filter((a) => new Date(a.created_at).getTime() > cDate)
        .shift();
      if (!after) return; // only show commitments with a follow-up assessment
      const beforeDim = before?.dimension_scores?.find(
        (d) => d.name === c.focus_dimension || d.shortName === c.focus_dimension
      );
      const afterDim = after.dimension_scores?.find(
        (d) => d.name === c.focus_dimension || d.shortName === c.focus_dimension
      );
      const beforeScore = beforeDim?.score ?? c.focus_dimension_score ?? null;
      const afterScore = afterDim?.score ?? null;
      const improved =
        beforeScore != null && afterScore != null && afterScore > beforeScore;
      if (!improved) {
        review.push({ commitment: c, beforeScore, afterScore, improved });
      }
    });
    return review;
  }, [commitments, singleVerticalData, filterVertical]);

  // Dimension trajectories (for single-vertical view)
  const dimensionTrajectories = useMemo(() => {
    if (!singleVerticalData || singleVerticalData.length === 0) return [];
    // Use first assessment's dimensions as the canonical set/order
    const first = singleVerticalData[0];
    const dims = first.dimension_scores ?? [];
    return dims.map((dim) => {
      const series = singleVerticalData.map((a) => {
        const match = a.dimension_scores?.find(
          (d) => d.name === dim.name || d.shortName === dim.shortName
        );
        return {
          date: a.created_at,
          score: match?.score ?? null,
        };
      });
      return {
        name: dim.name,
        shortName: dim.shortName,
        series,
      };
    });
  }, [singleVerticalData]);

  // --- Render guards ---
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <p className="text-navy/40 text-sm">Redirecting...</p>
      </div>
    );
  }

  const regionsForFilter = Array.from(
    new Set(assessments.map((a) => a.region).filter(Boolean))
  ) as string[];

  const useHighlight = verticalList.length >= 10;

  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <div className="bg-navy px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold/50">
              NMT Admin
            </p>
            <h1 className="font-display text-2xl text-white">
              Maturity Progression Tracker
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
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
            <a
              href="/admin/summary"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Summary
            </a>
            <span className="h-9 px-4 rounded-lg border border-gold/40 text-gold text-xs tracking-wider uppercase inline-flex items-center">
              Tracker
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
        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchAll}
              className="text-xs tracking-wider uppercase text-red-700 hover:text-red-900 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <Card className="border border-navy/5 shadow-none bg-white">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-1">
                  Vertical
                </p>
                <Select
                  value={filterVertical}
                  onValueChange={(v) => v && setFilterVertical(v)}
                >
                  <SelectTrigger className="w-52 h-9 bg-white border-navy/10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Verticals</SelectItem>
                    {verticals.map((v) => (
                      <SelectItem key={v.name} value={v.name}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-1">
                  Region
                </p>
                <Select
                  value={filterRegion}
                  onValueChange={(v) => v && setFilterRegion(v)}
                >
                  <SelectTrigger className="w-40 h-9 bg-white border-navy/10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.code}
                      </SelectItem>
                    ))}
                    {regionsForFilter
                      .filter((r) => !regions.find((x) => x.code === r))
                      .map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-1">
                  From
                </p>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-navy/10 bg-white text-sm text-navy/70"
                />
              </div>

              <div>
                <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-1">
                  To
                </p>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-navy/10 bg-white text-sm text-navy/70"
                />
              </div>

              <div className="flex-1" />

              <p className="text-xs text-navy/50 pb-2">
                Showing:{" "}
                <span className="font-medium text-navy">
                  {filtered.length}
                </span>{" "}
                assessment{filtered.length !== 1 ? "s" : ""} across{" "}
                <span className="font-medium text-navy">
                  {verticalList.length}
                </span>{" "}
                vertical{verticalList.length !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {loading && (
          <div className="p-12 text-center text-navy/40 text-sm bg-white rounded-lg border border-navy/5">
            Loading trajectory data...
          </div>
        )}

        {/* Empty state */}
        {!loading && !anyLongitudinal && filterVertical === "all" && (
          <Card className="border border-navy/5 shadow-none bg-white">
            <CardContent className="p-12 text-center space-y-6">
              <div>
                <p className="font-display text-2xl text-navy mb-2">
                  No longitudinal data yet
                </p>
                <p className="text-sm text-navy/50 max-w-lg mx-auto">
                  After the next NMT assessment, trajectory charts will appear
                  here — showing each vertical&apos;s maturity progression over
                  multiple assessments.
                </p>
              </div>

              {/* Faded preview */}
              <div className="opacity-30 pointer-events-none">
                <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40 mb-2">
                  Preview
                </p>
                <div className="h-56 bg-parchment/60 rounded-lg border border-navy/5 flex items-center justify-center">
                  <ResponsiveContainer width="95%" height="90%">
                    <LineChart
                      data={[
                        { date: "Jan 2026", A: 90, B: 100, C: 85 },
                        { date: "Apr 2026", A: 105, B: 115, C: 95 },
                        { date: "Jul 2026", A: 120, B: 125, C: 110 },
                      ]}
                    >
                      <CartesianGrid stroke="#e8e5df" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} />
                      <YAxis domain={[0, 175]} tick={{ fontSize: 10, fill: "#888" }} />
                      <Line type="monotone" dataKey="A" stroke="#c4a35a" strokeWidth={2} />
                      <Line type="monotone" dataKey="B" stroke="#2563eb" strokeWidth={2} />
                      <Line type="monotone" dataKey="C" stroke="#059669" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overall Trajectory (all verticals) */}
        {!loading && filterVertical === "all" && anyLongitudinal && (
          <Card className="border border-navy/5 shadow-none bg-white">
            <CardContent className="p-6">
              <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-display text-2xl text-navy">
                  Overall Trajectory
                </h2>
                <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40">
                  Total score over time · 0–175 scale
                </p>
              </div>

              {useHighlight && (
                <div className="mb-4">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-2">
                    Highlight verticals (others fade)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {verticalList.map((v) => {
                      const active = highlighted.has(v);
                      return (
                        <button
                          key={v}
                          onClick={() =>
                            setHighlighted((prev) => {
                              const next = new Set(prev);
                              if (next.has(v)) next.delete(v);
                              else next.add(v);
                              return next;
                            })
                          }
                          className={`h-7 px-3 rounded-full border text-[11px] tracking-wider transition-all ${
                            active
                              ? "bg-navy text-white border-navy"
                              : "bg-white text-navy/60 border-navy/15 hover:border-navy/30"
                          }`}
                          style={
                            active
                              ? { backgroundColor: verticalColor[v], borderColor: verticalColor[v] }
                              : undefined
                          }
                        >
                          {v}
                        </button>
                      );
                    })}
                    {highlighted.size > 0 && (
                      <button
                        onClick={() => setHighlighted(new Set())}
                        className="h-7 px-3 rounded-full border border-navy/10 text-[11px] text-navy/50 hover:text-navy"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overallData} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke="#e8e5df" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      type="category"
                      tickFormatter={(v) => formatMonthYear(String(v))}
                      tick={{ fontSize: 11, fill: "#6b6b6b" }}
                    />
                    <YAxis
                      domain={[0, 175]}
                      tick={{ fontSize: 11, fill: "#6b6b6b" }}
                      label={{
                        value: "Total Score",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 11, fill: "#888" },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fafaf8",
                        border: "1px solid #e8e5df",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(v) => formatFullDate(String(v))}
                      formatter={(value, name) => {
                        if (value == null) return ["—", String(name)];
                        const score = Number(value);
                        return [
                          `${score} (L${levelForScore(score)})`,
                          String(name),
                        ];
                      }}
                    />
                    {/* Maturity threshold reference lines */}
                    {LEVEL_THRESHOLDS.map((t) => (
                      <ReferenceLine
                        key={t.label}
                        y={t.score}
                        stroke="#c4a35a"
                        strokeDasharray="2 4"
                        strokeOpacity={0.4}
                        label={{
                          value: t.label,
                          position: "right",
                          fill: "#c4a35a",
                          fontSize: 10,
                        }}
                      />
                    ))}
                    {verticalList.map((v) => {
                      const dim =
                        useHighlight && highlighted.size > 0 && !highlighted.has(v);
                      return (
                        <Line
                          key={v}
                          type="monotone"
                          dataKey={v}
                          stroke={verticalColor[v]}
                          strokeWidth={dim ? 1 : 2}
                          strokeOpacity={dim ? 0.15 : 1}
                          dot={{ r: dim ? 2 : 3 }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with current level badges */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {verticalList.map((v) => {
                  const list = byVertical.get(v) ?? [];
                  const latest = list[list.length - 1];
                  if (!latest) return null;
                  return (
                    <div
                      key={v}
                      className="flex items-center gap-2 text-xs text-navy/70"
                    >
                      <span
                        className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: verticalColor[v] }}
                      />
                      <span className="truncate">{v}</span>
                      <Badge
                        className={`text-[9px] px-1.5 py-0 border ml-auto whitespace-nowrap ${maturityBadgeStyles[latest.maturity_level]}`}
                      >
                        L{latest.maturity_level}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Single-Vertical Detail */}
        {!loading && singleVerticalData && (
          <>
            {singleVerticalData.length < 2 ? (
              <Card className="border border-navy/5 shadow-none bg-white">
                <CardContent className="p-12 text-center">
                  <p className="font-display text-xl text-navy/70 mb-2">
                    Only one assessment on record for {filterVertical}
                  </p>
                  <p className="text-sm text-navy/40">
                    Trajectory charts appear after the second assessment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Trajectory card */}
                <Card className="border border-navy/5 shadow-none bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                      <h2 className="font-display text-2xl text-navy">
                        {filterVertical} — Trajectory
                      </h2>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40">
                        {singleVerticalData.length} assessments
                      </p>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={singleVerticalData.map((a) => ({
                            date: a.created_at,
                            score: a.total_score,
                            level: a.maturity_level,
                          }))}
                          margin={{ top: 18, right: 24, left: 0, bottom: 8 }}
                        >
                          <CartesianGrid stroke="#e8e5df" strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            type="category"
                            tickFormatter={(v) => formatMonthYear(String(v))}
                            tick={{ fontSize: 11, fill: "#6b6b6b" }}
                          />
                          <YAxis
                            domain={[0, 175]}
                            tick={{ fontSize: 11, fill: "#6b6b6b" }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fafaf8",
                              border: "1px solid #e8e5df",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            labelFormatter={(v) => formatFullDate(String(v))}
                            formatter={(value, name) => {
                              if (name === "score") {
                                const s = Number(value);
                                return [`${s} (L${levelForScore(s)})`, "Score"];
                              }
                              return [String(value), String(name)];
                            }}
                          />
                          {LEVEL_THRESHOLDS.map((t) => (
                            <ReferenceLine
                              key={t.label}
                              y={t.score}
                              stroke="#c4a35a"
                              strokeDasharray="2 4"
                              strokeOpacity={0.4}
                              label={{
                                value: t.label,
                                position: "right",
                                fill: "#c4a35a",
                                fontSize: 10,
                              }}
                            />
                          ))}
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#c4a35a"
                            strokeWidth={2.5}
                            dot={{ r: 5, fill: "#c4a35a" }}
                            activeDot={{ r: 7 }}
                          >
                            <LabelList
                              dataKey="score"
                              position="top"
                              fontSize={10}
                              fill="#0c1425"
                              formatter={(val: unknown) =>
                                `L${levelForScore(Number(val))}`
                              }
                            />
                          </Line>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Movement summary */}
                {(() => {
                  const first = singleVerticalData[0];
                  const last = singleVerticalData[singleVerticalData.length - 1];
                  const delta = last.total_score - first.total_score;
                  const arrow =
                    delta > 0 ? "\u{1F4C8}" : delta < 0 ? "\u{1F4C9}" : "\u2014";
                  return (
                    <Card className="border border-navy/5 shadow-none bg-white">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-3xl">{arrow}</span>
                          <div className="flex-1 min-w-[240px]">
                            <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                              Movement Summary
                            </p>
                            <p className="text-navy mt-1">
                              From{" "}
                              <span className="font-medium">
                                {formatFullDate(first.created_at)}
                              </span>{" "}
                              to{" "}
                              <span className="font-medium">
                                {formatFullDate(last.created_at)}
                              </span>
                              ,{" "}
                              <span
                                className={`font-semibold ${
                                  delta > 0
                                    ? "text-emerald-700"
                                    : delta < 0
                                      ? "text-red-700"
                                      : "text-navy/60"
                                }`}
                              >
                                {delta > 0 ? "+" : ""}
                                {delta} points
                              </span>{" "}
                              (
                              <span className="text-navy/60">
                                L{first.maturity_level} {maturityLabels[first.maturity_level]}
                              </span>{" "}
                              &rarr;{" "}
                              <span className="font-medium">
                                L{last.maturity_level} {maturityLabels[last.maturity_level]}
                              </span>
                              )
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Dimension trajectories — 7 small line charts, 3-col grid */}
                <Card className="border border-navy/5 shadow-none bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                      <h2 className="font-display text-2xl text-navy">
                        Dimension Trajectories
                      </h2>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40">
                        Each of the 7 dimensions · 0–25 scale
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dimensionTrajectories.map((dim, i) => (
                        <div
                          key={dim.name}
                          className="rounded-lg border border-navy/10 bg-parchment/40 p-3"
                        >
                          <div className="flex items-baseline justify-between mb-2">
                            <p className="text-sm font-semibold text-navy truncate">
                              {dim.shortName || dim.name}
                            </p>
                            {(() => {
                              const first = dim.series[0]?.score;
                              const last = dim.series[dim.series.length - 1]?.score;
                              if (first == null || last == null) return null;
                              const d = last - first;
                              return (
                                <span
                                  className={`text-[10px] font-medium tabular-nums ${
                                    d > 0
                                      ? "text-emerald-700"
                                      : d < 0
                                        ? "text-red-700"
                                        : "text-navy/50"
                                  }`}
                                >
                                  {d > 0 ? "+" : ""}
                                  {d}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="h-28">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={dim.series.map((p) => ({
                                  date: p.date,
                                  score: p.score,
                                }))}
                                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                              >
                                <CartesianGrid stroke="#e8e5df" strokeDasharray="2 3" />
                                <XAxis
                                  dataKey="date"
                                  type="category"
                                  tickFormatter={(v) => formatMonthYear(String(v))}
                                  tick={{ fontSize: 9, fill: "#888" }}
                                />
                                <YAxis
                                  domain={[0, 25]}
                                  tick={{ fontSize: 9, fill: "#888" }}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "#fafaf8",
                                    border: "1px solid #e8e5df",
                                    borderRadius: 6,
                                    fontSize: 11,
                                  }}
                                  labelFormatter={(v) => formatFullDate(String(v))}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="score"
                                  stroke={pickColor(i)}
                                  strokeWidth={2}
                                  dot={{ r: 3, fill: pickColor(i) }}
                                  connectNulls
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Commitments review */}
                {commitmentReview.length > 0 && (
                  <Card className="border border-amber-200 shadow-none bg-amber-50/40">
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h2 className="font-display text-2xl text-navy">
                          Did the Commitment Work?
                        </h2>
                        <p className="text-sm text-navy/60 mt-1">
                          Previous commitments targeting dimensions where
                          improvement was <span className="font-semibold">not</span> observed in the
                          follow-up assessment.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {commitmentReview.map((r) => (
                          <div
                            key={r.commitment.id}
                            className="rounded-lg border border-amber-200 bg-white p-4"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <p className="font-semibold text-navy">
                                  {r.commitment.focus_dimension}
                                </p>
                                <p className="text-xs text-navy/50 mt-0.5">
                                  Committed on{" "}
                                  {formatFullDate(r.commitment.created_at)} · Target
                                  L{r.commitment.current_level} &rarr; L
                                  {r.commitment.target_level}
                                </p>
                              </div>
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                                Flag
                              </Badge>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <div>
                                <p className="text-[10px] tracking-wider uppercase text-navy/40">
                                  Before
                                </p>
                                <p className="font-medium text-navy tabular-nums">
                                  {r.beforeScore ?? "—"}
                                </p>
                              </div>
                              <span className="text-navy/30">&rarr;</span>
                              <div>
                                <p className="text-[10px] tracking-wider uppercase text-navy/40">
                                  After
                                </p>
                                <p className="font-medium text-navy tabular-nums">
                                  {r.afterScore ?? "—"}
                                </p>
                              </div>
                              <div className="flex-1" />
                              <p className="text-xs text-amber-800">
                                No score improvement observed.
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* Aggregate Movement (always shown when data exists) */}
        {!loading && anyLongitudinal && (
          <Card className="border border-navy/5 shadow-none bg-white">
            <CardContent className="p-6">
              <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-display text-2xl text-navy">
                  Aggregate Movement
                </h2>
                <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40">
                  Verticals with 2+ assessments, sorted by delta
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy/10 text-left">
                      <th className="py-2 pr-3 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                        Vertical
                      </th>
                      <th className="py-2 px-3 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                        First &rarr; Latest
                      </th>
                      <th className="py-2 px-3 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                        Delta
                      </th>
                      <th className="py-2 px-3 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                        Level
                      </th>
                      <th className="py-2 px-3 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                        Trend
                      </th>
                      <th className="py-2 pl-3 text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold text-right">
                        Assessments
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => {
                      const trendEmoji =
                        m.delta > 0 ? "\u{1F4C8}" : m.delta < 0 ? "\u{1F4C9}" : "\u2014";
                      const trendLabel =
                        m.delta > 0
                          ? "improved"
                          : m.delta < 0
                            ? "declined"
                            : "no change";
                      const trendColor =
                        m.delta > 0
                          ? "text-emerald-700"
                          : m.delta < 0
                            ? "text-red-700"
                            : "text-navy/50";
                      return (
                        <tr
                          key={m.vertical}
                          className="border-b border-navy/5 hover:bg-parchment/40 transition-colors"
                        >
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-sm"
                                style={{
                                  backgroundColor: verticalColor[m.vertical],
                                }}
                              />
                              <span className="font-medium text-navy">
                                {m.vertical}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 tabular-nums text-navy/70">
                            {m.firstScore} &rarr; {m.latestScore}
                          </td>
                          <td
                            className={`py-3 px-3 tabular-nums font-semibold ${trendColor}`}
                          >
                            {m.delta > 0 ? "+" : ""}
                            {m.delta}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`text-[10px] border ${maturityBadgeStyles[m.firstLevel]}`}
                              >
                                L{m.firstLevel}
                              </Badge>
                              <span className="text-navy/30">&rarr;</span>
                              <Badge
                                className={`text-[10px] border ${maturityBadgeStyles[m.latestLevel]}`}
                              >
                                L{m.latestLevel}
                              </Badge>
                            </div>
                          </td>
                          <td className={`py-3 px-3 ${trendColor}`}>
                            <span className="text-base mr-1">{trendEmoji}</span>
                            <span className="text-xs capitalize">{trendLabel}</span>
                          </td>
                          <td className="py-3 pl-3 text-right tabular-nums text-navy/60">
                            {m.count}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
