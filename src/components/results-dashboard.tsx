"use client";

import { useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  assessmentId?: string | null;
}

const healthColors: Record<HealthStatus, string> = {
  Strong: "#059669",
  Stable: "#2563eb",
  Weak: "#d97706",
  Critical: "#dc2626",
};

const healthBgColors: Record<HealthStatus, string> = {
  Strong: "bg-emerald-50 border-emerald-300 text-emerald-800",
  Stable: "bg-blue-50 border-blue-300 text-blue-800",
  Weak: "bg-amber-50 border-amber-300 text-amber-800",
  Critical: "bg-red-50 border-red-300 text-red-800",
};

export default function ResultsDashboard({
  results,
  onRetake,
  assessmentId,
}: ResultsDashboardProps) {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

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
        backgroundColor: "#fafaf8",
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
      `Diagnosis: ${insights.systemicDiagnosis}`,
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
    <div className="min-h-screen">
      {/* ===== HERO HEADER — dark navy ===== */}
      <div className="relative bg-navy overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="rgrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#c4a35a" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#rgrid)" />
          </svg>
        </div>

        <div ref={dashboardRef} className="relative z-10">
          <div className="max-w-3xl mx-auto px-6 pt-10 pb-16 text-center">
            {/* Report label */}
            <p className="animate-slide-up stagger-1 text-[10px] tracking-[0.3em] uppercase text-gold/60 font-medium">
              NMT Vertical Diagnostic Report
            </p>

            {/* Vertical name */}
            <h1 className="animate-slide-up stagger-2 font-display text-4xl sm:text-5xl text-white mt-3 tracking-tight">
              {results.verticalName}
            </h1>

            {/* Meta line */}
            <p className="animate-slide-up stagger-3 text-xs text-white/30 mt-2 tracking-wide">
              {results.date}
              {results.respondentName && ` · ${results.respondentName}`}
              {results.region && ` · ${results.region}`}
            </p>

            {/* Maturity level — the centrepiece */}
            <div className="animate-count stagger-4 mt-10">
              <div className="inline-flex flex-col items-center">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[3px] border-gold/40 flex items-center justify-center relative">
                  <div className="absolute inset-2 rounded-full border border-gold/20" />
                  <div className="text-center">
                    <div className="font-display text-5xl sm:text-6xl text-white">
                      {results.maturity.level}
                    </div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-gold/60 -mt-1">
                      Level
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="font-display text-2xl text-gold italic">
                    {results.maturity.state}
                  </div>
                  <div className="text-sm text-white/40 mt-1">
                    {results.totalScore}/{results.maxScore} &middot; {results.percentage}%
                  </div>
                </div>
              </div>
            </div>

            {/* Systemic diagnosis */}
            <div className="animate-slide-up stagger-5 mt-10 max-w-2xl mx-auto">
              <p className="text-sm sm:text-base text-white/50 leading-relaxed font-light italic">
                &ldquo;{insights.systemicDiagnosis}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT — warm parchment ===== */}
      <div className="bg-parchment px-4 sm:px-6 py-10">
        <div className="max-w-3xl mx-auto space-y-10">
          {/* THE ONE THING */}
          <div className="animate-slide-up stagger-6">
            <div className="flex items-start gap-4 bg-navy rounded-xl p-6">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="font-display text-xl text-gold">1</span>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-gold/70 font-medium mb-1">
                  The One Thing to Focus On
                </p>
                <p className="text-sm text-white/80 leading-relaxed">
                  {insights.oneThingToFocus}
                </p>
              </div>
            </div>
          </div>

          {/* PATHFINDER CONTEXT */}
          {insights.verticalBrief.context && (
            <div className="animate-slide-up stagger-7">
              <SectionLabel>Pathfinder 2026 Intelligence</SectionLabel>
              <Card className="border border-gold/20 shadow-none bg-white">
                <CardContent className="p-6 space-y-5">
                  <div>
                    <p className="text-[10px] tracking-[0.15em] uppercase text-gold-muted font-semibold mb-1">
                      National Vision
                    </p>
                    <p className="font-display text-base text-navy italic leading-relaxed">
                      &ldquo;{insights.verticalBrief.context.vision2026}&rdquo;
                    </p>
                  </div>

                  {insights.verticalBrief.pathfinderGaps.length > 0 && (
                    <div>
                      <p className="text-[10px] tracking-[0.15em] uppercase text-red-600 font-semibold mb-2">
                        Alignment Gaps
                      </p>
                      <div className="space-y-2">
                        {insights.verticalBrief.pathfinderGaps.map((gap, i) => (
                          <p key={i} className="text-sm text-navy/70 pl-3 border-l-2 border-red-300 leading-relaxed">
                            {gap}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3">
                    <InfoBlock label="National Contact" value={insights.verticalBrief.nationalContact} />
                    <InfoBlock label="MYTRI & 3A's" value={insights.verticalBrief.mytriCoverage} />
                  </div>

                  <InfoBlock label="Health Card Strategy" value={insights.verticalBrief.healthCardAdvice} />
                  <InfoBlock label="Best Chapter Impact" value={insights.verticalBrief.bestChapterInsight} />

                  {insights.verticalBrief.crossVerticalPlays.length > 0 && (
                    <div>
                      <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-2">
                        Cross-Vertical Plays
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {insights.verticalBrief.crossVerticalPlays.map((play, i) => (
                          <span key={i} className="px-2.5 py-1 rounded border border-gold/20 bg-gold/5 text-xs text-navy/60">
                            {play}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.verticalBrief.upcomingDates.length > 0 && (
                    <div>
                      <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-2">
                        Key Dates 2026
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {insights.verticalBrief.upcomingDates.map((d, i) => (
                          <span key={i} className="px-2.5 py-1 rounded border border-navy/10 bg-navy/[0.03] text-xs text-navy/60">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* RADAR CHART */}
          <div className="animate-slide-up stagger-8">
            <SectionLabel>Dimension Overview</SectionLabel>
            <Card className="border border-navy/5 shadow-none bg-white">
              <CardContent className="p-6">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%">
                      <PolarGrid stroke="#e8e5df" />
                      <PolarAngleAxis
                        dataKey="dimension"
                        tick={{ fontSize: 11, fill: "#6b6b6b", fontFamily: "var(--font-body)" }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 25]}
                        tick={{ fontSize: 9, fill: "#a8a8a8" }}
                        tickCount={6}
                      />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#c4a35a"
                        fill="#c4a35a"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DIMENSION BREAKDOWN */}
          <div className="animate-slide-up stagger-9">
            <SectionLabel>Dimension Breakdown</SectionLabel>
            <div className="grid gap-2">
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

          {/* PATTERN ANALYSIS */}
          {insights.correlations.length > 0 && (
            <div className="animate-slide-up stagger-10">
              <SectionLabel>Pattern Analysis</SectionLabel>
              <div className="space-y-3">
                {insights.correlations.map((c, i) => (
                  <Card key={i} className="border border-navy/5 shadow-none bg-white premium-card">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                        <span className="font-display text-base text-navy">
                          {c.pattern}
                        </span>
                      </div>
                      <p className="text-sm text-navy/60 mb-3 leading-relaxed">
                        {c.diagnosis}
                      </p>
                      <div className="bg-navy/[0.03] rounded-lg p-3 border border-navy/5">
                        <p className="text-[10px] tracking-[0.15em] uppercase text-navy/30 font-semibold mb-1">
                          Prescription
                        </p>
                        <p className="text-sm text-navy/80 font-medium leading-relaxed">
                          {c.prescription}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* RED FLAGS */}
          {insights.redFlags.length > 0 && (
            <div>
              <SectionLabel>Red Flags</SectionLabel>
              <p className="text-xs text-navy/40 -mt-4 mb-3">
                Statements scored 1-2 — fundamental gaps, not minor weaknesses
              </p>
              <div className="space-y-2">
                {insights.redFlags.slice(0, 10).map((rf, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm py-3 px-4 rounded-lg bg-red-50/50 border border-red-200/50"
                  >
                    <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                      {rf.score}
                    </span>
                    <div>
                      <span className="text-navy/80">{rf.question}</span>
                      <span className="text-navy/30 text-xs ml-2">({rf.dimension})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LEVERAGE POINTS */}
          {insights.leveragePoints.length > 0 && (
            <div>
              <SectionLabel>Highest-Leverage Interventions</SectionLabel>
              <p className="text-xs text-navy/40 -mt-4 mb-3">
                Improving these creates a cascade effect across multiple dimensions
              </p>
              <div className="space-y-3">
                {insights.leveragePoints.map((lp, i) => (
                  <Card key={i} className={`border shadow-none bg-white ${lp.impact === "high" ? "border-gold/40" : "border-navy/5"}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-[10px] tracking-wider uppercase ${lp.impact === "high" ? "bg-gold text-navy" : "bg-navy/10 text-navy/60"}`}>
                          {lp.impact} leverage
                        </Badge>
                        <span className="font-medium text-navy text-sm">{lp.dimension}</span>
                        <span className="text-navy/30 text-xs">({lp.score}/25)</span>
                      </div>
                      <p className="text-sm text-navy/60 mb-2 leading-relaxed">{lp.reason}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lp.cascadeTargets.map((target, j) => (
                          <span key={j} className="px-2 py-0.5 rounded bg-gold/10 border border-gold/20 text-xs text-gold-muted">
                            Unlocks: {target.split(" & ")[0]}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* GAP ANALYSIS */}
          {insights.gapAnalysis && (
            <div>
              <SectionLabel>
                Path to Level {insights.gapAnalysis.nextLevel} — {insights.gapAnalysis.nextLevelName}
              </SectionLabel>
              <Card className="border border-navy/5 shadow-none bg-white">
                <CardContent className="p-6">
                  <p className="text-sm text-navy/60 mb-4">
                    You need{" "}
                    <span className="font-bold text-navy">
                      {insights.gapAnalysis.pointsNeeded} more points
                    </span>{" "}
                    to reach the next maturity level. Fastest path:
                  </p>
                  <div className="space-y-2">
                    {insights.gapAnalysis.quickestPath.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-navy/[0.02] rounded-lg p-3 border border-navy/5">
                        <div>
                          <span className="font-medium text-navy text-sm">{p.dimension}</span>
                          <span className="text-navy/30 text-xs ml-2">Currently {p.currentScore}/25</span>
                        </div>
                        <span className="text-gold-muted font-bold text-sm">+{p.potential} possible</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 90-DAY ACTION PLAN */}
          <div>
            <SectionLabel>90-Day Action Plan</SectionLabel>
            <p className="text-xs text-navy/40 -mt-4 mb-3">
              Sequenced interventions — root cause first, then systems, then measurement
            </p>
            <div className="space-y-4">
              {insights.plan90Day.map((month, i) => {
                const monthColors = ["bg-red-600", "bg-gold", "bg-emerald-600"];
                return (
                  <Card key={i} className="border border-navy/5 shadow-none bg-white premium-card">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`w-8 h-8 rounded-full ${monthColors[i]} flex items-center justify-center text-white text-sm font-bold`}>
                          {i + 1}
                        </span>
                        <span className="font-display text-lg text-navy">{month.month}</span>
                      </div>
                      <p className="text-[10px] tracking-wider uppercase text-navy/30 ml-11 mb-2">
                        Focus: {month.dimension} &middot; {month.targetImprovement}
                      </p>
                      <ul className="ml-11 space-y-1.5">
                        {month.actions.map((action, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-navy/60">
                            <span className="text-gold mt-0.5 shrink-0">&rarr;</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* DETAILED RECOMMENDATIONS */}
          <div>
            <SectionLabel>Detailed Recommendations</SectionLabel>
            {results.weakest.slice(0, 2).map((dim) => {
              const recs = getRecommendations(dim.dimension.name, dim.health);
              return (
                <Card key={dim.dimension.index} className="border border-navy/5 shadow-none bg-white mb-3">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="text-[10px] bg-red-600 text-white tracking-wider uppercase">Priority</Badge>
                      <span className="font-medium text-navy">{dim.dimension.name}</span>
                      <span className="text-navy/30 text-xs">({dim.score}/25 · {dim.health})</span>
                    </div>
                    <ul className="space-y-2">
                      {recs.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-navy/60">
                          <span className="text-gold mt-0.5 shrink-0">&rarr;</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* STRENGTHS */}
          {results.strongest.length > 0 && (
            <div>
              <SectionLabel>What You&apos;re Doing Well</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {results.strongest.map((dim) => (
                  <Card key={dim.dimension.index} className="border border-emerald-200/50 shadow-none bg-emerald-50/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-emerald-700 font-bold text-lg">{dim.score}/25</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${healthBgColors[dim.health]}`}>
                          {dim.health}
                        </span>
                      </div>
                      <span className="font-medium text-navy/80 text-sm">{dim.dimension.name}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ALL 35 SCORES */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-navy/30 hover:text-navy/50 py-2 tracking-wide uppercase">
              View all 35 individual scores &#9656;
            </summary>
            <div className="mt-3 space-y-4">
              {results.dimensions.map((dim) => (
                <div key={dim.dimension.index}>
                  <h3 className="text-xs font-semibold text-navy/50 mb-2 tracking-wide uppercase">
                    {dim.dimension.name}{" "}
                    <span className="font-normal text-navy/30">({dim.score}/25)</span>
                  </h3>
                  <div className="space-y-1">
                    {dim.dimension.questions.map((q) => {
                      const score = dim.answers.find((a) => a.questionId === q.id)?.score || 0;
                      return (
                        <div
                          key={q.id}
                          className={`flex items-center gap-3 text-sm py-1.5 px-3 rounded-lg ${score <= 2 ? "bg-red-50/50" : "hover:bg-navy/[0.02]"}`}
                        >
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <div
                                  key={n}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    n <= score
                                      ? score <= 2 ? "bg-red-500" : "bg-gold"
                                      : "bg-navy/10"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-navy/30 tabular-nums w-6">{score}/5</span>
                          </div>
                          <span className="text-navy/60 leading-snug">{q.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="bg-warm-gray border-t border-navy/5 py-6 px-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleExportPDF}
            variant="outline"
            className="h-11 px-6 rounded-lg border-navy/10 text-navy/60 hover:border-gold hover:text-gold text-xs tracking-wider uppercase"
            disabled={isExporting}
          >
            {isExporting ? "Generating..." : "Download PDF"}
          </Button>
          <Button
            onClick={handleCopyResults}
            variant="outline"
            className="h-11 px-6 rounded-lg border-navy/10 text-navy/60 hover:border-gold hover:text-gold text-xs tracking-wider uppercase"
            disabled={isCopied}
          >
            {isCopied ? "Copied!" : copyFailed ? "Failed" : "Copy Results"}
          </Button>
          <Button
            onClick={onRetake}
            className="h-11 px-6 rounded-lg bg-navy hover:bg-navy-light text-xs tracking-wider uppercase"
          >
            New Assessment
          </Button>
          {assessmentId && (
            <Button
              onClick={async () => {
                const url = `${window.location.origin}/results/${assessmentId}`;
                try {
                  await navigator.clipboard.writeText(url);
                  setIsLinkCopied(true);
                  setTimeout(() => setIsLinkCopied(false), 2000);
                } catch {
                  // fallback
                }
              }}
              variant="outline"
              className="h-11 px-6 rounded-lg border-gold/30 text-gold hover:bg-gold/10 text-xs tracking-wider uppercase"
              disabled={isLinkCopied}
            >
              {isLinkCopied ? "Link Copied!" : "Share Link"}
            </Button>
          )}
        </div>
        <p className="text-center mt-4 text-[10px] text-navy/20 tracking-widest uppercase">
          Young Indians &mdash; Confederation of Indian Industry
        </p>
      </div>
    </div>
  );
}

/* ===== Sub-components ===== */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl text-navy mb-4 tracking-tight">
      {children}
    </h2>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy/[0.02] rounded-lg p-3 border border-navy/5">
      <p className="text-[10px] tracking-[0.15em] uppercase text-navy/30 font-semibold mb-1">
        {label}
      </p>
      <p className="text-xs text-navy/60 leading-relaxed">{value}</p>
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
    <div
      className={`flex items-center gap-4 p-4 rounded-lg bg-white border transition-all premium-card ${
        isPriority ? "border-gold/30" : "border-navy/5"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {isPriority && (
            <span className="text-[9px] tracking-wider uppercase text-gold-muted font-bold">
              Priority
            </span>
          )}
          <span className="font-medium text-navy text-sm truncate">
            {result.dimension.name}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-navy/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${barWidth}%`,
              backgroundColor: healthColors[result.health],
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold text-navy tabular-nums">
          {result.score}
          <span className="text-navy/25 font-normal">/25</span>
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${healthBgColors[result.health]}`}>
          {result.health}
        </span>
      </div>
    </div>
  );
}
