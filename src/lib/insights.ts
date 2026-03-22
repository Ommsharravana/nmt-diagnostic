import { OverallResult, DimensionResult, HealthStatus } from "./types";
import { verticalContexts, bestChapterFormula, multiTagStrategy } from "./yi-context";
import type { VerticalContext } from "./yi-context";

// Dimension dependency map — which dimensions are prerequisites for which
// Based on systems thinking: Strategy → Execution → Impact → Brand → Continuity
const dependencyMap: Record<number, number[]> = {
  0: [],        // Strategic Clarity depends on nothing (root)
  1: [0],       // Chapter Penetration depends on Strategy
  2: [0],       // Execution depends on Strategy
  3: [0, 2],    // Regional Alignment depends on Strategy + Execution
  4: [2, 3],    // Impact Measurement depends on Execution + Regional
  5: [4, 2],    // Brand Visibility depends on Impact + Execution
  6: [0, 2, 4], // Continuity depends on Strategy + Execution + Impact
};

// Dimension names for reference
const dimNames = [
  "Strategic Clarity & Direction",
  "Chapter Penetration & Adoption",
  "Execution & Standardisation",
  "Regional Alignment & Effectiveness",
  "Impact Measurement & Data Discipline",
  "Brand Strength & Visibility",
  "Continuity & Sustainability",
];

export interface RedFlag {
  dimension: string;
  question: string;
  score: number;
}

export interface LeveragePoint {
  dimension: string;
  score: number;
  cascadeTargets: string[];
  impact: "high" | "medium" | "low";
  reason: string;
}

export interface GapAnalysis {
  currentLevel: number;
  nextLevel: number;
  pointsNeeded: number;
  nextLevelName: string;
  quickestPath: { dimension: string; currentScore: number; potential: number }[];
}

export interface MonthlyFocus {
  month: string;
  dimension: string;
  actions: string[];
  targetImprovement: string;
}

export interface CorrelationInsight {
  pattern: string;
  diagnosis: string;
  prescription: string;
}

export interface VerticalBrief {
  context: VerticalContext | null;
  pathfinderGaps: string[];
  healthCardAdvice: string;
  nationalContact: string;
  bestChapterInsight: string;
  crossVerticalPlays: string[];
  mytriCoverage: string;
  upcomingDates: string[];
}

export interface DeepInsights {
  redFlags: RedFlag[];
  leveragePoints: LeveragePoint[];
  gapAnalysis: GapAnalysis | null;
  plan90Day: MonthlyFocus[];
  correlations: CorrelationInsight[];
  oneThingToFocus: string;
  systemicDiagnosis: string;
  verticalBrief: VerticalBrief;
}

export function generateDeepInsights(results: OverallResult): DeepInsights {
  const dims = results.dimensions;

  // 1. RED FLAGS — individual questions scoring 1 or 2
  const redFlags: RedFlag[] = [];
  for (const dim of dims) {
    for (const q of dim.dimension.questions) {
      const answer = dim.answers.find((a) => a.questionId === q.id);
      if (answer && answer.score <= 2) {
        redFlags.push({
          dimension: dim.dimension.shortName,
          question: q.text,
          score: answer.score,
        });
      }
    }
  }
  redFlags.sort((a, b) => a.score - b.score);

  // 2. LEVERAGE POINTS — dimensions whose improvement cascades most
  const leveragePoints = calculateLeveragePoints(dims);

  // 3. GAP ANALYSIS — path to next maturity level
  const gapAnalysis = calculateGapAnalysis(results);

  // 4. 90-DAY PLAN — sequenced action plan
  const plan90Day = generate90DayPlan(dims, leveragePoints);

  // 5. CORRELATION INSIGHTS — patterns between dimensions
  const correlations = findCorrelations(dims);

  // 6. ONE THING — the single highest-impact focus
  const oneThingToFocus = determineOneThing(dims, leveragePoints, redFlags);

  // 7. SYSTEMIC DIAGNOSIS — the narrative of what's happening
  const systemicDiagnosis = generateSystemicDiagnosis(dims, results);

  // 8. VERTICAL-SPECIFIC BRIEF — Pathfinder goals, Health Card, contacts
  const verticalBrief = generateVerticalBrief(results);

  return {
    redFlags,
    leveragePoints,
    gapAnalysis,
    plan90Day,
    correlations,
    oneThingToFocus,
    systemicDiagnosis,
    verticalBrief,
  };
}

