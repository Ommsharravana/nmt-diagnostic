export interface Question {
  id: string;
  dimensionIndex: number;
  questionNumber: number;
  text: string;
  selected: boolean; // whether included in the active test
}

export interface Dimension {
  index: number;
  name: string;
  shortName: string;
  questions: Question[];
}

export interface Answer {
  questionId: string;
  score: number; // 1-5
}

export type HealthStatus = "Strong" | "Stable" | "Weak" | "Critical";

export interface DimensionResult {
  dimension: Dimension;
  score: number;
  maxScore: number;
  percentage: number;
  health: HealthStatus;
  answers: Answer[];
}

export type MaturityLevel = 1 | 2 | 3 | 4 | 5;

export interface MaturityInfo {
  level: MaturityLevel;
  state: string;
  symptoms: string[];
  minScore: number;
  maxScore: number;
  minPercent: string;
}

export interface OverallResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  maturity: MaturityInfo;
  dimensions: DimensionResult[];
  weakest: DimensionResult[];
  strongest: DimensionResult[];
  verticalName: string;
  respondentName: string;
  region: string;
  date: string;
  chairName?: string;
  coChairName?: string;
}

export interface TestState {
  verticalName: string;
  respondentName: string;
  chairName: string;
  coChairName: string;
  region: string;
  currentStep: number; // 0 = info, 1-7 = dimensions, 8 = review
  answers: Record<string, number>;
}
