"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OverallResult, DimensionResult, HealthStatus } from "@/lib/types";
import {
  getRecommendations,
  getOverallRecommendation,
} from "@/lib/recommendations";
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

  const radarData = results.dimensions.map((d) => ({
    dimension: d.dimension.shortName,
    score: d.score,
    fullMark: 25,
  }));

  const overallRec = getOverallRecommendation(results.percentage);

  const handleExportPDF = async () => {
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
        `NMT-Diagnostic-${results.verticalName.replace(/\s+/g, "-")}.pdf`
      );
    } catch {
      alert("PDF export failed. Please try again.");
    }
  };

  const handleCopyResults = () => {
    const text = [
      `NMT Vertical Diagnostic — ${results.verticalName}`,
      `Date: ${results.date}`,
      results.respondentName ? `Respondent: ${results.respondentName}` : "",
      results.region ? `Region: ${results.region}` : "",
      "",
      `Overall: ${results.totalScore}/${results.maxScore} (${results.percentage}%)`,
      `Maturity: Level ${results.maturity.level} — ${results.maturity.state}`,
      "",
      "Dimension Scores:",
      ...results.dimensions.map(
        (d) =>
          `  ${d.dimension.name}: ${d.score}/25 (${d.health})`
      ),
      "",
      `Priority Areas: ${results.weakest.map((d) => d.dimension.name).join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    alert("Results copied to clipboard!");
  };

  return (
    <div className="min-h-screen py-6 px-4">
      <div ref={dashboardRef} className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-500 font-medium">
            NMT Vertical Diagnostic Test Results
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

        {/* Maturity Level Badge */}
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
              <span>
                Score: {results.totalScore}/{results.maxScore}
              </span>
              <span>|</span>
              <span>{results.percentage}%</span>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {results.maturity.symptoms.map((s, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-white/20 text-xs"
                >
                  {s}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
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

        {/* Dimension Cards */}
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
                  isPriority={index < 2 && dim.health !== "Strong"}
                />
              ))}
          </div>
        </div>

        <Separator />

        {/* Recommendations */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {overallRec.title}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            {overallRec.description}
          </p>

          {results.weakest
            .filter((d) => d.health !== "Strong")
            .map((dim) => {
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
                          <span className="text-blue-500 mt-0.5 shrink-0">
                            →
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {/* Score Detail */}
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700 py-2">
            View all 35 scores ▸
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
                        className="flex items-center gap-3 text-sm py-1.5 px-3 rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <div
                              key={n}
                              className={`w-2 h-2 rounded-full ${
                                n <= score ? "bg-blue-500" : "bg-slate-200"
                              }`}
                            />
                          ))}
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
        >
          Download PDF Report
        </Button>
        <Button
          onClick={handleCopyResults}
          variant="outline"
          className="h-12 px-6 rounded-xl"
        >
          Copy Results
        </Button>
        <Button
          onClick={onRetake}
          className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700"
        >
          Take Again
        </Button>
      </div>

      <footer className="text-center py-8 text-xs text-slate-400">
        Young Indians — CII &middot; NMT Vertical Diagnostic Tool
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
