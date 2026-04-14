"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
 * Module-scoped fetch helpers
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
  1: "#b91c1c",
  2: "#c2410c",
  3: "#a16207",
  4: "#1d4ed8",
  5: "#047857",
};

const healthColorMap: Record<string, string> = {
  Strong: "#047857",
  Stable: "#1d4ed8",
  Weak: "#b45309",
  Critical: "#b91c1c",
};

const maturityDescriptions: Record<number, string> = {
  1: "Fragile",
  2: "Emerging",
  3: "Growing",
  4: "Established",
  5: "Flagship",
};

function scoreToHealth(score: number): "Strong" | "Stable" | "Weak" | "Critical" {
  if (score >= 21) return "Strong";
  if (score >= 17) return "Stable";
  if (score >= 13) return "Weak";
  return "Critical";
}

/* ============================================================
 * Sub-components
 * ============================================================ */

/** Section header with oversized number, gold rule, and italic subtitle */
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
    <div className="mb-8">
      <div className="flex items-start gap-5">
        <span
          className="font-display leading-none select-none"
          style={{
            fontSize: "4.5rem",
            color: "#c4a35a",
            opacity: 0.18,
            lineHeight: 1,
            marginTop: "-0.2rem",
          }}
        >
          {num}
        </span>
        <div className="pt-1 flex-1">
          <h2
            className="font-display text-navy"
            style={{ fontSize: "1.5rem", letterSpacing: "-0.01em" }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="font-display italic mt-0.5"
              style={{ fontSize: "0.8rem", color: "#6b5b35", letterSpacing: "0.02em" }}
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
          marginTop: "0.75rem",
        }}
      />
    </div>
  );
}

