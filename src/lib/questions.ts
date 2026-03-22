import { Dimension } from "./types";

// Full question bank from the Excel — 51 questions across 7 dimensions

const rawQuestions: { dimension: string; shortName: string; questions: string[] }[] = [
  {
    dimension: "Strategic Clarity & Direction",
    shortName: "Strategy",
    questions: [
      "Our vertical has a clearly articulated annual theme aligned with Yi's national vision.",
      "We have defined 2–3 measurable outcomes that define success for this year.",
      "Every RM clearly understands our national priorities.",
      "Chapters receive structured guidance instead of ad-hoc instructions.",
      "We can clearly articulate how our vertical will look stronger by year-end.",
      "If asked \"Why does this vertical exist?\", we can answer in one sharp sentence.",
      "Our vertical has a clear differentiation from other verticals (no overlap confusion).",
    ],
  },
  {
    dimension: "Chapter Penetration & Adoption",
    shortName: "Penetration",
    questions: [
      "Majority of chapters are actively executing our vertical.",
      "Activity is spread across regions, not concentrated.",
      "We track active vs inactive chapters.",
      "We have a strategy to activate low-performing chapters.",
      "Chapter leadership perceives our vertical as relevant.",
      "We understand why some chapters avoid our vertical.",
      "Our vertical is seen as \"must-have\" rather than optional.",
      "We have regional champions driving momentum beyond national push.",
    ],
  },
  {
    dimension: "Execution & Standardisation",
    shortName: "Execution",
    questions: [
      "We have SOPs/playbooks/templates.",
      "Execution quality is consistent across regions.",
      "Chapters don't reinvent the model each time.",
      "Best practices are shared systematically.",
      "A new team can execute using our resources.",
      "Our vertical has at least one \"flagship replicable model.\"",
      "We audit execution quality, not just quantity.",
      "There is clarity between experimentation and standard programs.",
    ],
  },
  {
    dimension: "Regional Alignment & Effectiveness",
    shortName: "Regional",
    questions: [
      "RMs conduct regular structured interactions.",
      "RMs are proactive in guidance and escalation.",
      "We review RM performance periodically.",
      "Role clarity exists between National, Region, Chapter.",
      "Communication flow is efficient.",
      "We know which region is strongest and weakest in our vertical — and why.",
      "Our regional structure adds value beyond forwarding messages.",
    ],
  },
  {
    dimension: "Impact Measurement & Data Discipline",
    shortName: "Impact",
    questions: [
      "We track quantifiable metrics beyond event count.",
      "Chapters report data in structured format.",
      "We review performance data before planning.",
      "We can present clear impact numbers at GC/National.",
      "Data influences strategy decisions.",
      "We measure outcomes, not just outputs.",
      "Our data tells a story of transformation, not activity.",
      "We have defined one \"North Star Metric\" for this vertical.",
    ],
  },
  {
    dimension: "Brand Strength & Visibility",
    shortName: "Brand",
    questions: [
      "Our vertical has a recognizable national identity.",
      "We collaborate effectively with Branding vertical.",
      "Our vertical is visible in national communication.",
      "Members associate it with meaningful work.",
      "Our vertical has at least one nationally recognisable campaign.",
      "We actively document and archive impact stories.",
      "Our work is visible beyond Yi (external ecosystem visibility).",
    ],
  },
  {
    dimension: "Continuity & Sustainability",
    shortName: "Continuity",
    questions: [
      "Proper documentation exists for handover.",
      "Institutional memory is maintained.",
      "Past knowledge is used in planning.",
      "Knowledge is system-driven, not personality-driven.",
      "We are building assets (documents, models, partnerships) that outlast us.",
      "This year's team will leave the vertical stronger than they found it.",
    ],
  },
];

// Build full dimension array with all questions
export const allDimensions: Dimension[] = rawQuestions.map((dim, dIndex) => ({
  index: dIndex,
  name: dim.dimension,
  shortName: dim.shortName,
  questions: dim.questions.map((text, qIndex) => ({
    id: `d${dIndex}_q${qIndex}`,
    dimensionIndex: dIndex,
    questionNumber: qIndex + 1,
    text,
    selected: qIndex < 5, // default: first 5
  })),
}));

// Default selections: first 5 per dimension
function getDefaultSelections(): Record<string, string[]> {
  const defaults: Record<string, string[]> = {};
  for (const dim of allDimensions) {
    defaults[dim.index.toString()] = dim.questions
      .slice(0, 5)
      .map((q) => q.id);
  }
  return defaults;
}

const STORAGE_KEY = "nmt-question-selections";

// Load saved selections from localStorage (or use defaults)
export function getSelections(): Record<string, string[]> {
  if (typeof window === "undefined") return getDefaultSelections();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate: must have 7 dimensions with 5 each
      const valid = allDimensions.every(
        (dim) =>
          parsed[dim.index.toString()] &&
          parsed[dim.index.toString()].length === 5
      );
      if (valid) return parsed;
    }
  } catch {
    // ignore
  }
  return getDefaultSelections();
}

// Save selections to localStorage
export function saveSelections(selections: Record<string, string[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
}

// Reset to defaults
export function resetSelections() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// Get test questions based on current selections
export function getTestQuestions(): Dimension[] {
  const selections = getSelections();
  return allDimensions.map((dim) => {
    const selectedIds = new Set(selections[dim.index.toString()] || []);
    return {
      ...dim,
      questions: dim.questions.filter((q) => selectedIds.has(q.id)),
    };
  });
}

// Get all questions (full bank)
export function getAllQuestions(): Dimension[] {
  return allDimensions;
}

// For backward compatibility
export const dimensions = allDimensions;
