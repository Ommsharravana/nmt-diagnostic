"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
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

const maturityLabels: Record<number, string> = {
  1: "Fragile",
  2: "Emerging",
  3: "Growing",
  4: "Established",
  5: "Flagship",
};

const compareColors = ["#c4a35a", "#2563eb", "#059669", "#dc2626", "#7c3aed", "#ea580c"];

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [storedPassword, setStoredPassword] = useState("");

  // Data
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Check session
  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (saved) {
      setStoredPassword(saved);
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = async () => {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (data.valid) {
      sessionStorage.setItem("nmt-admin-pw", password);
      setStoredPassword(password);
      setAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterVertical !== "all") params.set("vertical", filterVertical);
    if (filterRegion !== "all") params.set("region", filterRegion);
    if (filterMaturity !== "all") params.set("maturity_level", filterMaturity);
    if (filterDateFrom) params.set("date_from", filterDateFrom);
    if (filterDateTo) params.set("date_to", filterDateTo);

    const res = await fetch(`/api/assessments?${params}`, {
      headers: { "x-admin-password": storedPassword },
    });
    if (res.ok) {
      const data = await res.json();
      setAssessments(data);
    }
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

    const res = await fetch(`/api/assessments/export?${params}`, {
      headers: { "x-admin-password": storedPassword },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
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

  // Sort assessments
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
  const dimNames = ["Strategy", "Penetration", "Execution", "Regional", "Impact", "Brand", "Continuity"];

  const radarCompareData = dimNames.map((name, i) => {
    const point: Record<string, string | number> = { dimension: name };
    compareAssessments.forEach((a) => {
      const label = `${a.vertical_name}${a.region ? ` (${a.region})` : ""}`;
      point[label] = a.dimension_scores?.[i]?.score || 0;
    });
    return point;
  });

  // LOGIN SCREEN
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold/50 mb-4">
            NMT Admin Dashboard
          </p>
          <h1 className="font-display text-3xl text-white mb-8">Enter Password</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Admin password"
            className="w-full px-4 py-3 rounded-lg bg-navy-light border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-gold/50 text-center tracking-wider"
            autoFocus
          />
          {authError && (
            <p className="text-red-400 text-xs mt-2">Incorrect password</p>
          )}
          <Button
            onClick={handleLogin}
            className="mt-4 w-full h-12 bg-gold hover:bg-gold-light text-navy font-semibold tracking-wider rounded-lg"
          >
            Access Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <div className="bg-navy px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold/50">
              NMT Admin
            </p>
            <h1 className="font-display text-2xl text-white">
              Assessment Dashboard
            </h1>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="h-9 px-4 rounded-lg border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase"
            >
              Export CSV
            </Button>
            <a
              href="/admin/live"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Live View
            </a>
            <a
              href="/admin/commitments"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Commitments
            </a>
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
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Assessments", value: totalCount.toString() },
            { label: "Avg Maturity Level", value: avgMaturity },
            { label: "Avg Score", value: `${avgScore}%` },
            { label: "This Month", value: thisMonth.toString() },
          ].map((card) => (
            <Card key={card.label} className="border border-navy/5 shadow-none bg-white">
              <CardContent className="p-4">
                <p className="text-[10px] tracking-[0.15em] uppercase text-navy/30 font-semibold">
                  {card.label}
                </p>
                <p className="font-display text-3xl text-navy mt-1">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Compare View */}
        {compareMode && compareAssessments.length >= 2 && (
          <Card className="border border-gold/20 shadow-none bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl text-navy">
                  Compare ({compareAssessments.length} selected)
                </h2>
                <Button
                  onClick={() => { setCompareMode(false); setCompareIds(new Set()); }}
                  variant="outline"
                  className="h-8 text-xs border-navy/10"
                >
                  Close Compare
                </Button>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarCompareData}>
                    <PolarGrid stroke="#e8e5df" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "#6b6b6b" }} />
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
                          fillOpacity={0.08}
                          strokeWidth={2}
                        />
                      );
                    })}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters + Compare toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterVertical} onValueChange={(v) => v && setFilterVertical(v)}>
            <SelectTrigger className="w-44 h-9 bg-white border-navy/10 text-sm">
              <SelectValue placeholder="All Verticals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verticals</SelectItem>
              {verticals.map((v) => (
                <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterRegion} onValueChange={(v) => v && setFilterRegion(v)}>
            <SelectTrigger className="w-40 h-9 bg-white border-navy/10 text-sm">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="National">National</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.code} value={r.code}>{r.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterMaturity} onValueChange={(v) => v && setFilterMaturity(v)}>
            <SelectTrigger className="w-36 h-9 bg-white border-navy/10 text-sm">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {[1, 2, 3, 4, 5].map((l) => (
                <SelectItem key={l} value={l.toString()}>L{l} — {maturityLabels[l]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="h-9 px-3 rounded-lg border border-navy/10 bg-white text-sm text-navy/70"
            placeholder="From"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="h-9 px-3 rounded-lg border border-navy/10 bg-white text-sm text-navy/70"
            placeholder="To"
          />

          <div className="flex-1" />

          <Button
            onClick={() => setCompareMode(!compareMode)}
            variant={compareMode ? "default" : "outline"}
            className={`h-9 text-xs tracking-wider uppercase ${compareMode ? "bg-gold text-navy" : "border-navy/10"}`}
          >
            {compareMode ? `Compare (${compareIds.size})` : "Compare Mode"}
          </Button>

          <span className="text-xs text-navy/30">
            {sorted.length} result{sorted.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-navy/5 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-navy/30 text-sm">Loading...</div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center text-navy/30 text-sm">No assessments yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy/5 bg-navy/[0.02]">
                    {compareMode && <th className="px-3 py-3 w-10" />}
                    <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                      Vertical
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                      Region
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                      Respondent
                    </th>
                    <th
                      className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold cursor-pointer hover:text-gold"
                      onClick={() => {
                        if (sortField === "total_score") setSortDir(sortDir === "asc" ? "desc" : "asc");
                        else { setSortField("total_score"); setSortDir("desc"); }
                      }}
                    >
                      Score {sortField === "total_score" && (sortDir === "desc" ? "↓" : "↑")}
                    </th>
                    <th
                      className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold cursor-pointer hover:text-gold"
                      onClick={() => {
                        if (sortField === "percentage") setSortDir(sortDir === "asc" ? "desc" : "asc");
                        else { setSortField("percentage"); setSortDir("desc"); }
                      }}
                    >
                      % {sortField === "percentage" && (sortDir === "desc" ? "↓" : "↑")}
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                      Level
                    </th>
                    <th
                      className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold cursor-pointer hover:text-gold"
                      onClick={() => {
                        if (sortField === "created_at") setSortDir(sortDir === "asc" ? "desc" : "asc");
                        else { setSortField("created_at"); setSortDir("desc"); }
                      }}
                    >
                      Date {sortField === "created_at" && (sortDir === "desc" ? "↓" : "↑")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const maturityBg: Record<number, string> = {
                      1: "bg-red-100 text-red-800",
                      2: "bg-orange-100 text-orange-800",
                      3: "bg-amber-100 text-amber-800",
                      4: "bg-blue-100 text-blue-800",
                      5: "bg-emerald-100 text-emerald-800",
                    };
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-navy/5 hover:bg-gold/[0.03] cursor-pointer transition-colors"
                        onClick={() => {
                          if (compareMode) {
                            toggleCompare(row.id);
                          } else {
                            window.open(`/results/${row.id}`, "_blank");
                          }
                        }}
                      >
                        {compareMode && (
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={compareIds.has(row.id)}
                              onChange={() => toggleCompare(row.id)}
                              className="w-4 h-4 rounded accent-gold"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 font-medium text-navy">{row.vertical_name}</td>
                        <td className="px-4 py-3 text-navy/50">{row.region || "—"}</td>
                        <td className="px-4 py-3 text-navy/50">{row.respondent_name || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-navy">
                          {row.total_score}<span className="text-navy/25">/175</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-navy/60">{row.percentage}%</td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={`text-[10px] ${maturityBg[row.maturity_level] || ""}`}>
                            L{row.maturity_level}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-navy/40 text-xs">
                          {new Date(row.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