/** Pull-quote / callout box — the editorial highlight unit */
function PullQuote({
  children,
  accent = "gold",
}: {
  children: React.ReactNode;
  accent?: "gold" | "red" | "green" | "amber";
}) {
  const borderColors = {
    gold: "#c4a35a",
    red: "#b91c1c",
    green: "#047857",
    amber: "#d97706",
  };
  const bgColors = {
    gold: "rgba(196,163,90,0.06)",
    red: "rgba(185,28,28,0.04)",
    green: "rgba(4,120,87,0.04)",
    amber: "rgba(217,119,6,0.05)",
  };
  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColors[accent]}`,
        background: bgColors[accent],
        padding: "1rem 1.25rem",
        borderRadius: "0 4px 4px 0",
      }}
    >
      <div
        className="font-display italic"
        style={{ fontSize: "0.9rem", color: "#0c1425", lineHeight: 1.65 }}
      >
        {children}
      </div>
    </div>
  );
}

/** Figure caption — always below a chart */
function FigCaption({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-display italic"
      style={{
        fontSize: "0.7rem",
        color: "#8a7a5a",
        marginTop: "0.6rem",
        letterSpacing: "0.03em",
      }}
    >
      {children}
    </p>
  );
}

/** Thin horizontal rule used between sub-sections */
function HairRule() {
  return (
    <div
      style={{
        height: "1px",
        background: "#e8e5df",
        margin: "0",
      }}
    />
  );
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

  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterMeeting, setFilterMeeting] = useState("");

  const [downloading, setDownloading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");

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

  // ---- Derive summary data ----
  const summary = useMemo<SummaryData>(() => {
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

    const dimensionAgg = new Map<
      string,
      { scores: number[]; strong: number; stable: number; weak: number; critical: number }
    >();

    for (const a of latest) {
      for (const d of a.dimension_scores ?? []) {
        const key = d.name || d.shortName || "Unknown";
        if (!dimensionAgg.has(key)) {
          dimensionAgg.set(key, { scores: [], strong: 0, stable: 0, weak: 0, critical: 0 });
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

    const dimensionHealth = Array.from(dimensionAgg.entries()).map(([dimension, v]) => {
      const avg =
        v.scores.length > 0
          ? Math.round((v.scores.reduce((s, n) => s + n, 0) / v.scores.length) * 10) / 10
          : 0;
      return { dimension, strong: v.strong, stable: v.stable, weak: v.weak, critical: v.critical, average: avg };
    });

    const systemicWeaknesses: string[] = dimensionHealth
      .filter((d) => {
        const total = d.strong + d.stable + d.weak + d.critical;
        if (total === 0) return false;
        return (d.weak + d.critical) / total >= 0.5;
      })
      .map((d) => d.dimension);

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

    const totalCommitments = commitments.length;

    const commitmentsByDimensionMap = new Map<string, number>();
    for (const c of commitments) {
      const key = c.focus_dimension || "Unspecified";
      commitmentsByDimensionMap.set(key, (commitmentsByDimensionMap.get(key) ?? 0) + 1);
    }
    const commitmentsByDimension = Array.from(commitmentsByDimensionMap.entries())
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
    const reported = new Set(assessments.map((a) => a.vertical_name));
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
      setTimeout(() => setCopyLabel("Copy"), 2000);
    } catch {
      alert("Clipboard copy failed.");
    }
  };

  const handleEmailSummary = () => {
    const subject = "NMT Vertical Diagnostic — Summary Report";
    const intro = ["Hi,", "", "Please find the latest NMT Vertical Diagnostic summary below.", "", "— — —", ""].join("\n");
    const outro = ["", "", "— Sent from the NMT diagnostic tracker"].join("\n");
    const body = intro + buildSummaryText() + outro;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <p style={{ color: "rgba(12,20,37,0.35)", fontSize: "0.8rem", letterSpacing: "0.1em" }}>
          Redirecting…
        </p>
      </div>
    );
  }

  const todayDisplay = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const distributionTotal = summary.maturityDistribution.reduce((s, m) => s + m.count, 0);

  return (
    <div className="min-h-screen" style={{ background: "#fafaf8" }}>

      {/* ── Masthead nav strip ─────────────────────────────────── */}
      <nav
        style={{
          background: "#0c1425",
          borderBottom: "1px solid rgba(196,163,90,0.15)",
        }}
      >
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
            <span
              style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              Summary Report
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap" }}>
            {[
              { href: "/admin", label: "Dashboard" },
              { href: "/admin/live", label: "Live" },
              { href: "/admin/commitments", label: "Commitments" },
              { href: "/admin/manage", label: "Manage" },
              { href: "/admin/facilitator", label: "Facilitator" },
              { href: "/admin/tracker", label: "Tracker" },
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
              Summary
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
          {/* Overline */}
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
            Young Indians · National Management Team · Vertical Health Diagnostic
          </p>

          {/* Title */}
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
            NMT Summary Report
          </h1>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "0.82rem",
                color: "rgba(12,20,37,0.55)",
                fontFamily: "var(--font-body, system-ui)",
              }}
            >
              As of {todayDisplay}
            </span>
            <span style={{ width: "1px", height: "1rem", background: "rgba(12,20,37,0.15)" }} />
            <span
              style={{
                fontSize: "0.82rem",
                color: "#0c1425",
                fontFamily: "var(--font-body, system-ui)",
                fontWeight: 500,
              }}
            >
              {loading ? "—" : summary.verticalsReported} verticals reported
            </span>
            {summary.filters.meeting && (
              <>
                <span style={{ width: "1px", height: "1rem", background: "rgba(12,20,37,0.15)" }} />
                <span style={{ fontSize: "0.82rem", color: "rgba(12,20,37,0.55)" }}>
                  {summary.filters.meeting}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Action row + filters ─────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "1.5rem",
            flexWrap: "wrap",
            padding: "1.25rem 0",
            marginBottom: "0.5rem",
          }}
        >
          {/* Filters */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
            {[
              { label: "From", type: "date", value: filterDateFrom, setter: setFilterDateFrom },
              { label: "To", type: "date", value: filterDateTo, setter: setFilterDateTo },
            ].map((f) => (
              <div key={f.label}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.6rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "rgba(12,20,37,0.4)",
                    marginBottom: "0.3rem",
                    fontFamily: "var(--font-body, system-ui)",
                    fontWeight: 600,
                  }}
                >
                  {f.label}
                </label>
                <input
                  type={f.type}
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
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.6rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "rgba(12,20,37,0.4)",
                  marginBottom: "0.3rem",
                  fontFamily: "var(--font-body, system-ui)",
                  fontWeight: 600,
                }}
              >
                Meeting
              </label>
              <input
                type="text"
                value={filterMeeting}
                onChange={(e) => setFilterMeeting(e.target.value)}
                placeholder="e.g. NMT April 2026"
                style={{
                  height: "2.1rem",
                  padding: "0 0.75rem",
                  border: "1px solid rgba(12,20,37,0.12)",
                  borderRadius: "4px",
                  background: "#fff",
                  fontSize: "0.82rem",
                  color: "rgba(12,20,37,0.7)",
                  width: "13rem",
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={fetchData}
              style={{
                height: "2.1rem",
                padding: "0 1rem",
                border: "1px solid rgba(12,20,37,0.15)",
                borderRadius: "4px",
                background: "transparent",
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(12,20,37,0.6)",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={handleCopySummary}
              style={{
                height: "2.1rem",
                padding: "0 1rem",
                border: "1px solid rgba(12,20,37,0.15)",
                borderRadius: "4px",
                background: "transparent",
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(12,20,37,0.6)",
                cursor: "pointer",
              }}
            >
              {copyLabel}
            </button>
            <button
              onClick={handleEmailSummary}
              disabled={loading || summary.verticalsReported === 0}
              style={{
                height: "2.1rem",
                padding: "0 1rem",
                border: "1px solid rgba(12,20,37,0.1)",
                borderRadius: "4px",
                background: "transparent",
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(12,20,37,0.5)",
                cursor: "pointer",
                opacity: loading || summary.verticalsReported === 0 ? 0.4 : 1,
              }}
            >
              Email to Leadership
            </button>
            <Button
              onClick={handleDownloadPDF}
              disabled={downloading || loading || summary.verticalsReported === 0}
              style={{
                height: "2.1rem",
                padding: "0 1.25rem",
                background: "#0c1425",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#fff",
                cursor: "pointer",
                opacity: downloading || loading || summary.verticalsReported === 0 ? 0.5 : 1,
              }}
            >
              {downloading ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
        </div>

        <HairRule />

        {/* ── Error ────────────────────────────────────────────── */}
        {loadError && (
          <div
            style={{
              margin: "1.5rem 0",
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
            <p style={{ fontSize: "0.82rem", color: "#b91c1c" }}>{loadError}</p>
            <button
              onClick={fetchData}
              style={{
                fontSize: "0.7rem",
                textDecoration: "underline",
                color: "#b91c1c",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────── */}
        {loading && (
          <div style={{ padding: "5rem", textAlign: "center", color: "rgba(12,20,37,0.3)", fontSize: "0.82rem" }}>
            Loading report data…
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────── */}
        {!loading && summary.verticalsReported === 0 && (
          <div style={{ padding: "5rem 0", textAlign: "center" }}>
            <p
              className="font-display"
              style={{ fontSize: "1.5rem", color: "rgba(12,20,37,0.6)", marginBottom: "0.5rem" }}
            >
              No assessments reported yet
            </p>
            <p style={{ fontSize: "0.82rem", color: "rgba(12,20,37,0.4)" }}>
              This report populates as verticals complete their diagnostic.
            </p>
          </div>
        )}

        {/* ── Body content ─────────────────────────────────────── */}
        {!loading && summary.verticalsReported > 0 && (
          <div style={{ paddingTop: "3.5rem" }}>

            {/* ══ § 1  Maturity Distribution ═══════════════════════ */}
            <section style={{ marginBottom: "4rem" }}>
              <SectionHead
                num="01"
                title="Overall Maturity Distribution"
                subtitle="Most-recent assessment per vertical · L1 Fragile through L5 Flagship"
              />

              {/* Five maturity cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "1px",
                  background: "#e8e5df",
                  border: "1px solid #e8e5df",
                  borderRadius: "6px",
                  overflow: "hidden",
                  marginBottom: "1.25rem",
                }}
              >
                {summary.maturityDistribution.map((m) => {
                  const color = maturityColorMap[m.level];
                  const desc = maturityDescriptions[m.level] ?? m.name;
                  return (
                    <div
                      key={m.level}
                      style={{
                        background: "#fff",
                        padding: "1.5rem 1.25rem 1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.6rem",
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color,
                            fontFamily: "var(--font-body, system-ui)",
                            fontWeight: 600,
                          }}
                        >
                          L{m.level}
                        </span>
                      </div>
                      <span
                        className="font-display"
                        style={{ fontSize: "3rem", color, lineHeight: 1, fontWeight: 400 }}
                      >
                        {m.count}
                      </span>
                      <span
                        className="font-display italic"
                        style={{ fontSize: "0.78rem", color: "rgba(12,20,37,0.5)" }}
                      >
                        {desc}
                      </span>
                      {m.verticals.length > 0 && (
                        <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          {m.verticals.map((v) => (
                            <span
                              key={v}
                              style={{
                                fontSize: "0.68rem",
                                color: "rgba(12,20,37,0.45)",
                                fontFamily: "var(--font-body, system-ui)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stacked bar */}
              {distributionTotal > 0 && (
                <>
                  <div
                    style={{
                      height: "10px",
                      display: "flex",
                      borderRadius: "3px",
                      overflow: "hidden",
                      border: "1px solid rgba(12,20,37,0.08)",
                    }}
                  >
                    {summary.maturityDistribution.map((m) => {
                      const pct = (m.count / distributionTotal) * 100;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={m.level}
                          title={`L${m.level} ${m.name} — ${m.count} (${Math.round(pct)}%)`}
                          style={{
                            width: `${pct}%`,
                            background: maturityColorMap[m.level],
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                    {summary.maturityDistribution.map((m) => (
                      <span
                        key={m.level}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          fontSize: "0.65rem",
                          letterSpacing: "0.08em",
                          color: "rgba(12,20,37,0.45)",
                          fontFamily: "var(--font-body, system-ui)",
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "2px",
                            background: maturityColorMap[m.level],
                            flexShrink: 0,
                          }}
                        />
                        L{m.level} {maturityDescriptions[m.level] ?? m.name}
                      </span>
                    ))}
                  </div>
                  <FigCaption>
                    Fig. 1 — Distribution of verticals across maturity levels. Width is proportional to count.
                  </FigCaption>
                </>
              )}
            </section>

            {/* ══ § 2  Dimension Health ════════════════════════════ */}
            <section style={{ marginBottom: "4rem" }}>
              <SectionHead
                num="02"
                title="Dimension Health Across Verticals"
                subtitle="Systemic weakness flagged where ≥50% of reporting verticals score Weak or Critical"
              />

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.82rem",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "2px solid #0c1425" }}>
                      {["Dimension", "Strong", "Stable", "Weak", "Critical", "Avg / 25"].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: "0.5rem 0.75rem",
                            textAlign: i === 0 ? "left" : i === 5 ? "right" : "center",
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
                    {summary.dimensionHealth.map((d, idx) => {
                      const total = d.strong + d.stable + d.weak + d.critical;
                      const isSystemic = total > 0 && (d.weak + d.critical) / total >= 0.5;
                      return (
                        <tr
                          key={d.dimension}
                          style={{
                            borderBottom: "1px solid #e8e5df",
                            background: isSystemic
                              ? "rgba(185,28,28,0.03)"
                              : idx % 2 === 0
                              ? "transparent"
                              : "rgba(12,20,37,0.012)",
                          }}
                        >
                          <td
                            style={{
                              padding: "0.7rem 0.75rem",
                              color: "#0c1425",
                              fontWeight: 500,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              {d.dimension}
                              {isSystemic && (
                                <span
                                  style={{
                                    fontSize: "0.58rem",
                                    letterSpacing: "0.15em",
                                    textTransform: "uppercase",
                                    color: "#b91c1c",
                                    fontWeight: 700,
                                    fontFamily: "var(--font-body, system-ui)",
                                    background: "rgba(185,28,28,0.08)",
                                    padding: "0.1rem 0.4rem",
                                    borderRadius: "2px",
                                  }}
                                >
                                  Systemic
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "0.7rem 0.75rem", textAlign: "center", color: "#047857", fontVariantNumeric: "tabular-nums" }}>{d.strong}</td>
                          <td style={{ padding: "0.7rem 0.75rem", textAlign: "center", color: "#1d4ed8", fontVariantNumeric: "tabular-nums" }}>{d.stable}</td>
                          <td style={{ padding: "0.7rem 0.75rem", textAlign: "center", color: "#b45309", fontVariantNumeric: "tabular-nums" }}>{d.weak}</td>
                          <td style={{ padding: "0.7rem 0.75rem", textAlign: "center", color: "#b91c1c", fontVariantNumeric: "tabular-nums" }}>{d.critical}</td>
                          <td
                            style={{
                              padding: "0.7rem 0.75rem",
                              textAlign: "right",
                              fontWeight: 600,
                              color: healthColorMap[scoreToHealth(d.average)] || "#0c1425",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {d.average.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: "1.25rem" }}>
                {summary.systemicWeaknesses.length > 0 ? (
                  <PullQuote accent="red">
                    <span style={{ fontStyle: "normal", fontWeight: 700, color: "#b91c1c" }}>
                      {summary.systemicWeaknesses.length} dimension{summary.systemicWeaknesses.length !== 1 ? "s are" : " is"} systemically weak
                    </span>{" "}
                    across reporting verticals:{" "}
                    <span style={{ fontWeight: 600, fontStyle: "normal" }}>
                      {summary.systemicWeaknesses.join(", ")}
                    </span>
                    . When a majority of verticals score Weak or Critical on the same dimension,
                    this signals a national infrastructure gap — not a per-vertical problem.
                  </PullQuote>
                ) : (
                  <PullQuote accent="green">
                    No dimension is systemically weak across reporting verticals.
                    Dimension gaps appear to be vertical-specific and can be addressed individually.
                  </PullQuote>
                )}
              </div>

              <FigCaption>
                Table 1 — Dimension health breakdown. Strong ≥21 · Stable ≥17 · Weak ≥13 · Critical &lt;13 (scores out of 25).
              </FigCaption>
            </section>

            {/* ══ § 3  Average Scores by Dimension ════════════════ */}
            <section style={{ marginBottom: "4rem" }}>
              <SectionHead
                num="03"
                title="Average Scores by Dimension"
                subtitle="Sorted weakest first — colour denotes health classification"
              />

              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e8e5df",
                  borderRadius: "6px",
                  padding: "1.5rem",
                }}
              >
                <div style={{ height: `${Math.max(summary.dimensionHealth.length * 44, 260)}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...summary.dimensionHealth].sort((a, b) => a.average - b.average)}
                      layout="vertical"
                      margin={{ top: 10, right: 40, left: 16, bottom: 10 }}
                    >
                      <CartesianGrid stroke="#f0ede8" strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        domain={[0, 25]}
                        tick={{ fontSize: 10, fill: "#8a8a8a", fontFamily: "var(--font-body, system-ui)" }}
                        axisLine={{ stroke: "#e8e5df" }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="dimension"
                        width={175}
                        tick={{ fontSize: 11, fill: "#0c1425", fontFamily: "var(--font-body, system-ui)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(196,163,90,0.07)" }}
                        contentStyle={{
                          background: "#fafaf8",
                          border: "1px solid #e8e5df",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontFamily: "var(--font-body, system-ui)",
                        }}
                        formatter={(value) => [
                          typeof value === "number" ? `${value.toFixed(1)} / 25` : String(value ?? ""),
                          "Average",
                        ]}
                      />
                      <Bar dataKey="average" radius={[0, 3, 3, 0]}>
                        {[...summary.dimensionHealth]
                          .sort((a, b) => a.average - b.average)
                          .map((entry, idx) => (
                            <Cell
                              key={idx}
                              fill={healthColorMap[scoreToHealth(entry.average)] || "#c4a35a"}
                            />
                          ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <FigCaption>
                Fig. 2 — Mean dimension scores across all reporting verticals. Red = Critical, amber = Weak, blue = Stable, green = Strong.
              </FigCaption>
            </section>

            {/* ══ § 4  Verticals at a Glance ══════════════════════ */}
            <section style={{ marginBottom: "4rem" }}>
              <SectionHead
                num="04"
                title="Verticals at a Glance"
                subtitle="Shown for orientation only — every vertical's journey is unique and context-dependent"
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#e8e5df", border: "1px solid #e8e5df", borderRadius: "6px", overflow: "hidden" }}>
                {/* Top 3 */}
                <div style={{ background: "#fff", padding: "1.5rem" }}>
                  <p
                    style={{
                      fontSize: "0.6rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "#047857",
                      fontFamily: "var(--font-body, system-ui)",
                      fontWeight: 700,
                      marginBottom: "1rem",
                    }}
                  >
                    Top 3 — Highest total score
                  </p>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {summary.topVerticals.map((v, i) => (
                      <li
                        key={v.name}
                        style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", borderBottom: "1px solid #f0ede8", paddingBottom: "0.75rem" }}
                      >
                        <span style={{ fontSize: "0.7rem", color: "rgba(12,20,37,0.3)", width: "1rem", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                          {i + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: "0.9rem", color: "#0c1425", fontWeight: 500 }}>
                          {v.name}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "rgba(12,20,37,0.55)", fontVariantNumeric: "tabular-nums" }}>
                          {v.total}
                          <span style={{ color: "rgba(12,20,37,0.2)" }}>/175</span>
                        </span>
                        <span
                          className="font-display italic"
                          style={{ fontSize: "0.75rem", color: maturityColorMap[v.level], whiteSpace: "nowrap" }}
                        >
                          L{v.level}
                        </span>
                      </li>
                    ))}
                    {summary.topVerticals.length === 0 && (
                      <li style={{ fontSize: "0.82rem", color: "rgba(12,20,37,0.35)", fontStyle: "italic" }}>No data yet</li>
                    )}
                  </ol>
                </div>

                {/* Bottom 3 */}
                <div style={{ background: "#fff", padding: "1.5rem" }}>
                  <p
                    style={{
                      fontSize: "0.6rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "#b91c1c",
                      fontFamily: "var(--font-body, system-ui)",
                      fontWeight: 700,
                      marginBottom: "1rem",
                    }}
                  >
                    Bottom 3 — Most room to grow
                  </p>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {summary.bottomVerticals.map((v, i) => (
                      <li
                        key={v.name}
                        style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", borderBottom: "1px solid #f0ede8", paddingBottom: "0.75rem" }}
                      >
                        <span style={{ fontSize: "0.7rem", color: "rgba(12,20,37,0.3)", width: "1rem", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                          {i + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: "0.9rem", color: "#0c1425", fontWeight: 500 }}>
                          {v.name}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "rgba(12,20,37,0.55)", fontVariantNumeric: "tabular-nums" }}>
                          {v.total}
                          <span style={{ color: "rgba(12,20,37,0.2)" }}>/175</span>
                        </span>
                        <span
                          className="font-display italic"
                          style={{ fontSize: "0.75rem", color: maturityColorMap[v.level], whiteSpace: "nowrap" }}
                        >
                          L{v.level}
                        </span>
                      </li>
                    ))}
                    {summary.bottomVerticals.length === 0 && (
                      <li style={{ fontSize: "0.82rem", color: "rgba(12,20,37,0.35)", fontStyle: "italic" }}>No data yet</li>
                    )}
                  </ol>
                </div>
              </div>
            </section>

            {/* ══ § 5  Aggregate Action Commitments ═══════════════ */}
            <section style={{ marginBottom: "4rem" }}>
              <SectionHead
                num="05"
                title="Aggregate Action Commitments"
                subtitle="Commitments captured across all participating verticals"
              />

              {/* KPI row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "#e8e5df", border: "1px solid #e8e5df", borderRadius: "6px", overflow: "hidden", marginBottom: "1.5rem" }}>
                {[
                  { label: "Total commitments", value: summary.totalCommitments },
                  { label: "Total action items", value: totalActionItemsCommitted },
                  { label: "Dimensions targeted", value: summary.commitmentsByDimension.length },
                  { label: "Target meetings", value: summary.targetMeetings.length },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#fff", padding: "1.25rem 1.5rem" }}>
                    <p
                      style={{
                        fontSize: "0.6rem",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "rgba(12,20,37,0.35)",
                        fontFamily: "var(--font-body, system-ui)",
                        fontWeight: 600,
                        marginBottom: "0.4rem",
                      }}
                    >
                      {label}
                    </p>
                    <span className="font-display" style={{ fontSize: "2.5rem", color: "#0c1425", lineHeight: 1 }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* By-dimension chart */}
              {summary.commitmentsByDimension.length > 0 && (
                <>
                  <div style={{ background: "#fff", border: "1px solid #e8e5df", borderRadius: "6px", padding: "1.5rem", marginBottom: "1.5rem" }}>
                    <p
                      style={{
                        fontSize: "0.6rem",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "rgba(12,20,37,0.4)",
                        fontFamily: "var(--font-body, system-ui)",
                        fontWeight: 700,
                        marginBottom: "1rem",
                      }}
                    >
                      Commitments by focus dimension
                    </p>
                    <div style={{ height: `${Math.max(summary.commitmentsByDimension.length * 38, 200)}px` }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={summary.commitmentsByDimension}
                          layout="vertical"
                          margin={{ top: 8, right: 32, left: 16, bottom: 8 }}
                        >
                          <CartesianGrid stroke="#f0ede8" strokeDasharray="3 3" />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: 10, fill: "#8a8a8a", fontFamily: "var(--font-body, system-ui)" }}
                            axisLine={{ stroke: "#e8e5df" }}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="dimension"
                            width={175}
                            tick={{ fontSize: 11, fill: "#0c1425", fontFamily: "var(--font-body, system-ui)" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(196,163,90,0.07)" }}
                            contentStyle={{
                              background: "#fafaf8",
                              border: "1px solid #e8e5df",
                              borderRadius: "4px",
                              fontSize: "0.78rem",
                            }}
                          />
                          <Bar dataKey="count" fill="#c4a35a" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <FigCaption>
                      Fig. 3 — Number of commitments by focus dimension. Verticals self-selected their priority area.
                    </FigCaption>
                  </div>
                </>
              )}

              {/* Target meetings */}
              {summary.targetMeetings.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #e8e5df", borderRadius: "6px", padding: "1.5rem" }}>
                  <p
                    style={{
                      fontSize: "0.6rem",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(12,20,37,0.4)",
                      fontFamily: "var(--font-body, system-ui)",
                      fontWeight: 700,
                      marginBottom: "0.75rem",
                    }}
                  >
                    Target review meetings
                  </p>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {summary.targetMeetings.map((m, i) => (
                      <div
                        key={m.meeting}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.6rem 0",
                          borderBottom: i < summary.targetMeetings.length - 1 ? "1px solid #f0ede8" : "none",
                        }}
                      >
                        <span style={{ fontSize: "0.85rem", color: "#0c1425" }}>{m.meeting}</span>
                        <span style={{ fontSize: "0.78rem", color: "rgba(12,20,37,0.45)", fontVariantNumeric: "tabular-nums" }}>
                          {m.count} commitment{m.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ══ § 6  Patterns & Recommendations ════════════════ */}
            <section style={{ marginBottom: "4rem" }}>
              <SectionHead
                num="06"
                title="Patterns & Recommendations"
                subtitle="Auto-generated from this session's data"
              />

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {summary.systemicWeaknesses.length > 0 ? (
                  <PullQuote accent="red">
                    <span style={{ fontStyle: "normal", fontWeight: 700, color: "#0c1425" }}>National infrastructure gap. </span>
                    {summary.systemicWeaknesses.length} dimension{summary.systemicWeaknesses.length !== 1 ? "s" : ""} —{" "}
                    <span style={{ fontStyle: "normal", fontWeight: 600 }}>{summary.systemicWeaknesses.join(", ")}</span>
                    {" "}— show weak or critical health across a majority of reporting verticals.
                    When 10+ verticals score weak on the same dimension, that is a national infrastructure
                    problem, not a vertical problem. Address it centrally rather than vertical-by-vertical.
                  </PullQuote>
                ) : (
                  <PullQuote accent="green">
                    <span style={{ fontStyle: "normal", fontWeight: 700, color: "#0c1425" }}>No single dimension is systemically weak </span>
                    across reporting verticals. Dimension gaps are vertical-specific and can be addressed per vertical.
                  </PullQuote>
                )}

                {mostSelectedFocusDimensions.length > 0 && (
                  <PullQuote accent="gold">
                    <span style={{ fontStyle: "normal", fontWeight: 700, color: "#0c1425" }}>Most-selected focus dimensions: </span>
                    {mostSelectedFocusDimensions.map((d) => `${d.dimension} (${d.count})`).join(", ")}.
                    Verticals have self-identified where they want support —
                    consider a national-level session or resource package for the top pick.
                  </PullQuote>
                )}

                {verticalsWithoutCommitments.length > 0 ? (
                  <PullQuote accent="amber">
                    <span style={{ fontStyle: "normal", fontWeight: 700, color: "#0c1425" }}>Follow-up needed. </span>
                    {verticalsWithoutCommitments.length} vertical{verticalsWithoutCommitments.length !== 1 ? "s have" : " has"} submitted
                    a diagnostic but no action commitment yet:{" "}
                    <span style={{ fontStyle: "normal", fontWeight: 600 }}>{verticalsWithoutCommitments.join(", ")}</span>.
                  </PullQuote>
                ) : summary.verticalsReported > 0 ? (
                  <PullQuote accent="green">
                    <span style={{ fontStyle: "normal", fontWeight: 700, color: "#0c1425" }}>Every reporting vertical has captured commitments. </span>
                    Strong closure from this session.
                  </PullQuote>
                ) : null}
              </div>
            </section>

            {/* ── Report colophon ──────────────────────────────── */}
            <div
              style={{
                borderTop: "1px solid rgba(12,20,37,0.1)",
                paddingTop: "1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "rgba(12,20,37,0.3)",
                  fontFamily: "var(--font-body, system-ui)",
                }}
              >
                Yi · NMT Vertical Diagnostic
              </p>
              <p
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  color: "rgba(12,20,37,0.3)",
                  fontFamily: "var(--font-body, system-ui)",
                }}
              >
                Generated {new Date(summary.generatedAt).toLocaleString("en-IN")}
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
