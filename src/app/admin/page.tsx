"use client";

import { useState, useEffect, useCallback } from "react";
import { verticals, regions } from "@/lib/yi-data";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Module-scoped fetch helpers ────────────────────────────────────────────

async function authenticate(password: string): Promise<{ valid: boolean; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      signal: controller.signal,
    });
    const data = await res.json();
    return { valid: Boolean(data.valid) };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { valid: false, error: "Login timed out. Please retry." };
    }
    return { valid: false, error: "Login failed. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

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
    if (!res.ok) return { error: `Failed to load: ${res.status} ${res.statusText}` };
    const data = await res.json();
    return { data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Request timed out. Please check your connection and retry." };
    }
    return { error: "Failed to load assessments. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

async function exportCSV(
  params: URLSearchParams,
  pw: string,
): Promise<{ blob?: Blob; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`/api/assessments/export?${params}`, {
      headers: { "x-admin-password": pw },
      signal: controller.signal,
    });
    if (!res.ok) return { error: `Export failed: ${res.status}` };
    const blob = await res.blob();
    return { blob };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Export timed out. Try filtering to fewer records." };
    }
    return { error: "Export failed. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Constants ───────────────────────────────────────────────────────────────

const maturityLabels: Record<number, string> = {
  1: "Fragile",
  2: "Emerging",
  3: "Growing",
  4: "Established",
  5: "Flagship",
};

// Accessible, editorial colour palette for radar comparison
const compareColors = ["#c4a35a", "#3b6ea5", "#4a7c59", "#b45309", "#7c3aed", "#be185d"];

// Maturity level — editorial text treatment (no colour backgrounds)
const maturityTextColor: Record<number, string> = {
  1: "text-red-700",
  2: "text-orange-700",
  3: "text-amber-700",
  4: "text-blue-700",
  5: "text-emerald-700",
};

const dimNames = ["Strategy", "Penetration", "Execution", "Regional", "Impact", "Brand", "Continuity"];

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Thin horizontal rule used as a section separator — editorial style */
function Rule({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-[#0c1425]/10 ${className}`} />;
}

/** Column header with optional sort indicator */
function ColHeader({
  label,
  align = "left",
  sortable,
  active,
  dir,
  onClick,
}: {
  label: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  active?: boolean;
  dir?: "asc" | "desc";
  onClick?: () => void;
}) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`px-4 py-3 text-[10px] tracking-[0.18em] uppercase font-semibold select-none ${alignClass} ${
        sortable ? "cursor-pointer" : ""
      } ${active ? "text-[#c4a35a]" : "text-[#0c1425]/35"} hover:${sortable ? "text-[#c4a35a]" : ""} transition-colors`}
      onClick={onClick}
    >
      {label}
      {sortable && active && (
        <span className="ml-1 opacity-80">{dir === "desc" ? "↓" : "↑"}</span>
      )}
    </th>
  );
}

/** Editorial stat block — serif numeral over small-caps label */
function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-5 px-6 border-r border-[#0c1425]/8 last:border-r-0">
      <span className="font-display text-[2.75rem] leading-none text-[#0c1425] tabular-nums">
        {value}
      </span>
      <span className="text-[10px] tracking-[0.22em] uppercase font-semibold text-[#0c1425]/35">
        {label}
      </span>
    </div>
  );
}