function calculateLeveragePoints(dims: DimensionResult[]): LeveragePoint[] {
  const points: LeveragePoint[] = [];

  for (let i = 0; i < dims.length; i++) {
    // Count how many other dimensions depend on this one
    const cascadeTargets: string[] = [];
    for (const [targetIdx, deps] of Object.entries(dependencyMap)) {
      if (deps.includes(i)) {
        cascadeTargets.push(dimNames[parseInt(targetIdx)]);
      }
    }

    // High leverage = weak dimension that many others depend on
    const isWeak = dims[i].score <= 16;
    const hasManyDependents = cascadeTargets.length >= 2;

    if (isWeak && hasManyDependents) {
      points.push({
        dimension: dims[i].dimension.name,
        score: dims[i].score,
        cascadeTargets,
        impact: "high",
        reason: `Improving ${dims[i].dimension.shortName} would unlock progress in ${cascadeTargets.length} dependent dimensions`,
      });
    } else if (isWeak && cascadeTargets.length >= 1) {
      points.push({
        dimension: dims[i].dimension.name,
        score: dims[i].score,
        cascadeTargets,
        impact: "medium",
        reason: `${dims[i].dimension.shortName} is a prerequisite for ${cascadeTargets.map((t) => t.split(" ")[0]).join(", ")}`,
      });
    }
  }

  return points.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact] || a.score - b.score;
  });
}

function calculateGapAnalysis(results: OverallResult): GapAnalysis | null {
  const levelThresholds = [
    { level: 2, min: 88, name: "Emerging" },
    { level: 3, min: 112, name: "Growing" },
    { level: 4, min: 140, name: "Established" },
    { level: 5, min: 158, name: "Flagship" },
  ];

  const currentLevel = results.maturity.level;
  if (currentLevel >= 5) return null;

  const nextTarget = levelThresholds.find((t) => t.level === currentLevel + 1);
  if (!nextTarget) return null;

  const pointsNeeded = nextTarget.min - results.totalScore;

  // Find cheapest path: dimensions with most room for improvement
  const quickestPath = results.dimensions
    .map((d) => ({
      dimension: d.dimension.shortName,
      currentScore: d.score,
      potential: 25 - d.score, // room to grow
    }))
    .sort((a, b) => b.potential - a.potential)
    .slice(0, 3);

  return {
    currentLevel,
    nextLevel: currentLevel + 1,
    pointsNeeded,
    nextLevelName: nextTarget.name,
    quickestPath,
  };
}

function generate90DayPlan(
  dims: DimensionResult[],
  leveragePoints: LeveragePoint[]
): MonthlyFocus[] {
  const plan: MonthlyFocus[] = [];

  // Month 1: Fix the highest-leverage root cause
  const rootCause = leveragePoints[0] || {
    dimension: dims.sort((a, b) => a.score - b.score)[0].dimension.name,
  };
  const rootDim = dims.find((d) => d.dimension.name === rootCause.dimension);

  plan.push({
    month: "Month 1 — Foundation",
    dimension: rootCause.dimension,
    actions: getSpecificActions(rootDim?.dimension.index ?? 0, rootDim?.health ?? "Critical", "month1"),
    targetImprovement: rootDim
      ? `Move ${rootDim.dimension.shortName} from ${rootDim.score}/25 to ${Math.min(25, rootDim.score + 4)}/25`
      : "Establish foundation",
  });

  // Month 2: Address the second weakest that depends on month 1
  const sorted = [...dims].sort((a, b) => a.score - b.score);
  const month2Dim = sorted.find((d) => d.dimension.name !== rootCause.dimension) || sorted[1];

  plan.push({
    month: "Month 2 — Build Systems",
    dimension: month2Dim.dimension.name,
    actions: getSpecificActions(month2Dim.dimension.index, month2Dim.health, "month2"),
    targetImprovement: `Move ${month2Dim.dimension.shortName} from ${month2Dim.score}/25 to ${Math.min(25, month2Dim.score + 3)}/25`,
  });

  // Month 3: Strengthen what's working + measure impact
  const strongestWeak = sorted.find(
    (d) =>
      d.dimension.name !== rootCause.dimension &&
      d.dimension.name !== month2Dim.dimension.name &&
      d.health !== "Strong"
  );
  const month3Dim = strongestWeak || sorted[sorted.length - 1];

  plan.push({
    month: "Month 3 — Measure & Scale",
    dimension: month3Dim.dimension.name,
    actions: getSpecificActions(month3Dim.dimension.index, month3Dim.health, "month3"),
    targetImprovement: `Consolidate gains. Target overall +${Math.min(20, Math.max(5, 175 - (sorted.reduce((s, d) => s + d.score, 0))))} points`,
  });

  return plan;
}

