"use client";

import { useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OverallResult, DimensionResult, HealthStatus } from "@/lib/types";
import { getRecommendations } from "@/lib/recommendations";
import { generateDeepInsights } from "@/lib/insights";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

interface ResultsDashboardProps {
  results: OverallResult;
  onRetake: () => void;
}

const healthColors: Record<HealthStatus, string> = {
  Strong: "#22c55e",
  Stable: "#3b82f6",
  Weak: "#f97316",
  Critical: "#ef4444",
};

const healthBgColors: Record<HealthStatus, string> = {
  Strong: "bg-emerald-50 border-emerald-200 text-emerald-700",
  Stable: "bg-blue-50 border-blue-200 text-blue-700",
  Weak: "bg-orange-50 border-orange-200 text-orange-700",
  Critical: "bg-red-50 border-red-200 text-red-700",
};

const maturityColors: Record<number, string> = {
  1: "from-red-500 to-red-600",
  2: "from-orange-500 to-orange-600",
  3: "from-yellow-500 to-amber-600",
  4: "from-blue-500 to-blue-600",
  5: "from-emerald-500 to-emerald-600",
};

export default function ResultsDashboard({
  results,
  onRetake,
}: ResultsDashboardProps) {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const insights = useMemo(() => generateDeepInsights(results), [results]);

  const radarData = results.dimensions.map((d) => ({
    dimension: d.dimension.shortName,
    score: d.score,
    fullMark: 25,
  }));

  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const element = dashboardRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f8fafc",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      pdf.save(
        `NMT-Diagnostic-${results.verticalName.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-")}.pdf`
      );
    } catch {
      alert("PDF export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyResults = async () => {
    const text = [
      `NMT Vertical Diagnostic — ${results.verticalName}`,
      `Date: ${results.date}`,
      results.respondentName ? `Respondent: ${results.respondentName}` : null,
      results.region ? `Region: ${results.region}` : null,
      "",
      `Overall: ${results.totalScore}/${results.maxScore} (${results.percentage}%)`,
      `Maturity: Level ${results.maturity.level} — ${results.maturity.state}`,
      "",
      "Dimension Scores:",
      ...results.dimensions.map(
        (d) => `  ${d.dimension.name}: ${d.score}/25 (${d.health})`
      ),
      "",
      `Systemic Diagnosis: ${insights.systemicDiagnosis}`,
      "",
      `#1 Focus: ${insights.oneThingToFocus}`,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setCopyFailed(false);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  };

  return (
    <div className="min-h-screen py-6 px-4">
      <div ref={dashboardRef} className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-500 font-medium">
            NMT Vertical Diagnostic Report
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {results.verticalName}
          </h1>
          <p className="text-sm text-slate-400">
            {results.date}
            {results.respondentName && ` · ${results.respondentName}`}
            {results.region && ` · ${results.region}`}
          </p>
        </div>

        {/* ===== SECTION 1: MATURITY LEVEL ===== */}
        <Card
          className={`border-0 shadow-lg bg-gradient-to-r ${maturityColors[results.maturity.level]} text-white overflow-hidden`}
        >
          <CardContent className="p-8 text-center relative">
            <div className="absolute top-4 right-4 text-6xl font-black opacity-10">
              L{results.maturity.level}
            </div>
            <p className="text-sm font-medium opacity-80 uppercase tracking-wider">
              Vertical Maturity
            </p>
            <div className="text-6xl font-black mt-2">
              Level {results.maturity.level}
            </div>
            <div className="text-2xl font-bold mt-1 opacity-90">
              {results.maturity.state}
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm opacity-80">
              <span>Score: {results.totalScore}/{results.maxScore}</span>
              <span>|</span>
              <span>{results.percentage}%</span>
            </div>
          </CardContent>
        </Card>

        {/* ===== SECTION 2: SYSTEMIC DIAGNOSIS ===== */}
        <Card className="border-0 shadow-md bg-slate-900 text-white">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
              Systemic Diagnosis
            </p>
            <p className="text-base leading-relaxed">
              {insights.systemicDiagnosis}
            </p>
          </CardContent>
        </Card>

        {/* ===== SECTION 2B: PATHFINDER CONTEXT ===== */}
        {insights.verticalBrief.context && (
          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-l-amber-400">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-amber-700 font-semibold mb-1">
                  Pathfinder 2026 Vision
                </p>
                <p className="text-sm text-slate-800 italic leading-relaxed">
                  &ldquo;{insights.verticalBrief.context.vision2026}&rdquo;
                </p>
              </div>

              {insights.verticalBrief.pathfinderGaps.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-red-600 font-semibold mb-2">
                    Pathfinder Alignment Gaps
                  </p>
                  <div className="space-y-2">
                    {insights.verticalBrief.pathfinderGaps.map((gap, i) => (
                      <p key={i} className="text-sm text-slate-700 pl-3 border-l-2 border-red-300">
                        {gap}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">National Contact</p>
                  <p className="text-xs text-slate-700">{insights.verticalBrief.nationalContact}</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">MYTRI & 3A&apos;s</p>
                  <p className="text-xs text-slate-700">{insights.verticalBrief.mytriCoverage}</p>
                </div>
              </div>

              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Health Card Tip</p>
                <p className="text-xs text-slate-700">{insights.verticalBrief.healthCardAdvice}</p>
              </div>

              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Best Chapter Impact</p>
                <p className="text-xs text-slate-700">{insights.verticalBrief.bestChapterInsight}</p>
              </div>

              {insights.verticalBrief.crossVerticalPlays.length > 0 && (
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Cross-Vertical Plays</p>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.verticalBrief.crossVerticalPlays.map((play, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-amber-100 border border-amber-200 text-xs text-amber-800">
                        {play}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {insights.verticalBrief.upcomingDates.length > 0 && (
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Key Dates 2026</p>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.verticalBrief.upcomingDates.map((d, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-blue-50 border border-blue-200 text-xs text-blue-700">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== SECTION 3: THE ONE THING ===== */}
        <Card className="border-0 shadow-md border-l-4 border-l-blue-500 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">
                  The One Thing to Focus On
                </p>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {insights.oneThingToFocus}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== SECTION 4: RADAR CHART ===== */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Dimension Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 25]}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickCount={6}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ===== SECTION 5: DIMENSION BREAKDOWN ===== */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Dimension Breakdown
          </h2>
          <div className="grid gap-3">
            {[...results.dimensions]
              .sort((a, b) => a.score - b.score)
              .map((dim, index) => (
                <DimensionCard
                  key={dim.dimension.index}
                  result={dim}
                  isPriority={index < 2}
                />
              ))}
          </div>
        </div>

        {/* ===== SECTION 6: CORRELATION INSIGHTS (Patterns) ===== */}
        {insights.correlations.length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">
                Pattern Analysis
              </h2>
              <div className="space-y-3">
                {insights.correlations.map((c, i) => (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="text-xs border-purple-300 text-purple-700 bg-purple-50"
                        >
                          Pattern
                        </Badge>
                        <span className="font-semibold text-slate-800 text-sm">
                          {c.pattern}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {c.diagnosis}
                      </p>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                          Prescription
                        </p>
                        <p className="text-sm text-slate-800 font-medium">
                          {c.prescription}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ===== SECTION 7: RED FLAGS ===== */}
        {insights.redFlags.length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Red Flags
              </h2>
              <p className="text-sm text-slate-500 mb-3">
                Statements scored 1-2 — these indicate fundamental gaps, not minor weaknesses
              </p>
              <div className="space-y-2">
                {insights.redFlags.slice(0, 10).map((rf, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm py-2.5 px-4 rounded-lg bg-red-50 border border-red-100"
                  >
                    <span className="shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                      {rf.score}
                    </span>
                    <div>
                      <span className="text-red-800">{rf.question}</span>
                      <span className="text-red-400 text-xs ml-2">
                        ({rf.dimension})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ===== SECTION 8: LEVERAGE POINTS ===== */}
        {insights.leveragePoints.length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Highest-Leverage Interventions
              </h2>
              <p className="text-sm text-slate-500 mb-3">
                Dimensions where improvement creates a cascade effect across multiple areas
              </p>
              <div className="space-y-3">
                {insights.leveragePoints.map((lp, i) => (
                  <Card
                    key={i}
                    className={`border-0 shadow-sm ${lp.impact === "high" ? "ring-2 ring-amber-200" : ""}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={`text-xs ${
                            lp.impact === "high"
                              ? "bg-amber-500"
                              : "bg-slate-500"
                          }`}
                        >
                          {lp.impact === "high"
                            ? "High Leverage"
                            : "Medium Leverage"}
                        </Badge>
                        <span className="font-semibold text-slate-800 text-sm">
                          {lp.dimension}
                        </span>
                        <span className="text-slate-400 text-xs">
                          ({lp.score}/25)
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {lp.reason}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {lp.cascadeTargets.map((target, j) => (
                          <span
                            key={j}
                            className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-700"
                          >
                            Unlocks: {target.split(" & ")[0]}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ===== SECTION 9: GAP ANALYSIS ===== */}
        {insights.gapAnalysis && (
          <>
            <Separator />
            <Card className="border-0 shadow-md bg-gradient-to-r from-indigo-50 to-blue-50">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">
                  Path to Level {insights.gapAnalysis.nextLevel} —{" "}
                  {insights.gapAnalysis.nextLevelName}
                </h2>
                <p className="text-sm text-slate-600 mb-4">
                  You need{" "}
                  <span className="font-bold text-indigo-700">
                    {insights.gapAnalysis.pointsNeeded} more points
                  </span>{" "}
                  to reach the next maturity level. Here&apos;s the fastest path:
                </p>
                <div className="space-y-2">
                  {insights.gapAnalysis.quickestPath.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white rounded-lg p-3 border border-indigo-100"
                    >
                      <div>
                        <span className="font-medium text-slate-800 text-sm">
                          {p.dimension}
                        </span>
                        <span className="text-slate-400 text-xs ml-2">
                          Currently {p.currentScore}/25
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-indigo-600 font-bold text-sm">
                          +{p.potential} possible
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ===== SECTION 10: 90-DAY ACTION PLAN ===== */}
        <Separator />
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            90-Day Action Plan
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Sequenced interventions — fix the root cause first, then build systems, then measure
          </p>
          <div className="space-y-4">
            {insights.plan90Day.map((month, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        i === 0
                          ? "bg-red-500"
                          : i === 1
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {month.month}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 ml-10 mb-2">
                    Focus: {month.dimension} · Target: {month.targetImprovement}
                  </p>
                  <ul className="ml-10 space-y-1.5">
                    {month.actions.map((action, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <span className="text-blue-500 mt-0.5 shrink-0">
                          →
                        </span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ===== SECTION 11: PRIORITY RECOMMENDATIONS (existing) ===== */}
        <Separator />
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Detailed Recommendations by Dimension
          </h2>
          {results.weakest.slice(0, 2).map((dim) => {
            const recs = getRecommendations(dim.dimension.name, dim.health);
            return (
              <Card
                key={dim.dimension.index}
                className="border-0 shadow-md mb-3"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="destructive" className="text-xs">
                      Priority
                    </Badge>
                    <span className="font-semibold text-slate-800">
                      {dim.dimension.name}
                    </span>
                    <span className="text-sm text-slate-400">
                      ({dim.score}/25 · {dim.health})
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {recs.map((rec, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <span className="text-blue-500 mt-0.5 shrink-0">→</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ===== SECTION 12: STRENGTHS ===== */}
        {results.strongest.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              What You&apos;re Doing Well
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {results.strongest.map((dim) => (
                <Card
                  key={dim.dimension.index}
                  className="border-0 shadow-sm bg-emerald-50/50"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-emerald-600 font-bold text-lg">
                        {dim.score}/25
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${healthBgColors[dim.health]}`}
                      >
                        {dim.health}
                      </span>
                    </div>
                    <span className="font-medium text-slate-800 text-sm">
                      {dim.dimension.name}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ===== SECTION 13: FULL SCORE DETAIL ===== */}
        <Separator />
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700 py-2">
            View all 35 individual scores ▸
          </summary>
          <div className="mt-3 space-y-4">
            {results.dimensions.map((dim) => (
              <div key={dim.dimension.index}>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  {dim.dimension.name}{" "}
                  <span className="font-normal text-slate-400">
                    ({dim.score}/25)
                  </span>
                </h3>
                <div className="space-y-1">
                  {dim.dimension.questions.map((q) => {
                    const score =
                      dim.answers.find((a) => a.questionId === q.id)?.score ||
                      0;
                    return (
                      <div
                        key={q.id}
                        className={`flex items-center gap-3 text-sm py-1.5 px-3 rounded-lg hover:bg-slate-50 ${score <= 2 ? "bg-red-50/50" : ""}`}
                      >
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div
                                key={n}
                                className={`w-2 h-2 rounded-full ${
                                  n <= score
                                    ? score <= 2
                                      ? "bg-red-500"
                                      : "bg-blue-500"
                                    : "bg-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-slate-400 tabular-nums">
                            {score}/5
                          </span>
                        </div>
                        <span className="text-slate-600 leading-snug">
                          {q.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Action Bar */}
      <div className="max-w-3xl mx-auto mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          onClick={handleExportPDF}
          variant="outline"
          className="h-12 px-6 rounded-xl"
          disabled={isExporting}
        >
          {isExporting ? "Generating PDF..." : "Download PDF Report"}
        </Button>
        <Button
          onClick={handleCopyResults}
          variant="outline"
          className="h-12 px-6 rounded-xl"
          disabled={isCopied}
        >
          {isCopied
            ? "Copied!"
            : copyFailed
              ? "Failed to copy"
              : "Copy Results"}
        </Button>
        <Button
          onClick={onRetake}
          className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700"
        >
          Take Again
        </Button>
      </div>

      <footer className="text-center py-8 text-xs text-slate-400">
        Young Indians — CII · NMT Vertical Diagnostic Tool
      </footer>
    </div>
  );
}

function DimensionCard({
  result,
  isPriority,
}: {
  result: DimensionResult;
  isPriority: boolean;
}) {
  const barWidth = (result.score / 25) * 100;

  return (
    <Card
      className={`border-0 shadow-sm transition-all hover:shadow-md ${
        isPriority ? "ring-2 ring-orange-200" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isPriority && (
              <Badge
                variant="outline"
                className="text-[10px] border-orange-300 text-orange-600 bg-orange-50"
              >
                Priority
              </Badge>
            )}
            <span className="font-medium text-slate-800 text-sm">
              {result.dimension.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">
              {result.score}
              <span className="text-slate-400 font-normal">/25</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${healthBgColors[result.health]}`}
            >
              {result.health}
            </span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${barWidth}%`,
              backgroundColor: healthColors[result.health],
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
