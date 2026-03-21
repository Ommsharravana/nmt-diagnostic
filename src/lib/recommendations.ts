import { HealthStatus } from "./types";

type RecommendationMap = Record<string, Record<HealthStatus, string[]>>;

const recommendations: RecommendationMap = {
  "Strategic Clarity & Direction": {
    Critical: [
      "Urgently define a one-sentence vertical mission statement",
      "Set 2-3 measurable annual outcomes immediately",
      "Conduct a strategy alignment session with all RMs",
      "Create a clear one-pager distinguishing this vertical from others",
    ],
    Weak: [
      "Refine annual theme to be more specific and measurable",
      "Ensure every RM can articulate the vertical's priorities",
      "Create structured guidance documents replacing ad-hoc instructions",
    ],
    Stable: [
      "Sharpen year-end vision into concrete milestones",
      "Regular check-ins to ensure strategic alignment across regions",
    ],
    Strong: [
      "Document and share your strategic clarity model as a best practice",
      "Mentor other verticals on strategic planning",
    ],
  },
  "Chapter Penetration & Adoption": {
    Critical: [
      "Map all chapters: active, inactive, never-started",
      "Identify and address the top 3 reasons chapters avoid this vertical",
      "Create a 'quick start' kit for chapters to begin executing",
      "Deploy regional champions in at least 3 regions",
    ],
    Weak: [
      "Develop an activation strategy for low-performing chapters",
      "Survey chapter leaders to understand adoption barriers",
      "Ensure activity is spread across regions, not concentrated",
    ],
    Stable: [
      "Move from 'nice-to-have' to 'must-have' positioning for chapters",
      "Identify and empower more regional champions",
    ],
    Strong: [
      "Share penetration strategies with other verticals",
      "Focus on quality of execution rather than just reach",
    ],
  },
  "Execution & Standardisation": {
    Critical: [
      "Create basic SOPs and playbooks immediately",
      "Document at least one flagship replicable model",
      "Ensure a new team could execute without verbal handholding",
      "Stop reinventing — standardize the top 3 programs",
    ],
    Weak: [
      "Build systematic best-practice sharing mechanisms",
      "Audit execution quality across regions, not just quantity",
      "Create clear distinction between experimental and standard programs",
    ],
    Stable: [
      "Refine SOPs based on actual execution learnings",
      "Create a quality scoring rubric for program execution",
    ],
    Strong: [
      "Your SOPs can become national templates — formalize and share them",
      "Focus on innovation within the standardized framework",
    ],
  },
  "Regional Alignment & Effectiveness": {
    Critical: [
      "Establish weekly structured interactions between RMs",
      "Define clear roles: National vs Region vs Chapter responsibilities",
      "Ensure regional structure adds value beyond forwarding messages",
      "Identify which region is weakest and deploy targeted support",
    ],
    Weak: [
      "Build RM performance review into quarterly cadence",
      "Create proactive escalation pathways for RMs",
      "Map regional strengths and weaknesses with root causes",
    ],
    Stable: [
      "Optimize communication flow — reduce noise, increase signal",
      "Empower RMs to make region-specific adaptations within framework",
    ],
    Strong: [
      "Your regional model is working — document it as a playbook",
      "Help other verticals set up effective regional structures",
    ],
  },
  "Impact Measurement & Data Discipline": {
    Critical: [
      "Define your North Star Metric immediately",
      "Move beyond event counting — define outcome metrics",
      "Create a structured reporting format for chapters",
      "Start using data to drive strategy decisions, not just reporting",
    ],
    Weak: [
      "Build a data review cadence before each planning cycle",
      "Develop impact stories that show transformation, not activity",
      "Ensure you can present clear numbers at GC/National",
    ],
    Stable: [
      "Refine metrics to tell a story of transformation",
      "Use data dashboards for real-time visibility",
    ],
    Strong: [
      "Your data discipline is exemplary — share frameworks with other verticals",
      "Focus on predictive metrics, not just retrospective",
    ],
  },
  "Brand Strength & Visibility": {
    Critical: [
      "Develop a recognizable national identity for this vertical",
      "Create at least one signature campaign with national recall",
      "Actively collaborate with the Branding vertical",
      "Start documenting and archiving impact stories systematically",
    ],
    Weak: [
      "Increase visibility in national communication channels",
      "Build external ecosystem visibility beyond Yi",
      "Associate the vertical with meaningful, aspirational work",
    ],
    Stable: [
      "Create a content calendar for consistent visibility",
      "Leverage success stories for both internal and external branding",
    ],
    Strong: [
      "Your brand is strong — maintain it and help others build theirs",
      "Focus on external visibility and thought leadership",
    ],
  },
  "Continuity & Sustainability": {
    Critical: [
      "Create handover documentation immediately — don't lose institutional memory",
      "Build systems, not personality-dependent processes",
      "Start creating durable assets: documents, models, partnerships",
      "Ensure past knowledge is accessible and used in current planning",
    ],
    Weak: [
      "Transition from personality-driven to system-driven knowledge",
      "Build lasting partnerships and assets that outlast any team",
      "Create a handover playbook for smooth transitions",
    ],
    Stable: [
      "Strengthen documentation and knowledge management",
      "Focus on leaving the vertical demonstrably stronger",
    ],
    Strong: [
      "Your continuity systems are a model — help others replicate",
      "Focus on multi-year strategy, not just annual goals",
    ],
  },
};

export function getRecommendations(
  dimensionName: string,
  health: HealthStatus
): string[] {
  return recommendations[dimensionName]?.[health] || [];
}

export function getOverallRecommendation(
  percentage: number
): { title: string; description: string } {
  if (percentage >= 90) {
    return {
      title: "Flagship Vertical",
      description:
        "This vertical is operating at the highest level. Focus on maintaining excellence, mentoring other verticals, and building lasting institutional legacy.",
    };
  }
  if (percentage >= 80) {
    return {
      title: "Strong Foundation",
      description:
        "This vertical has solid systems in place. Focus on the 1-2 weaker dimensions to move from Established to Flagship status.",
    };
  }
  if (percentage >= 65) {
    return {
      title: "Growing — Push to the Next Level",
      description:
        "Good direction is set. The priority areas below need focused attention to build the systems and consistency required for Established status.",
    };
  }
  if (percentage >= 50) {
    return {
      title: "Emerging — Build the Basics",
      description:
        "There's a foundation to work with, but critical gaps exist. Address the weakest dimensions first — they're holding back overall maturity.",
    };
  }
  return {
    title: "Structural Rebuild Needed",
    description:
      "This vertical needs significant investment in its foundations. Focus on strategy, standardisation, and data discipline before scaling execution.",
  };
}