function getSpecificActions(
  dimIndex: number,
  _health: HealthStatus,
  phase: string
): string[] {
  const actionBank: Record<number, Record<string, string[]>> = {
    0: {
      // Strategic Clarity
      month1: [
        "Write a one-sentence vertical mission that every RM can repeat",
        "Define 3 measurable year-end outcomes (not activities — outcomes)",
        "Create a one-page vertical guide replacing all ad-hoc instructions",
      ],
      month2: [
        "Present the mission + outcomes to all RMs in a 30-min alignment call",
        "Get each RM to articulate your vertical's priorities in their words",
      ],
      month3: [
        "Review: Can every chapter describe your vertical's goal in one sentence?",
        "Refine the strategy based on 2 months of execution feedback",
      ],
    },
    1: {
      // Chapter Penetration
      month1: [
        "Map every chapter: active, inactive, never-started — create a live spreadsheet",
        "Interview 5 inactive chapter leaders: why aren't they executing?",
        "Create a 'Quick Start Kit' — everything a chapter needs to run one activity",
      ],
      month2: [
        "Deploy the Quick Start Kit to 3 inactive chapters with 1:1 support",
        "Identify and appoint 2 regional champions to drive adoption beyond national push",
      ],
      month3: [
        "Measure: How many chapters moved from inactive to active?",
        "Build a monthly activation cadence — don't let chapters go silent again",
      ],
    },
    2: {
      // Execution
      month1: [
        "Document your top 3 programs as step-by-step playbooks (not slides — playbooks)",
        "Create one 'flagship replicable model' any chapter can execute without hand-holding",
        "Build a quality rubric: what does 'good' look like vs 'checkbox compliance'?",
      ],
      month2: [
        "Test the playbook with 2 new chapters — note where they get stuck",
        "Set up systematic best-practice sharing (monthly call or shared doc)",
      ],
      month3: [
        "Audit 5 chapters: are they executing to standard or reinventing?",
        "Iterate the playbook based on what you learned",
      ],
    },
    3: {
      // Regional Alignment
      month1: [
        "Establish bi-weekly structured RM check-ins (not just forwarding messages)",
        "Create a clear RACI: what does National do vs Region vs Chapter?",
        "Identify the weakest and strongest region — understand why",
      ],
      month2: [
        "Build a proactive escalation pathway — chapters shouldn't wait to ask for help",
        "Have each RM present their region's status in a structured format",
      ],
      month3: [
        "Review RM effectiveness: are they adding value or just passing messages?",
        "Pair the strongest region with the weakest for peer mentoring",
      ],
    },
    4: {
      // Impact Measurement
      month1: [
        "Define your ONE North Star Metric — the single number that shows you're winning",
        "Create a structured reporting template for chapters (not free-form updates)",
        "Move beyond event counting — define outcome metrics that matter",
      ],
      month2: [
        "Review data BEFORE planning (not after) — let numbers drive decisions",
        "Build one dashboard showing real-time status across chapters",
      ],
      month3: [
        "Prepare a 5-minute impact presentation for GC/National with clear numbers",
        "Write 3 transformation stories — data tells, stories sell",
      ],
    },
    5: {
      // Brand Visibility
      month1: [
        "Create a recognizable visual identity for your vertical (not just Yi logo)",
        "Launch one signature campaign with national recall potential",
        "Set up systematic documentation — every activity gets photos + social posts",
      ],
      month2: [
        "Collaborate with Branding vertical for amplification support",
        "Ensure your vertical appears in every national communication cycle",
      ],
      month3: [
        "Build external visibility — get coverage beyond Yi's own channels",
        "Archive impact stories in a browsable format for handover",
      ],
    },
    6: {
      // Continuity
      month1: [
        "Create handover documentation NOW — don't wait for year-end",
        "Build a 'vertical wiki' that captures institutional memory systematically",
        "Identify 3 durable assets you'll leave behind (documents, partnerships, models)",
      ],
      month2: [
        "Transition all critical processes from personality-driven to system-driven",
        "Use past year's knowledge explicitly in this year's planning",
      ],
      month3: [
        "Audit: could a new team run this vertical using only your documentation?",
        "The test: if you disappeared tomorrow, what would break?",
      ],
    },
  };

  return actionBank[dimIndex]?.[phase] || [
    "Assess current state with key stakeholders",
    "Identify top 3 gaps and create action items",
    "Set measurable targets for next quarter",
  ];
}

