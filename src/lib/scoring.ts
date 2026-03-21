import { getTestQuestions } from "./questions";
import {
  Answer,
  DimensionResult,
  HealthStatus,
  MaturityInfo,
  OverallResult,
} from "./types";

const healthThresholds: { min: number; max: number; status: HealthStatus }[] = [
  { min: 21, max: 25, status: "Strong" },
  { min: 17, max: 20, status: "Stable" },
  { min: 13, max: 16, status: "Weak" },
  { min: 5, max: 12, status: "Critical" },
];

const maturityLevels: MaturityInfo[] = [
  {
    level: 1,
    state: "Structurally Fragile",
    minScore: 35,
    maxScore: 87,
    minPercent: "< 49%",
    symptoms: [
      "Reactive vertical",
      "Weak systems",
      "Poor penetration",
      "No measurable impact",
    ],
  },
  {
    level: 2,
    state: "Emerging",
    minScore: 88,
    maxScore: 111,
    minPercent: "50% – 64%",
    symptoms: [
      "Some clarity",
      "Inconsistent adoption",
      "Systems partially built",
    ],
  },
  {
    level: 3,
    state: "Growing",
    minScore: 112,
    maxScore: 139,
    minPercent: "65% – 79%",
    symptoms: [
      "Clear direction",
      "Moderate national adoption",
      "Beginning of impact measurement",
    ],
  },
  {
    level: 4,
    state: "Established",
    minScore: 140,
    maxScore: 157,
    minPercent: "80% – 89%",
    symptoms: [
      "Strong structure",
      "Good penetration",
      "Measurable outcomes",
      "Documentation present",
    ],
  },
  {
    level: 5,
    state: "Flagship",
    minScore: 158,
    maxScore: 175,
    minPercent: "90%+",
    symptoms: [
      "Institutionalised systems",
      "Recognisable national identity",
      "Strong data discipline",
      "Leadership continuity",
    ],
  },
];

function getDimensionHealth(score: number): HealthStatus {
  for (const t of healthThresholds) {
    if (score >= t.min && score <= t.max) return t.status;
  }
  return "Critical";
}

function getMaturityLevel(totalScore: number): MaturityInfo {
  for (const level of maturityLevels) {
    if (totalScore >= level.minScore && totalScore <= level.maxScore)
      return level;
  }
  // Fallback
  return totalScore < 35 ? maturityLevels[0] : maturityLevels[4];
}

export function calculateResults(
  answers: Record<string, number>,
  verticalName: string,
  respondentName: string,
  region: string
): OverallResult {
  const testDimensions = getTestQuestions();

  const dimensionResults: DimensionResult[] = testDimensions.map((dim) => {
    const dimAnswers: Answer[] = dim.questions.map((q) => ({
      questionId: q.id,
      score: answers[q.id] || 0,
    }));

    const score = dimAnswers.reduce((sum, a) => sum + a.score, 0);
    const maxScore = dim.questions.length * 5;

    return {
      dimension: dim,
      score,
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      health: getDimensionHealth(score),
      answers: dimAnswers,
    };
  });

  const totalScore = dimensionResults.reduce((sum, d) => sum + d.score, 0);
  const maxScore = 175;
  const percentage = Math.round((totalScore / maxScore) * 100);

  // Sort by score ascending for weakest
  const sorted = [...dimensionResults].sort((a, b) => a.score - b.score);
  const weakest = sorted.slice(0, 2);
  const strongest = sorted.slice(-2).reverse();

  return {
    totalScore,
    maxScore,
    percentage,
    maturity: getMaturityLevel(totalScore),
    dimensions: dimensionResults,
    weakest,
    strongest,
    verticalName,
    respondentName,
    region,
    date: new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

export { maturityLevels };
