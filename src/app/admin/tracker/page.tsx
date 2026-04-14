"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

// ---------- Fetch helpers ----------
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
const LINE_COLORS = [
  "#c4a35a",
  "#2563eb",
  "#059669",
  "#dc2626",
  "#7c3aed",
  "#d97706",
  "#ec4899",
  "#0d9488",
];

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

const maturityColorMap: Record<number, string> = {
  1: "#b91c1c",
  2: "#c2410c",
  3: "#a16207",
  4: "#1d4ed8",
  5: "#047857",
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
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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

// ---------- Sub-components ----------

function SectionHead({
  num,
  title,
  subtitle,
}: {
  num: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem" }}>
        <span
          className="font-display"
          style={{
            fontSize: "4rem",
            color: "#c4a35a",
            opacity: 0.18,
            lineHeight: 1,
            marginTop: "-0.15rem",
            userSelect: "none",
          }}
        >
          {num}
        </span>
        <div style={{ paddingTop: "0.2rem", flex: 1 }}>
          <h2
            className="font-display"
            style={{ fontSize: "1.5rem", color: "#0c1425", letterSpacing: "-0.01em" }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="font-display italic"
              style={{ fontSize: "0.78rem", color: "#6b5b35", marginTop: "0.15rem", letterSpacing: "0.02em" }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div
        style={{
          height: "1px",
          background: "linear-gradient(to right, #c4a35a, transparent)",
          marginTop: "0.6rem",
        }}
      />
    </div>
  );
}

function FigCaption({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-display italic"
      style={{ fontSize: "0.7rem", color: "#8a7a5a", marginTop: "0.6rem", letterSpacing: "0.03em" }}
    >
      {children}
    </p>
  );
}

function HairRule() {
  return <div style={{ height: "1px", background: "#e8e5df", margin: "2.5rem 0" }} />;
}

// ---------- Page ----------
export default function TrackerPage() {
  const [storedPassword, setStoredPassword] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [commitments, setCommitments] = useState<CommitmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterVertical, setFilterVertical] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (!saved) {
      window.location.href = "/admin";
      return;
    }
    setStoredPassword(saved);
    setAuthChecked(true);
  }, []);

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
    setLoading(false);
  }, [storedPassword]);

  useEffect(() => {
    if (authChecked) fetchAll();
  }, [authChecked, fetchAll]);

  const filtered = useMemo(() => {
    return assessments.filter((a) => {
      if (filterVertical !== "all" && a.vertical_name !== filterVertical) return false;
      if (filterRegion !== "all" && (a.region ?? "") !== filterRegion) return false;
      if (dateFrom) {
        if (new Date(a.created_at) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(a.created_at) > end) return false;
      }
      return true;
    });
  }, [assessments, filterVertical, filterRegion, dateFrom, dateTo]);

  const byVertical = useMemo(() => {
    const map = new Map<string, AssessmentRow[]>();
    filtered.forEach((a) => {
      const bucket = map.get(a.vertical_name) ?? [];
      bucket.push(a);
      map.set(a.vertical_name, bucket);
    });
    for (const [, list] of map) {
      list.sort((x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime());
    }
    return map;
  }, [filtered]);

  const verticalList = useMemo(() => Array.from(byVertical.keys()).sort(), [byVertical]);

  const verticalColor = useMemo(() => {
    const m: Record<string, string> = {};
    verticalList.forEach((v, i) => { m[v] = pickColor(i); });
    return m;
  }, [verticalList]);

  const overallData = useMemo(() => {
    const allDates = new Set<string>();
    byVertical.forEach((list) => list.forEach((a) => allDates.add(a.created_at)));
    const sortedDates = Array.from(allDates).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    return sortedDates.map((iso) => {
      const row: Record<string, string | number | null> = { date: iso };
      byVertical.forEach((list, vert) => {
        const match = list.find((a) => a.created_at === iso);
        row[vert] = match ? match.total_score : null;
      });
      return row;
    });
  }, [byVertical]);

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

  const singleVerticalData = useMemo(() => {
    if (filterVertical === "all") return null;
    const list = byVertical.get(filterVertical) ?? [];
    if (list.length === 0) return null;
    return list;
  }, [filterVertical, byVertical]);

  const commitmentReview = useMemo(() => {
    if (!singleVerticalData || singleVerticalData.length < 2) return [];
    const vertCommits = commitments.filter((c) => c.vertical_name === filterVertical);
    if (vertCommits.length === 0) return [];

    const review: {
      commitment: CommitmentRow;
      beforeScore: number | null;
      afterScore: number | null;
      improved: boolean;
    }[] = [];

    vertCommits.forEach((c) => {
      const cDate = new Date(c.created_at).getTime();
      const before = singleVerticalData.filter((a) => new Date(a.created_at).getTime() <= cDate).pop();
      const after = singleVerticalData.filter((a) => new Date(a.created_at).getTime() > cDate).shift();
      if (!after) return;
      const beforeDim = before?.dimension_scores?.find(
        (d) => d.name === c.focus_dimension || d.shortName === c.focus_dimension
      );
      const afterDim = after.dimension_scores?.find(
        (d) => d.name === c.focus_dimension || d.shortName === c.focus_dimension
      );
      const beforeScore = beforeDim?.score ?? c.focus_dimension_score ?? null;
      const afterScore = afterDim?.score ?? null;
      const improved = beforeScore != null && afterScore != null && afterScore > beforeScore;
      if (!improved) {
        review.push({ commitment: c, beforeScore, afterScore, improved });
      }
    });
    return review;
  }, [commitments, singleVerticalData, filterVertical]);

  const dimensionTrajectories = useMemo(() => {
    if (!singleVerticalData || singleVerticalData.length === 0) return [];
    const first = singleVerticalData[0];
    const dims = first.dimension_scores ?? [];
    return dims.map((dim) => {
      const series = singleVerticalData.map((a) => {
        const match = a.dimension_scores?.find(
          (d) => d.name === dim.name || d.shortName === dim.shortName
        );
        return { date: a.created_at, score: match?.score ?? null };
      });
      return { name: dim.name, shortName: dim.shortName, series };
    });
  }, [singleVerticalData]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <p style={{ color: "rgba(12,20,37,0.35)", fontSize: "0.8rem", letterSpacing: "0.1em" }}>
          Redirecting…
        </p>
      </div>
    );
  }

  const regionsForFilter = Array.from(
    new Set(assessments.map((a) => a.region).filter(Boolean))
  ) as string[];

  const useHighlight = verticalList.length >= 10;

  const tooltipStyle = {
    backgroundColor: "#fafaf8",
    border: "1px solid #e8e5df",
    borderRadius: "4px",
    fontSize: "0.78rem",
    fontFamily: "var(--font-body, system-ui)",
  };

  return (
    <div className="min-h-screen" style={{ background: "#fafaf8" }}>

      {/* ── Masthead nav strip ─────────────────────────────────── */}
      <nav style={{ background: "#0c1425", borderBottom: "1px solid rgba(196,163,90,0.15)" }}>
        <div
          style={{
            maxWidth: "76rem",
            margin: "0 auto",
            padding: "0 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "3.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span
              className="font-display"
              style={{ color: "#c4a35a", fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase" }}
            >
              Yi NMT
            </span>
            <span style={{ color: "rgba(196,163,90,0.3)", fontSize: "0.7rem" }}>/</span>
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Progression Tracker
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap" }}>
            {[
              { href: "/admin", label: "Dashboard" },
              { href: "/admin/live", label: "Live" },
              { href: "/admin/commitments", label: "Commitments" },
              { href: "/admin/manage", label: "Manage" },
              { href: "/admin/facilitator", label: "Facilitator" },
              { href: "/admin/summary", label: "Summary" },
              { href: "/", label: "Test" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.65rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.45)",
                  borderRadius: "4px",
                  transition: "color 0.15s",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#c4a35a")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
              >
                {l.label}
              </a>
            ))}
            <span
              style={{
                padding: "0.3rem 0.75rem",
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#c4a35a",
                border: "1px solid rgba(196,163,90,0.4)",
                borderRadius: "4px",
              }}
            >
              Tracker
            </span>
          </div>
        </div>
      </nav>

      {/* ── Report body ───────────────────────────────────────── */}
      <div style={{ maxWidth: "76rem", margin: "0 auto", padding: "0 2rem 5rem" }}>

        {/* ── Cover / title block ──────────────────────────────── */}
        <div
          style={{
            padding: "3.5rem 0 2.5rem",
            borderBottom: "2px solid #0c1425",
            marginBottom: "1.5rem",
          }}
        >
          <p
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#c4a35a",
              marginBottom: "0.9rem",
              fontFamily: "var(--font-body, system-ui)",
            }}
          >
            Young Indians · National Management Team · Longitudinal Analysis
          </p>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              lineHeight: 1.1,
              color: "#0c1425",
              letterSpacing: "-0.02em",
              maxWidth: "42rem",
              marginBottom: "1.25rem",
            }}
          >
            Maturity Progression Tracker
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", color: "rgba(12,20,37,0.55)", fontFamily: "var(--font-body, system-ui)" }}>
              {loading ? "—" : filtered.length} assessment{filtered.length !== 1 ? "s" : ""}
            </span>
            <span style={{ width: "1px", height: "1rem", background: "rgba(12,20,37,0.15)" }} />
            <span style={{ fontSize: "0.82rem", color: "#0c1425", fontWeight: 500, fontFamily: "var(--font-body, system-ui)" }}>
              {verticalList.length} vertical{verticalList.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ── Filters ──────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "1rem",
            flexWrap: "wrap",
            padding: "1.25rem 0 1rem",
          }}
        >
          {/* Vertical */}
          <div>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(12,20,37,0.4)", marginBottom: "0.3rem", fontFamily: "var(--font-body, system-ui)", fontWeight: 600 }}>
              Vertical
            </p>
            <Select value={filterVertical} onValueChange={(v) => v && setFilterVertical(v)}>
              <SelectTrigger className="w-52 h-9 bg-white border-navy/10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verticals</SelectItem>
                {verticals.map((v) => (
                  <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region */}
          <div>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(12,20,37,0.4)", marginBottom: "0.3rem", fontFamily: "var(--font-body, system-ui)", fontWeight: 600 }}>
              Region
            </p>
            <Select value={filterRegion} onValueChange={(v) => v && setFilterRegion(v)}>
              <SelectTrigger className="w-40 h-9 bg-white border-navy/10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r.code} value={r.code}>{r.code}</SelectItem>
                ))}
                {regionsForFilter
                  .filter((r) => !regions.find((x) => x.code === r))
                  .map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          {[
            { label: "From", value: dateFrom, setter: setDateFrom },
            { label: "To", value: dateTo, setter: setDateTo },
          ].map((f) => (
            <div key={f.label}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(12,20,37,0.4)", marginBottom: "0.3rem", fontFamily: "var(--font-body, system-ui)", fontWeight: 600 }}>
                {f.label}
              </p>
              <input
                type="date"
                value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                style={{
                  height: "2.1rem",
                  padding: "0 0.75rem",
                  border: "1px solid rgba(12,20,37,0.12)",
                  borderRadius: "4px",
                  background: "#fff",
                  fontSize: "0.82rem",
                  color: "rgba(12,20,37,0.7)",
                  outline: "none",
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ height: "1px", background: "#e8e5df", marginBottom: "1.5rem" }} />

        {/* ── Error ────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem 1.25rem",
              border: "1px solid rgba(185,28,28,0.25)",
              background: "rgba(185,28,28,0.04)",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <p style={{ fontSize: "0.82rem", color: "#b91c1c" }}>{error}</p>
            <button
              onClick={fetchAll}
              style={{ fontSize: "0.7rem", textDecoration: "underline", color: "#b91c1c", background: "none", border: "none", cursor: "pointer" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────── */}
        {loading && (
          <div style={{ padding: "5rem", textAlign: "center", color: "rgba(12,20,37,0.3)", fontSize: "0.82rem" }}>
            Loading trajectory data…
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────── */}
        {!loading && !anyLongitudinal && filterVertical === "all" && (
          <div style={{ paddingTop: "2rem" }}>
            <SectionHead
              num="01"
              title="No longitudinal data yet"
              subtitle="Trajectory charts appear after the second assessment per vertical"
            />
            <p style={{ fontSize: "0.9rem", color: "rgba(12,20,37,0.5)", maxWidth: "40rem", lineHeight: 1.7, marginBottom: "2rem" }}>
              After each subsequent NMT session, this page will show each vertical&apos;s
              maturity progression over time — total score trajectory, per-dimension movement,
              and commitment follow-through analysis.
            </p>

            {/* Faded preview */}
            <div style={{ opacity: 0.25, pointerEvents: "none" }}>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e8e5df",
                  borderRadius: "6px",
                  padding: "1.5rem",
                  height: "280px",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
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
              <FigCaption>Preview — trajectory chart will appear here after the second NMT session.</FigCaption>
            </div>
          </div>
        )}

        {/* ── Body ─────────────────────────────────────────────── */}
        {!loading && (
          <div style={{ paddingTop: "1rem" }}>

            {/* ══ Overall Trajectory (all verticals) ══════════════ */}
            {filterVertical === "all" && anyLongitudinal && (
              <section style={{ marginBottom: "4rem" }}>
                <SectionHead
                  num="01"
                  title="Overall Trajectory"
                  subtitle="Total score over time · 0–175 scale · Gold dashes mark level boundaries"
                />

                {/* Highlight controls (10+ verticals) */}
                {useHighlight && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <p
                      style={{
                        fontSize: "0.6rem",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "rgba(12,20,37,0.4)",
                        fontFamily: "var(--font-body, system-ui)",
                        fontWeight: 600,
                        marginBottom: "0.5rem",
                      }}
                    >
                      Highlight verticals (others fade)
                    </p>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
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
                            style={{
                              height: "1.75rem",
                              padding: "0 0.75rem",
                              borderRadius: "100px",
                              border: active
                                ? `1px solid ${verticalColor[v]}`
                                : "1px solid rgba(12,20,37,0.12)",
                              background: active ? verticalColor[v] : "transparent",
                              color: active ? "#fff" : "rgba(12,20,37,0.55)",
                              fontSize: "0.7rem",
                              letterSpacing: "0.04em",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            {v}
                          </button>
                        );
                      })}
                      {highlighted.size > 0 && (
                        <button
                          onClick={() => setHighlighted(new Set())}
                          style={{
                            height: "1.75rem",
                            padding: "0 0.75rem",
                            borderRadius: "100px",
                            border: "1px solid rgba(12,20,37,0.08)",
                            background: "transparent",
                            color: "rgba(12,20,37,0.4)",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e5df",
                    borderRadius: "6px",
                    padding: "1.5rem",
                  }}
                >
                  <div style={{ height: "24rem" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overallData} margin={{ top: 10, right: 40, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke="#f0ede8" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          type="category"
                          tickFormatter={(v) => formatMonthYear(String(v))}
                          tick={{ fontSize: 10, fill: "#8a8a8a", fontFamily: "var(--font-body, system-ui)" }}
                          axisLine={{ stroke: "#e8e5df" }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 175]}
                          tick={{ fontSize: 10, fill: "#8a8a8a", fontFamily: "var(--font-body, system-ui)" }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: "Score", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#aaa" } }}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          labelFormatter={(v) => formatFullDate(String(v))}
                          formatter={(value, name) => {
                            if (value == null) return ["—", String(name)];
                            const score = Number(value);
                            return [`${score} · L${levelForScore(score)}`, String(name)];
                          }}
                        />
                        {LEVEL_THRESHOLDS.map((t) => (
                          <ReferenceLine
                            key={t.label}
                            y={t.score}
                            stroke="#c4a35a"
                            strokeDasharray="3 5"
                            strokeOpacity={0.4}
                            label={{ value: t.label, position: "right", fill: "#c4a35a", fontSize: 9 }}
                          />
                        ))}
                        {verticalList.map((v) => {
                          const dimmed = useHighlight && highlighted.size > 0 && !highlighted.has(v);
                          return (
                            <Line
                              key={v}
                              type="monotone"
                              dataKey={v}
                              stroke={verticalColor[v]}
                              strokeWidth={dimmed ? 1 : 2}
                              strokeOpacity={dimmed ? 0.12 : 1}
                              dot={{ r: dimmed ? 1.5 : 3, fill: verticalColor[v] }}
                              activeDot={{ r: 5 }}
                              connectNulls
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div
                    style={{
                      marginTop: "1.25rem",
                      paddingTop: "1rem",
                      borderTop: "1px solid #f0ede8",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                      gap: "0.5rem",
                    }}
                  >
                    {verticalList.map((v) => {
                      const list = byVertical.get(v) ?? [];
                      const latest = list[list.length - 1];
                      if (!latest) return null;
                      return (
                        <div key={v} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "2px",
                              background: verticalColor[v],
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: "0.75rem", color: "rgba(12,20,37,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {v}
                          </span>
                          <Badge
                            className={`text-[9px] px-1.5 py-0 border ml-auto whitespace-nowrap`}
                            style={{
                              background: `${maturityColorMap[latest.maturity_level]}18`,
                              color: maturityColorMap[latest.maturity_level],
                              borderColor: `${maturityColorMap[latest.maturity_level]}40`,
                              fontSize: "0.6rem",
                              padding: "0 0.35rem",
                            }}
                          >
                            L{latest.maturity_level}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <FigCaption>
                  Fig. 1 — Total score trajectory per vertical. Gold dashed lines mark level thresholds (L2 at 87, L3 at 111, L4 at 139, L5 at 157).
                </FigCaption>
              </section>
            )}

            {/* ══ Single-Vertical Detail ══════════════════════════ */}
            {singleVerticalData && (
              <>
                {singleVerticalData.length < 2 ? (
                  <div style={{ padding: "3rem 0", textAlign: "center" }}>
                    <p className="font-display" style={{ fontSize: "1.4rem", color: "rgba(12,20,37,0.6)", marginBottom: "0.4rem" }}>
                      Only one assessment on record for {filterVertical}
                    </p>
                    <p style={{ fontSize: "0.82rem", color: "rgba(12,20,37,0.4)" }}>
                      Trajectory charts appear after the second assessment.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Main trajectory */}
                    <section style={{ marginBottom: "3rem" }}>
                      <SectionHead
                        num="01"
                        title={`${filterVertical} — Score Trajectory`}
                        subtitle={`${singleVerticalData.length} assessments on record`}
                      />

                      <div style={{ background: "#fff", border: "1px solid #e8e5df", borderRadius: "6px", padding: "1.5rem" }}>
                        <div style={{ height: "20rem" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={singleVerticalData.map((a) => ({
                                date: a.created_at,
                                score: a.total_score,
                                level: a.maturity_level,
                              }))}
                              margin={{ top: 18, right: 40, left: 0, bottom: 8 }}
                            >
                              <CartesianGrid stroke="#f0ede8" strokeDasharray="3 3" />
                              <XAxis
                                dataKey="date"
                                type="category"
                                tickFormatter={(v) => formatMonthYear(String(v))}
                                tick={{ fontSize: 10, fill: "#8a8a8a", fontFamily: "var(--font-body, system-ui)" }}
                                axisLine={{ stroke: "#e8e5df" }}
                                tickLine={false}
                              />
                              <YAxis
                                domain={[0, 175]}
                                tick={{ fontSize: 10, fill: "#8a8a8a", fontFamily: "var(--font-body, system-ui)" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                contentStyle={tooltipStyle}
                                labelFormatter={(v) => formatFullDate(String(v))}
                                formatter={(value, name) => {
                                  if (name === "score") {
                                    const s = Number(value);
                                    return [`${s} · L${levelForScore(s)}`, "Score"];
                                  }
                                  return [String(value), String(name)];
                                }}
                              />
                              {LEVEL_THRESHOLDS.map((t) => (
                                <ReferenceLine
                                  key={t.label}
                                  y={t.score}
                                  stroke="#c4a35a"
                                  strokeDasharray="3 5"
                                  strokeOpacity={0.4}
                                  label={{ value: t.label, position: "right", fill: "#c4a35a", fontSize: 9 }}
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
                                  style={{ fontSize: "0.65rem", fill: "#0c1425", fontFamily: "var(--font-body, system-ui)" }}
                                  formatter={(val: unknown) => `L${levelForScore(Number(val))}`}
                                />
                              </Line>
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <FigCaption>
                        Fig. 1 — Total score over time for {filterVertical}. Labels indicate maturity level at each assessment.
                      </FigCaption>
                    </section>

                    {/* Movement summary */}
                    {(() => {
                      const first = singleVerticalData[0];
                      const last = singleVerticalData[singleVerticalData.length - 1];
                      const delta = last.total_score - first.total_score;
                      const isGain = delta > 0;
                      const isLoss = delta < 0;
                      return (
                        <section style={{ marginBottom: "3rem" }}>
                          <SectionHead num="02" title="Movement Summary" />
                          <div
                            style={{
                              background: "#fff",
                              border: "1px solid #e8e5df",
                              borderRadius: "6px",
                              padding: "1.5rem 2rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "2rem",
                              flexWrap: "wrap",
                            }}
                          >
                            {/* Delta badge */}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "0.2rem",
                                minWidth: "5rem",
                              }}
                            >
                              <span
                                className="font-display"
                                style={{
                                  fontSize: "2.5rem",
                                  lineHeight: 1,
                                  color: isGain ? "#047857" : isLoss ? "#b91c1c" : "rgba(12,20,37,0.4)",
                                }}
                              >
                                {isGain ? "+" : ""}{delta}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.6rem",
                                  letterSpacing: "0.15em",
                                  textTransform: "uppercase",
                                  color: "rgba(12,20,37,0.4)",
                                  fontFamily: "var(--font-body, system-ui)",
                                }}
                              >
                                net points
                              </span>
                            </div>

                            <div style={{ width: "1px", height: "3.5rem", background: "#e8e5df" }} />

                            {/* Narrative */}
                            <div style={{ flex: 1, minWidth: "16rem" }}>
                              <p
                                className="font-display"
                                style={{ fontSize: "1.05rem", color: "#0c1425", lineHeight: 1.5 }}
                              >
                                From{" "}
                                <span style={{ fontStyle: "italic" }}>{formatFullDate(first.created_at)}</span>{" "}
                                to{" "}
                                <span style={{ fontStyle: "italic" }}>{formatFullDate(last.created_at)}</span>,{" "}
                                {filterVertical} moved from{" "}
                                <span style={{ color: maturityColorMap[first.maturity_level], fontWeight: 600, fontStyle: "normal" }}>
                                  L{first.maturity_level} {maturityLabels[first.maturity_level]}
                                </span>{" "}
                                to{" "}
                                <span style={{ color: maturityColorMap[last.maturity_level], fontWeight: 600, fontStyle: "normal" }}>
                                  L{last.maturity_level} {maturityLabels[last.maturity_level]}
                                </span>.
                              </p>
                            </div>

                            {/* Score from-to */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                              }}
                            >
                              <div style={{ textAlign: "center" }}>
                                <p style={{ fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(12,20,37,0.35)", fontFamily: "var(--font-body, system-ui)", marginBottom: "0.15rem" }}>First</p>
                                <span className="font-display" style={{ fontSize: "1.6rem", color: maturityColorMap[first.maturity_level] }}>{first.total_score}</span>
                              </div>
                              <span style={{ fontSize: "1rem", color: "rgba(12,20,37,0.2)" }}>→</span>
                              <div style={{ textAlign: "center" }}>
                                <p style={{ fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(12,20,37,0.35)", fontFamily: "var(--font-body, system-ui)", marginBottom: "0.15rem" }}>Latest</p>
                                <span className="font-display" style={{ fontSize: "1.6rem", color: maturityColorMap[last.maturity_level] }}>{last.total_score}</span>
                              </div>
                            </div>
                          </div>
                        </section>
                      );
                    })()}

                    {/* Dimension trajectories */}
                    <section style={{ marginBottom: "3rem" }}>
                      <SectionHead
                        num="03"
                        title="Dimension Trajectories"
                        subtitle="Each of the 7 dimensions · 0–25 scale"
                      />
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(17rem, 1fr))",
                          gap: "1px",
                          background: "#e8e5df",
                          border: "1px solid #e8e5df",
                          borderRadius: "6px",
                          overflow: "hidden",
                        }}
                      >
                        {dimensionTrajectories.map((dim, i) => {
                          const firstScore = dim.series[0]?.score;
                          const lastScore = dim.series[dim.series.length - 1]?.score;
                          const d = firstScore != null && lastScore != null ? lastScore - firstScore : null;
                          return (
                            <div
                              key={dim.name}
                              style={{ background: "#fff", padding: "1rem 1.25rem" }}
                            >
                              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                                <p
                                  style={{
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    color: "#0c1425",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    flex: 1,
                                  }}
                                >
                                  {dim.shortName || dim.name}
                                </p>
                                {d !== null && (
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      fontWeight: 600,
                                      fontVariantNumeric: "tabular-nums",
                                      color: d > 0 ? "#047857" : d < 0 ? "#b91c1c" : "rgba(12,20,37,0.4)",
                                      marginLeft: "0.5rem",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {d > 0 ? "+" : ""}{d}
                                  </span>
                                )}
                              </div>
                              <div style={{ height: "7rem" }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart
                                    data={dim.series.map((p) => ({ date: p.date, score: p.score }))}
                                    margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
                                  >
                                    <CartesianGrid stroke="#f0ede8" strokeDasharray="2 3" />
                                    <XAxis
                                      dataKey="date"
                                      type="category"
                                      tickFormatter={(v) => formatMonthYear(String(v))}
                                      tick={{ fontSize: 8, fill: "#aaa", fontFamily: "var(--font-body, system-ui)" }}
                                      axisLine={false}
                                      tickLine={false}
                                    />
                                    <YAxis
                                      domain={[0, 25]}
                                      tick={{ fontSize: 8, fill: "#aaa" }}
                                      axisLine={false}
                                      tickLine={false}
                                    />
                                    <Tooltip
                                      contentStyle={{ ...tooltipStyle, fontSize: "0.7rem" }}
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
                          );
                        })}
                      </div>
                      <FigCaption>
                        Fig. 2 — Per-dimension score trajectory. Each panel is independently scaled 0–25. Delta shown top-right.
                      </FigCaption>
                    </section>

                    {/* Commitment review */}
                    {commitmentReview.length > 0 && (
                      <section style={{ marginBottom: "3rem" }}>
                        <SectionHead
                          num="04"
                          title="Commitment Follow-Through"
                          subtitle="Previous commitments where no score improvement was observed in the follow-up assessment"
                        />
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {commitmentReview.map((r) => (
                            <div
                              key={r.commitment.id}
                              style={{
                                background: "#fff",
                                border: "1px solid rgba(217,119,6,0.25)",
                                borderLeft: "3px solid #d97706",
                                borderRadius: "0 4px 4px 0",
                                padding: "1rem 1.25rem",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem" }}>
                                <div>
                                  <p style={{ fontWeight: 600, color: "#0c1425", fontSize: "0.9rem" }}>
                                    {r.commitment.focus_dimension}
                                  </p>
                                  <p style={{ fontSize: "0.72rem", color: "rgba(12,20,37,0.45)", marginTop: "0.15rem", fontFamily: "var(--font-body, system-ui)" }}>
                                    Committed {formatFullDate(r.commitment.created_at)} ·
                                    Target L{r.commitment.current_level} → L{r.commitment.target_level}
                                  </p>
                                </div>
                                <span
                                  style={{
                                    fontSize: "0.6rem",
                                    letterSpacing: "0.15em",
                                    textTransform: "uppercase",
                                    color: "#b45309",
                                    background: "rgba(217,119,6,0.1)",
                                    padding: "0.15rem 0.5rem",
                                    borderRadius: "2px",
                                    fontFamily: "var(--font-body, system-ui)",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Flag
                                </span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", fontSize: "0.82rem" }}>
                                <div>
                                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,20,37,0.35)", fontFamily: "var(--font-body, system-ui)", marginBottom: "0.1rem" }}>Before</p>
                                  <span style={{ fontWeight: 600, color: "#0c1425", fontVariantNumeric: "tabular-nums" }}>{r.beforeScore ?? "—"}</span>
                                </div>
                                <span style={{ color: "rgba(12,20,37,0.2)" }}>→</span>
                                <div>
                                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,20,37,0.35)", fontFamily: "var(--font-body, system-ui)", marginBottom: "0.1rem" }}>After</p>
                                  <span style={{ fontWeight: 600, color: "#0c1425", fontVariantNumeric: "tabular-nums" }}>{r.afterScore ?? "—"}</span>
                                </div>
                                <span
                                  className="font-display italic"
                                  style={{ fontSize: "0.78rem", color: "#b45309", marginLeft: "auto" }}
                                >
                                  No score improvement observed
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </>
            )}

            {/* ══ Aggregate Movement Table ════════════════════════ */}
            {anyLongitudinal && (
              <section style={{ marginBottom: "4rem" }}>
                <SectionHead
                  num={filterVertical === "all" ? "02" : "05"}
                  title="Aggregate Movement"
                  subtitle="Verticals with two or more assessments, sorted by net delta"
                />

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #0c1425" }}>
                        {["Vertical", "First → Latest", "Delta", "Level", "Trend", "Assessments"].map((h, i) => (
                          <th
                            key={h}
                            style={{
                              padding: "0.5rem 0.75rem",
                              textAlign: i === 0 ? "left" : i === 5 ? "right" : "left",
                              fontSize: "0.6rem",
                              letterSpacing: "0.18em",
                              textTransform: "uppercase",
                              color: "rgba(12,20,37,0.45)",
                              fontFamily: "var(--font-body, system-ui)",
                              fontWeight: 700,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m, idx) => {
                        const isGain = m.delta > 0;
                        const isLoss = m.delta < 0;
                        const trendColor = isGain ? "#047857" : isLoss ? "#b91c1c" : "rgba(12,20,37,0.4)";
                        const trendLabel = isGain ? "improved" : isLoss ? "declined" : "no change";
                        const trendSymbol = isGain ? "↑" : isLoss ? "↓" : "—";
                        return (
                          <tr
                            key={m.vertical}
                            style={{
                              borderBottom: "1px solid #e8e5df",
                              background: idx % 2 === 0 ? "transparent" : "rgba(12,20,37,0.012)",
                            }}
                          >
                            <td style={{ padding: "0.7rem 0.75rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                <span
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "2px",
                                    background: verticalColor[m.vertical],
                                    flexShrink: 0,
                                  }}
                                />
                                <span style={{ fontWeight: 500, color: "#0c1425" }}>{m.vertical}</span>
                              </div>
                            </td>
                            <td style={{ padding: "0.7rem 0.75rem", color: "rgba(12,20,37,0.6)", fontVariantNumeric: "tabular-nums" }}>
                              {m.firstScore} → {m.latestScore}
                            </td>
                            <td
                              style={{
                                padding: "0.7rem 0.75rem",
                                fontWeight: 700,
                                color: trendColor,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {isGain ? "+" : ""}{m.delta}
                            </td>
                            <td style={{ padding: "0.7rem 0.75rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span
                                  style={{
                                    fontSize: "0.68rem",
                                    fontVariantNumeric: "tabular-nums",
                                    padding: "0.1rem 0.4rem",
                                    borderRadius: "2px",
                                    background: `${maturityColorMap[m.firstLevel]}18`,
                                    color: maturityColorMap[m.firstLevel],
                                    border: `1px solid ${maturityColorMap[m.firstLevel]}35`,
                                    fontFamily: "var(--font-body, system-ui)",
                                  }}
                                >
                                  L{m.firstLevel}
                                </span>
                                <span style={{ color: "rgba(12,20,37,0.2)" }}>→</span>
                                <span
                                  style={{
                                    fontSize: "0.68rem",
                                    fontVariantNumeric: "tabular-nums",
                                    padding: "0.1rem 0.4rem",
                                    borderRadius: "2px",
                                    background: `${maturityColorMap[m.latestLevel]}18`,
                                    color: maturityColorMap[m.latestLevel],
                                    border: `1px solid ${maturityColorMap[m.latestLevel]}35`,
                                    fontFamily: "var(--font-body, system-ui)",
                                  }}
                                >
                                  L{m.latestLevel}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "0.7rem 0.75rem" }}>
                              <span style={{ color: trendColor, fontSize: "0.9rem", marginRight: "0.3rem" }}>{trendSymbol}</span>
                              <span style={{ fontSize: "0.75rem", color: trendColor, textTransform: "capitalize", fontFamily: "var(--font-body, system-ui)" }}>{trendLabel}</span>
                            </td>
                            <td style={{ padding: "0.7rem 0.75rem", textAlign: "right", color: "rgba(12,20,37,0.45)", fontVariantNumeric: "tabular-nums" }}>
                              {m.count}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <FigCaption>
                  Table 2 — Net movement for verticals with ≥2 assessments. Delta = latest total score minus first total score.
                </FigCaption>
              </section>
            )}

          </div>
        )}

        {/* ── Colophon ─────────────────────────────────────────── */}
        <HairRule />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <p style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(12,20,37,0.3)", fontFamily: "var(--font-body, system-ui)" }}>
            Yi · NMT Maturity Progression Tracker
          </p>
          <p style={{ fontSize: "0.65rem", color: "rgba(12,20,37,0.3)", fontFamily: "var(--font-body, system-ui)" }}>
            {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}