function findCorrelations(dims: DimensionResult[]): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];
  const scores = dims.map((d) => d.score);

  // Pattern: Strong strategy but weak execution
  if (scores[0] >= 17 && scores[2] <= 16) {
    insights.push({
      pattern: "Strategy-Execution Gap",
      diagnosis:
        "Your vertical knows where it's going but can't get there consistently. Ideas are clear, but chapters struggle to execute them uniformly.",
      prescription:
        "The bottleneck is not vision — it's playbooks. Create step-by-step execution guides that eliminate the need for interpretation.",
    });
  }

  // Pattern: Weak strategy cascading everywhere
  if (scores[0] <= 12) {
    insights.push({
      pattern: "Root Cause: Strategy Vacuum",
      diagnosis:
        "Without strategic clarity, every other dimension suffers. Chapters don't know what to do, RMs can't guide them, and impact can't be measured against undefined goals.",
      prescription:
        "Stop all other improvement efforts. Spend 2 weeks getting strategy crystal clear. Everything else follows.",
    });
  }

  // Pattern: Strong execution but weak impact measurement
  if (scores[2] >= 17 && scores[4] <= 16) {
    insights.push({
      pattern: "Execution Without Evidence",
      diagnosis:
        "You're doing good work but can't prove it. Activities happen, but data isn't captured systematically enough to demonstrate impact.",
      prescription:
        "You don't need to do more — you need to measure what you're already doing. Build data capture into the execution process itself.",
    });
  }

  // Pattern: Good impact data but poor brand visibility
  if (scores[4] >= 17 && scores[5] <= 16) {
    insights.push({
      pattern: "Hidden Gem Syndrome",
      diagnosis:
        "Your vertical has real impact with data to prove it, but nobody outside knows. The work is excellent; the storytelling is missing.",
      prescription:
        "Your #1 priority is visibility. You have the proof — now broadcast it. Partner with Branding vertical immediately.",
    });
  }

  // Pattern: Strong everywhere but continuity
  if (scores.filter((s) => s >= 17).length >= 5 && scores[6] <= 16) {
    insights.push({
      pattern: "Single-Year Wonder Risk",
      diagnosis:
        "This vertical is performing well right now, but it's likely personality-driven. When this team moves on, progress could reset to zero.",
      prescription:
        "Your urgent task is documentation and system-building. Convert everything that's in people's heads into written processes.",
    });
  }

  // Pattern: Weak penetration despite good strategy
  if (scores[0] >= 17 && scores[1] <= 16) {
    insights.push({
      pattern: "Adoption Barrier",
      diagnosis:
        "The strategy is clear, but chapters aren't buying in. This usually means the vertical is seen as 'nice-to-have' rather than essential, or the activation barrier is too high.",
      prescription:
        "Make the first step ridiculously easy. Create a 'one-meeting activation kit' that any chapter can run with zero prep.",
    });
  }

  // Pattern: Overall low scores
  if (dims.every((d) => d.score <= 16)) {
    insights.push({
      pattern: "Full Rebuild Required",
      diagnosis:
        "No dimension is at a healthy level. This isn't about fixing one area — the vertical needs a fundamental reset.",
      prescription:
        "Pick ONE dimension (start with Strategy). Get it to Strong before touching anything else. Trying to fix everything at once will fix nothing.",
    });
  }

  return insights;
}