/** Nav pill link */
function NavLink({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  return (
    <a
      href={href}
      className={`inline-flex items-center h-8 px-3.5 text-[10px] tracking-[0.18em] uppercase font-semibold transition-colors rounded-sm ${
        active
          ? "text-[#c4a35a] border border-[#c4a35a]/40 bg-[#c4a35a]/[0.06]"
          : "text-white/50 border border-white/[0.08] hover:text-[#c4a35a] hover:border-[#c4a35a]/25"
      }`}
    >
      {label}
    </a>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({
  password,
  setPassword,
  onLogin,
  authError,
}: {
  password: string;
  setPassword: (v: string) => void;
  onLogin: () => void;
  authError: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#0c1425] flex items-center justify-center px-4">
      {/* Decorative rule */}
      <div className="max-w-sm w-full">
        {/* Masthead */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="block h-px w-12 bg-[#c4a35a]/30" />
            <span className="text-[10px] tracking-[0.35em] uppercase text-[#c4a35a]/50 font-semibold">
              NMT Diagnostic
            </span>
            <span className="block h-px w-12 bg-[#c4a35a]/30" />
          </div>
          <h1 className="font-display text-4xl text-white leading-tight">
            Admin Access
          </h1>
          <p className="mt-2 text-sm text-white/30 font-body">
            Restricted to authorised personnel
          </p>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLogin()}
            placeholder="Enter password"
            className="w-full px-4 py-3.5 rounded-sm bg-white/[0.05] border border-white/[0.10] text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/60 text-sm tracking-wider text-center"
            autoFocus
          />
          {authError && (
            <p className="text-center text-red-400 text-xs tracking-wide">
              Incorrect password
            </p>
          )}
          <button
            onClick={onLogin}
            className="w-full h-12 bg-[#c4a35a] hover:bg-[#dfc088] text-[#0c1425] text-[11px] tracking-[0.25em] uppercase font-bold rounded-sm transition-colors"
          >
            Enter Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [storedPassword, setStoredPassword] = useState("");

  // Data
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [filterVertical, setFilterVertical] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterMaturity, setFilterMaturity] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Compare
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);

  // Sort
  const [sortField, setSortField] = useState<"created_at" | "total_score" | "percentage">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (saved) {
      setStoredPassword(saved);
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = async () => {
    setAuthError(false);
    const result = await authenticate(password);
    if (result.error) alert(result.error);
    if (result.valid) {
      sessionStorage.setItem("nmt-admin-pw", password);
      setStoredPassword(password);
      setAuthenticated(true);
    } else {
      setAuthError(true);
    }
  };

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams();
    if (filterVertical !== "all") params.set("vertical", filterVertical);
    if (filterRegion !== "all") params.set("region", filterRegion);
    if (filterMaturity !== "all") params.set("maturity_level", filterMaturity);
    if (filterDateFrom) params.set("date_from", filterDateFrom);
    if (filterDateTo) params.set("date_to", filterDateTo);

    const result = await listAssessments(params, storedPassword);
    if (result.error) setFetchError(result.error);
    else if (result.data) setAssessments(result.data);
    setLoading(false);
  }, [storedPassword, filterVertical, filterRegion, filterMaturity, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (authenticated) fetchAssessments();
  }, [authenticated, fetchAssessments]);

  const handleExportCSV = async () => {
    const params = new URLSearchParams();
    if (filterVertical !== "all") params.set("vertical", filterVertical);
    if (filterRegion !== "all") params.set("region", filterRegion);
    if (filterMaturity !== "all") params.set("maturity_level", filterMaturity);

    const result = await exportCSV(params, storedPassword);
    if (result.error) {
      alert(result.error);
      return;
    }
    if (result.blob) {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nmt-diagnostics-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const toggleCompare = (id: string) => {
    const next = new Set(compareIds);
    if (next.has(id)) next.delete(id);
    else if (next.size < 6) next.add(id);
    setCompareIds(next);
  };

  const sorted = [...assessments].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (sortDir === "asc") return aVal < bVal ? -1 : 1;
    return aVal > bVal ? -1 : 1;
  });

  // Summary stats
  const totalCount = assessments.length;
  const avgMaturity = totalCount
    ? (assessments.reduce((s, a) => s + a.maturity_level, 0) / totalCount).toFixed(1)
    : "—";
  const avgScore = totalCount
    ? Math.round(assessments.reduce((s, a) => s + a.percentage, 0) / totalCount)
    : 0;
  const thisMonth = assessments.filter((a) => {
    const d = new Date(a.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Compare data
  const compareAssessments = assessments.filter((a) => compareIds.has(a.id));
  const radarCompareData = dimNames.map((name, i) => {
    const point: Record<string, string | number> = { dimension: name };
    compareAssessments.forEach((a) => {
      const label = `${a.vertical_name}${a.region ? ` (${a.region})` : ""}`;
      point[label] = a.dimension_scores?.[i]?.score || 0;
    });
    return point;
  });

  // ─── Login Gate ────────────────────────────────────────────────────────────

  if (!authenticated) {
    return (
      <LoginScreen
        password={password}
        setPassword={setPassword}
        onLogin={handleLogin}
        authError={authError}
      />
    );
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#fafaf8]" style={{ fontFamily: "var(--font-body, system-ui)" }}>

      {/* ── Masthead / header ─────────────────────────────────────────── */}
      <header className="bg-[#0c1425]">
        {/* Top rule */}
        <div className="border-b border-[#c4a35a]/20" />

        {/* Identity row */}
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] tracking-[0.38em] uppercase text-[#c4a35a]/50 font-semibold mb-1.5">
              Young Indians · NMT Diagnostic
            </p>
            <h1 className="font-display text-[1.85rem] leading-tight text-white tracking-tight">
              Assessment Dashboard
            </h1>
          </div>

          {/* Export + nav cluster */}
          <div className="flex items-center gap-2 flex-wrap justify-end pb-1">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center h-8 px-4 text-[10px] tracking-[0.18em] uppercase font-bold rounded-sm border border-[#c4a35a]/50 text-[#c4a35a] hover:bg-[#c4a35a]/10 transition-colors"
            >
              Export CSV
            </button>
            <NavLink href="/admin/live" label="Live View" />
            <NavLink href="/admin/commitments" label="Commitments" />
            <NavLink href="/admin/manage" label="Manage" />
            <NavLink href="/admin/facilitator" label="Facilitator" />
            <NavLink href="/admin/summary" label="Summary" />
            <NavLink href="/admin/tracker" label="Tracker" />
            <NavLink href="/" label="← Test" />
          </div>
        </div>

        {/* Bottom double rule */}
        <div className="border-b border-white/[0.06]" />
        <div className="border-b border-[#c4a35a]/20 mt-[1px]" />
      </header>

      {/* ── Stat band ─────────────────────────────────────────────────── */}
      <div className="border-b border-[#0c1425]/8 bg-white">
        <div className="max-w-7xl mx-auto px-2">
          {/* Mobile: 2-col grid; Desktop: single row flex */}
          <div className="grid grid-cols-2 sm:flex sm:flex-row divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-[#0c1425]/8">
            <StatBlock label="Total Assessments" value={totalCount.toString()} />
            <StatBlock label="Avg Maturity Level" value={avgMaturity.toString()} />
            <StatBlock label="Avg Score" value={`${avgScore}%`} />
            <StatBlock label="This Month" value={thisMonth.toString()} />
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Compare panel ──────────────────────────────────────────── */}
        {compareMode && compareAssessments.length >= 2 && (
          <div className="bg-white border border-[#0c1425]/8 rounded-sm">
            {/* Panel header */}
            <div className="flex items-baseline justify-between px-6 pt-5 pb-3 border-b border-[#0c1425]/8">
              <h2 className="font-display text-xl text-[#0c1425]">
                Comparing {compareAssessments.length} assessments
              </h2>
              <button
                onClick={() => { setCompareMode(false); setCompareIds(new Set()); }}
                className="text-[10px] tracking-[0.18em] uppercase font-semibold text-[#0c1425]/40 hover:text-[#0c1425] transition-colors"
              >
                Close ×
              </button>
            </div>
            <div className="p-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarCompareData}>
                  <PolarGrid stroke="#e8e5df" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "#6b6b6b", fontFamily: "inherit" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 25]} tick={{ fontSize: 9, fill: "#a8a8a8" }} tickCount={6} />
                  {compareAssessments.map((a, i) => {
                    const label = `${a.vertical_name}${a.region ? ` (${a.region})` : ""}`;
                    return (
                      <Radar
                        key={a.id}
                        name={label}
                        dataKey={label}
                        stroke={compareColors[i % compareColors.length]}
                        fill={compareColors[i % compareColors.length]}
                        fillOpacity={0.07}
                        strokeWidth={1.5}
                      />
                    );
                  })}
                  <Legend
                    wrapperStyle={{ fontSize: "11px", fontFamily: "inherit", paddingTop: "8px" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Filter bar ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Vertical filter */}
          <select
            value={filterVertical}
            onChange={(e) => setFilterVertical(e.target.value)}
            className="h-8 px-3 pr-7 rounded-sm border border-[#0c1425]/12 bg-white text-xs text-[#0c1425]/70 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%230c142540'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
          >
            <option value="all">All Verticals</option>
            {verticals.map((v) => (
              <option key={v.name} value={v.name}>{v.name}</option>
            ))}
          </select>

          {/* Region filter */}
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="h-8 px-3 pr-7 rounded-sm border border-[#0c1425]/12 bg-white text-xs text-[#0c1425]/70 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%230c142540'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
          >
            <option value="all">All Regions</option>
            <option value="National">National</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>{r.code}</option>
            ))}
          </select>

          {/* Maturity filter */}
          <select
            value={filterMaturity}
            onChange={(e) => setFilterMaturity(e.target.value)}
            className="h-8 px-3 pr-7 rounded-sm border border-[#0c1425]/12 bg-white text-xs text-[#0c1425]/70 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%230c142540'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
          >
            <option value="all">All Levels</option>
            {[1, 2, 3, 4, 5].map((l) => (
              <option key={l} value={l.toString()}>L{l} — {maturityLabels[l]}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="h-8 px-3 rounded-sm border border-[#0c1425]/12 bg-white text-xs text-[#0c1425]/70 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50"
            title="From date"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="h-8 px-3 rounded-sm border border-[#0c1425]/12 bg-white text-xs text-[#0c1425]/70 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50"
            title="To date"
          />

          <div className="flex-1" />

          {/* Result count */}
          <span className="text-[10px] tracking-[0.15em] uppercase text-[#0c1425]/30 font-semibold">
            {sorted.length} record{sorted.length !== 1 ? "s" : ""}
          </span>

          {/* Compare toggle */}
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`h-8 px-4 rounded-sm text-[10px] tracking-[0.18em] uppercase font-bold transition-colors ${
              compareMode
                ? "bg-[#c4a35a] text-[#0c1425]"
                : "border border-[#0c1425]/15 text-[#0c1425]/50 hover:border-[#0c1425]/30 hover:text-[#0c1425]/70"
            }`}
          >
            {compareMode ? `Compare (${compareIds.size})` : "Compare Mode"}
          </button>
        </div>

        {/* ── Assessments table ──────────────────────────────────────── */}
        <div className="bg-white border border-[#0c1425]/8 rounded-sm overflow-hidden">

          {/* Table heading bar */}
          <div className="border-b border-[#0c1425]/8 px-6 py-3.5 flex items-baseline justify-between">
            <h2 className="font-display text-lg text-[#0c1425]">
              Assessments
            </h2>
            {!loading && !fetchError && sorted.length > 0 && (
              <span className="text-[10px] tracking-[0.15em] uppercase text-[#0c1425]/30 font-semibold">
                Click row to open · Sort by column headers
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <span className="text-[10px] tracking-[0.22em] uppercase text-[#0c1425]/30 font-semibold">
                Loading records…
              </span>
            </div>
          ) : fetchError ? (
            <div className="py-12 px-6 text-center">
              <p className="text-sm text-red-700 mb-3">{fetchError}</p>
              <button
                onClick={fetchAssessments}
                className="text-[10px] tracking-[0.18em] uppercase font-semibold text-[#c4a35a] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-[10px] tracking-[0.22em] uppercase text-[#0c1425]/30 font-semibold">
                No assessments match the current filters
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#0c1425]/8">
                    {compareMode && <th className="w-10 px-4 py-3" />}
                    <ColHeader label="Vertical" />
                    <ColHeader label="Region" />
                    <ColHeader label="Respondent" />
                    <ColHeader
                      label="Score"
                      align="right"
                      sortable
                      active={sortField === "total_score"}
                      dir={sortDir}
                      onClick={() => {
                        if (sortField === "total_score") setSortDir(sortDir === "asc" ? "desc" : "asc");
                        else { setSortField("total_score"); setSortDir("desc"); }
                      }}
                    />
                    <ColHeader
                      label="%"
                      align="right"
                      sortable
                      active={sortField === "percentage"}
                      dir={sortDir}
                      onClick={() => {
                        if (sortField === "percentage") setSortDir(sortDir === "asc" ? "desc" : "asc");
                        else { setSortField("percentage"); setSortDir("desc"); }
                      }}
                    />
                    <ColHeader label="Level" align="center" />
                    <ColHeader
                      label="Date"
                      align="right"
                      sortable
                      active={sortField === "created_at"}
                      dir={sortDir}
                      onClick={() => {
                        if (sortField === "created_at") setSortDir(sortDir === "asc" ? "desc" : "asc");
                        else { setSortField("created_at"); setSortDir("desc"); }
                      }}
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0c1425]/[0.05]">
                  {sorted.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`cursor-pointer transition-colors hover:bg-[#c4a35a]/[0.035] group ${
                        compareIds.has(row.id) ? "bg-[#c4a35a]/[0.05]" : idx % 2 === 0 ? "bg-white" : "bg-[#fafaf8]"
                      }`}
                      onClick={() => {
                        if (compareMode) {
                          toggleCompare(row.id);
                        } else {
                          window.open(`/results/${row.id}`, "_blank");
                        }
                      }}
                    >
                      {compareMode && (
                        <td className="px-4 py-3.5 w-10">
                          <input
                            type="checkbox"
                            checked={compareIds.has(row.id)}
                            onChange={() => toggleCompare(row.id)}
                            className="w-4 h-4 rounded-sm accent-[#c4a35a]"
                          />
                        </td>
                      )}
                      {/* Vertical — primary identifier */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-[#0c1425] group-hover:text-[#c4a35a] transition-colors">
                          {row.vertical_name}
                        </span>
                      </td>
                      {/* Region */}
                      <td className="px-4 py-3.5 text-[#0c1425]/45 text-xs">
                        {row.region || <span className="text-[#0c1425]/20">—</span>}
                      </td>
                      {/* Respondent */}
                      <td className="px-4 py-3.5 text-[#0c1425]/45 text-xs italic">
                        {row.respondent_name || <span className="not-italic text-[#0c1425]/20">—</span>}
                      </td>
                      {/* Score */}
                      <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-[#0c1425]">
                        {row.total_score}
                        <span className="text-[#0c1425]/20 font-normal">/175</span>
                      </td>
                      {/* Percentage */}
                      <td className="px-4 py-3.5 text-right tabular-nums text-[#0c1425]/55">
                        {row.percentage}%
                      </td>
                      {/* Maturity level */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block text-[10px] tracking-[0.12em] uppercase font-bold ${maturityTextColor[row.maturity_level] ?? "text-[#0c1425]/50"}`}>
                          L{row.maturity_level}
                          <span className="hidden sm:inline font-normal opacity-70 ml-1">
                            {maturityLabels[row.maturity_level]}
                          </span>
                        </span>
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3.5 text-right text-[#0c1425]/35 text-xs tabular-nums">
                        {new Date(row.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Mobile card view (< 640 px) ────────────────────────────── */}
        {/* This block is shown only on mobile to replace the scrolling table */}
        <div className="sm:hidden space-y-3 -mt-2">
          {!loading && !fetchError && sorted.map((row) => (
            <div
              key={`m-${row.id}`}
              className={`bg-white border border-[#0c1425]/8 rounded-sm px-4 py-3.5 cursor-pointer transition-colors hover:border-[#c4a35a]/40 ${
                compareIds.has(row.id) ? "border-[#c4a35a]/40 bg-[#c4a35a]/[0.03]" : ""
              }`}
              onClick={() => {
                if (compareMode) toggleCompare(row.id);
                else window.open(`/results/${row.id}`, "_blank");
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-[#0c1425] text-sm">{row.vertical_name}</p>
                  <p className="text-[10px] text-[#0c1425]/40 mt-0.5 italic">{row.respondent_name || "—"}</p>
                </div>
                <span className={`text-[10px] tracking-[0.12em] uppercase font-bold mt-0.5 ${maturityTextColor[row.maturity_level] ?? ""}`}>
                  L{row.maturity_level}
                </span>
              </div>
              <Rule />
              <div className="flex items-center gap-4 pt-2 text-xs text-[#0c1425]/50">
                <span className="tabular-nums font-semibold text-[#0c1425]">{row.total_score}/175</span>
                <span className="tabular-nums">{row.percentage}%</span>
                <span className="flex-1 text-right text-[#0c1425]/35 text-[10px]">
                  {new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