function determineOneThing(
  dims: DimensionResult[],
  leveragePoints: LeveragePoint[],
  redFlags: RedFlag[]
): string {
  // If strategy is critical/weak, that's always #1
  if (dims[0].score <= 16) {
    return `Fix Strategic Clarity first. At ${dims[0].score}/25, your vertical lacks a clear mission — and every other dimension suffers because of it. Write a one-sentence mission and 3 measurable outcomes this week.`;
  }

  // If there's a high-leverage point
  if (leveragePoints.length > 0 && leveragePoints[0].impact === "high") {
    return `Focus on ${leveragePoints[0].dimension}. It's weak (${leveragePoints[0].score}/25) AND it blocks progress in ${leveragePoints[0].cascadeTargets.length} other dimensions. Improving it creates a cascade effect.`;
  }

  // If lots of red flags in one dimension
  const flagsByDim = redFlags.reduce(
    (acc, rf) => {
      acc[rf.dimension] = (acc[rf.dimension] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const worstDim = Object.entries(flagsByDim).sort((a, b) => b[1] - a[1])[0];
  if (worstDim && worstDim[1] >= 3) {
    return `${worstDim[0]} has ${worstDim[1]} critical red flags (scores of 1-2). Address these statements first — they indicate fundamental gaps, not minor weaknesses.`;
  }

  // Default: weakest dimension
  const weakest = [...dims].sort((a, b) => a.score - b.score)[0];
  return `Strengthen ${weakest.dimension.name} (${weakest.score}/25). It's your weakest link and likely the constraint on overall progress.`;
}

function generateSystemicDiagnosis(
  dims: DimensionResult[],
  results: OverallResult
): string {
  const scores = dims.map((d) => d.score);
  const strongCount = dims.filter((d) => d.health === "Strong").length;
  const criticalCount = dims.filter((d) => d.health === "Critical").length;
  const level = results.maturity.level;

  if (level === 5) {
    return `${results.verticalName} is operating at Flagship level — institutionalized systems, strong data discipline, and a recognizable identity. The challenge now is maintaining this standard across leadership transitions. Focus on documentation and succession planning.`;
  }

  if (level === 4) {
    return `${results.verticalName} has a strong foundation with ${strongCount} dimensions at healthy levels. The path to Flagship requires closing gaps in the remaining dimensions — particularly ${dims.filter((d) => d.health !== "Strong").map((d) => d.dimension.shortName).join(" and ")}. This is about polish and institutionalization, not fundamental change.`;
  }

  if (level === 3) {
    const narrative = scores[0] >= 17
      ? `The strategy is clear, but execution isn't consistent enough to produce measurable impact at scale.`
      : `Both strategic direction and on-ground execution need strengthening — the vertical is growing organically but without a clear system.`;
    return `${results.verticalName} is at a critical inflection point. ${narrative} With ${results.percentage}% maturity, you're closer to Established than Fragile — but the next 15 percentage points require deliberate systems-building, not just more activity.`;
  }

  if (level === 2) {
    return `${results.verticalName} has the beginnings of structure but lacks the systems to deliver consistent results. ${criticalCount > 0 ? `With ${criticalCount} dimension(s) in Critical state, there are fundamental gaps that need addressing before scaling.` : `The priority is building repeatable processes — move from ad-hoc to standardized.`} Don't try to improve everything at once. Pick the highest-leverage dimension and build from there.`;
  }

  // Level 1
  return `${results.verticalName} needs a fundamental rebuild. At ${results.totalScore}/175, most dimensions lack basic structure. This is not a criticism — it's a starting point. The path forward is: (1) Define what this vertical exists to achieve, (2) Create one replicable program, (3) Execute it in 3 chapters with documentation. Build the foundation before worrying about scale.`;
}

function generateVerticalBrief(results: OverallResult): VerticalBrief {
  const ctx = verticalContexts[results.verticalName] || null;

  if (!ctx) {
    return {
      context: null,
      pathfinderGaps: [],
      healthCardAdvice: bestChapterFormula.components.map(c => `${c.name}: ${c.target}`).join(". "),
      nationalContact: "Refer to Yi National Council for vertical-specific guidance.",
      bestChapterInsight: `Best Chapter = ${bestChapterFormula.formula}. ${multiTagStrategy}`,
      crossVerticalPlays: [],
      mytriCoverage: "Engage all 4 MYTRI stakeholders (Members, Yuva, Thalir, Rural) for maximum health card coverage.",
      upcomingDates: [],
    };
  }

  // Identify Pathfinder goal gaps based on dimension scores
  const pathfinderGaps: string[] = [];
  const dims = results.dimensions;

  // Strategy weak → likely not aligned with 2026 vision
  if (dims[0].score <= 16) {
    pathfinderGaps.push(
      `Pathfinder 2026 Vision: "${ctx.vision2026}" — but strategic clarity scores suggest chapters may not be aligned with this vision yet.`
    );
  }

  // Execution weak → flagship initiatives probably not standardized
  if (dims[2].score <= 16) {
    const top2Initiatives = ctx.flagshipInitiatives.slice(0, 2).join("; ");
    pathfinderGaps.push(
      `Key national initiatives (${top2Initiatives}) likely lack standardized execution playbooks across chapters.`
    );
  }

  // Impact weak → success metrics probably not being tracked
  if (dims[4].score <= 16) {
    const topMetrics = ctx.successMetrics.slice(0, 2).join("; ");
    pathfinderGaps.push(
      `Pathfinder success metrics not being tracked: ${topMetrics}. Without measurement, impact cannot be demonstrated at GC/National.`
    );
  }

  // Brand weak → visibility gap
  if (dims[5].score <= 16) {
    pathfinderGaps.push(
      `National recognition is at risk. The BCDE engine needs content from ${ctx.name} to amplify — but weak brand scores mean stories aren't being captured or shared.`
    );
  }

  // Penetration weak → chapters not executing
  if (dims[1].score <= 16) {
    pathfinderGaps.push(
      `Chapter adoption is low. Many chapters may not be executing ${ctx.name} initiatives — missing the Best Chapter 'Coverage' requirement.`
    );
  }

  // Health Card advice specific to this vertical
  const healthCardAdvice = ctx.healthCardTip;

  // National contact
  const nationalContact = `National Chair: ${ctx.nationalChair} | SRTN RM: ${ctx.srtnRM}. Reach out for national resources, playbooks, and alignment support.`;

  // Best Chapter insight
  const weakestComponent = dims[4].score <= 16
    ? "Impact (can't prove outcomes)"
    : dims[5].score <= 16
      ? "Visibility (great work stays invisible)"
      : dims[2].score <= 16
        ? "Coverage (inconsistent execution)"
        : dims[1].score <= 16
          ? "Coverage (chapters not participating)"
          : "Documentation (activities not captured in Health Cards)";

  const bestChapterInsight = `Best Chapter formula weakest link for ${ctx.name}: ${weakestComponent}. ${multiTagStrategy}`;

  // Cross-vertical plays
  const crossVerticalPlays = ctx.crossVerticalOpportunities;

  // MYTRI coverage
  const { awareness, action, advocacy } = ctx.threeAsEmphasis;
  const mytriCoverage = `${ctx.name} primarily engages ${ctx.mytriPrimary.join(", ")}. 3A's balance: ${awareness}% Awareness, ${action}% Action, ${advocacy}% Advocacy. Ensure Health Card entries cover all engaged stakeholders.`;

  // Upcoming dates
  const upcomingDates = ctx.keyDates;

  return {
    context: ctx,
    pathfinderGaps,
    healthCardAdvice,
    nationalContact,
    bestChapterInsight,
    crossVerticalPlays,
    mytriCoverage,
    upcomingDates,
  };
}
