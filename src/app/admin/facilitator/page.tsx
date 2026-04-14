"use client";

import { useState, useEffect, useMemo, useRef } from "react";

// ---------- Run-sheet data ----------
interface RunStep {
  id: number;
  offsetMin: number;
  durationMin: number;
  activity: string;
  detail: string;
}

const RUN_STEPS: RunStep[] = [
  {
    id: 1,
    offsetMin: 0,
    durationMin: 10,
    activity: "Opening address",
    detail:
      "Set context: why this diagnostic, NOT a performance review, tone supportive.",
  },
  {
    id: 2,
    offsetMin: 10,
    durationMin: 5,
    activity: "Framework walkthrough",
    detail: "7 dimensions, 5 Qs each, 1-5 scale, total /175. Share the link.",
  },
  {
    id: 3,
    offsetMin: 15,
    durationMin: 15,
    activity: "Live assessment",
    detail: "Each vertical's Chair + Co-Chair take the 35-Q test jointly.",
  },
  {
    id: 4,
    offsetMin: 30,
    durationMin: 5,
    activity: "Results review",
    detail: "Scan overall scores. Do NOT call out lowest publicly.",
  },
  {
    id: 5,
    offsetMin: 35,
    durationMin: 20,
    activity: "Dimension deep-dive",
    detail: "Each vertical picks lowest, verbal share 30-45 sec.",
  },
  {
    id: 6,
    offsetMin: 55,
    durationMin: 15,
    activity: "Action commitment",
    detail: "Write 3 action items. Specific, owned, time-bound.",
  },
  {
    id: 7,
    offsetMin: 70,
    durationMin: 10,
    activity: "Sharing commitments",
    detail: "2-3 verticals volunteer to share.",
  },
  {
    id: 8,
    offsetMin: 80,
    durationMin: 5,
    activity: "Closing",
    detail: "Reinforce: snapshot not scorecard. Next NMT review.",
  },
];

const TOTAL_SESSION_MIN =
  RUN_STEPS[RUN_STEPS.length - 1].offsetMin +
  RUN_STEPS[RUN_STEPS.length - 1].durationMin;

// ---------- Checklist data ----------
interface ChecklistItem {
  id: string;
  label: string;
}
interface ChecklistGroup {
  title: string;
  code: string;
  items: ChecklistItem[];
}

const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    title: "Technical Setup",
    code: "TEC",
    items: [
      { id: "t1", label: "Assessment app tested" },
      { id: "t2", label: "Admin dashboard in presentation mode" },
      { id: "t3", label: "Link ready (QR or short URL)" },
      { id: "t4", label: "Paper backup printed" },
    ],
  },
  {
    title: "Room Setup",
    code: "RMX",
    items: [
      { id: "r1", label: "Chair & Co-Chair seated together" },
      { id: "r2", label: "One device per vertical" },
      { id: "r3", label: "Projector connected" },
      { id: "r4", label: "Printed Action Commitment Sheets distributed" },
    ],
  },
  {
    title: "Facilitator Prep",
    code: "FAC",
    items: [
      { id: "f1", label: "Playbook reviewed" },
      { id: "f2", label: "Tech support person assigned" },
      { id: "f3", label: "Timer visible" },
      { id: "f4", label: "Pens available" },
    ],
  },
];

// ---------- Talking points data ----------
interface TalkingPointSection {
  id: string;
  title: string;
  duration: string;
  stepId: number;
  kind: "bullets" | "dodont" | "flow";
  bullets?: string[];
  dos?: string[];
  donts?: string[];
  flow?: { heading: string; body: string }[];
}

const TALKING_POINTS: TalkingPointSection[] = [
  {
    id: "opening",
    title: "Opening address",
    duration: "10 min",
    stepId: 1,
    kind: "bullets",
    bullets: [
      'Start with the "why": "Yi has always been powered by energy and passion. But energy without measurement is just noise..."',
      'Set the tone: "This is not a scorecard to judge you. This is a mirror for your vertical..."',
      'Explain the shift: "We are moving from activity-driven to impact-driven..."',
      "Set expectations: \"You'll answer 35 questions across 7 dimensions...\"",
      'Transition: "Let me walk you through the framework..."',
    ],
  },
  {
    id: "framework",
    title: "Framework walkthrough",
    duration: "5 min",
    stepId: 2,
    kind: "bullets",
    bullets: [
      "Introduce the 7 dimensions: Strategy, Leadership, Execution, People, Impact, Governance, Innovation.",
      "5 questions per dimension, 35 questions total.",
      "Scoring: 1-5 scale per question. Total out of 175.",
      "Chair and Co-Chair take the assessment JOINTLY. Discuss each question before answering.",
      "Be honest. A low score here earns you support, not criticism.",
      'Transition into live assessment: "Scan the QR code. Begin when ready."',
    ],
  },
  {
    id: "during",
    title: "During the assessment",
    duration: "15 min",
    stepId: 3,
    kind: "bullets",
    bullets: [
      "Keep the energy light. A calm, supportive tone helps honest answers.",
      "Walk around the room. Offer to clarify a question if anyone signals.",
      "Watch the admin dashboard quietly. Do NOT announce scores as they come in.",
      "If a vertical finishes early, ask them to review their answers once before submitting.",
    ],
  },
  {
    id: "results",
    title: "Results review",
    duration: "5 min",
    stepId: 4,
    kind: "dodont",
    dos: [
      "Read out the distribution: how many verticals are at each maturity level.",
      "Acknowledge that every vertical has something to work on.",
      "Frame the deep-dive as an opportunity, not a verdict.",
    ],
    donts: [
      "Do NOT single out the lowest-scoring vertical.",
      "Do NOT compare verticals side-by-side.",
      "Do NOT react visibly to any specific score.",
    ],
  },
  {
    id: "deepdive",
    title: "Dimension deep-dive",
    duration: "20 min",
    stepId: 5,
    kind: "flow",
    flow: [
      {
        heading: "Prompt",
        body: 'Ask each vertical: "Look at your lowest-scoring dimension. In 30-45 seconds, tell us what is behind that score."',
      },
      {
        heading: "Vertical-by-vertical flow",
        body: "Go around the room. Keep each share to under a minute. Chair or Co-Chair can speak. Thank each share.",
      },
      {
        heading: "Defensive redirect",
        body: 'If a vertical gets defensive, redirect: "This is a diagnosis, not a judgment. What would help?"',
      },
      {
        heading: "Pattern-spotting",
        body: "Listen for 10+ verticals reporting low scores on the same dimension. That is a national issue, not a chapter issue. Flag it for NMT follow-up.",
      },
    ],
  },
  {
    id: "commitment",
    title: "Action commitment",
    duration: "15 min",
    stepId: 6,
    kind: "bullets",
    bullets: [
      "Use the printed Action Commitment Sheet.",
      "Pick your weakest dimension (the one you shared in deep-dive).",
      "Write exactly 3 action items. Not 2, not 5. Three.",
      "Every action item MUST have: what will be done, who owns it, when it will be done.",
      "Be specific. 'Improve comms' is NOT an action item. 'Publish monthly newsletter by 15th, owned by Co-Chair, starting May' IS an action item.",
    ],
  },
  {
    id: "closing",
    title: "Closing",
    duration: "5 min",
    stepId: 8,
    kind: "bullets",
    bullets: [
      "Reinforce the frame: this is a snapshot, not a scorecard.",
      "Accountability: commitments will be reviewed at the next NMT. You will be asked what moved.",
      'End on energy: "One Bharat. One Spirit."',
    ],
  },
];

// ---------- Q&A data ----------
const FAQ: { q: string; a: string }[] = [
  {
    q: "Who sees my scores?",
    a: "Scores appear on the live dashboard and are visible to all NMT members. Transparency drives honest conversation. But no one is being judged. Every vertical will have areas to improve.",
  },
  {
    q: "What if Chair and Co-Chair disagree on a score?",
    a: "Discuss briefly and settle on the score that feels most honest. If you genuinely disagree, go with the lower score — safer to diagnose a problem than to hide one.",
  },
  {
    q: "Will this be used against us?",
    a: "Absolutely not. This is a governance tool, not a performance appraisal. Low scores earn support, not criticism.",
  },
  {
    q: "We just started this year. Is it fair to assess us?",
    a: "Yes — this is the best time. Gives you a baseline. You'll see your growth at the next NMT.",
  },
  {
    q: "What happens after today?",
    a: "Your action commitments are documented. At the next NMT we revisit them — not to judge, but to learn.",
  },
];

// ---------- Helpers ----------
function formatMMSS(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const s = Math.abs(totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${sign}${m.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")}`;
}

// SVG arc timer — returns a <circle> stroke-dasharray arc
function ArcTimer({
  elapsed,
  total,
  isOver,
}: {
  elapsed: number;
  total: number;
  isOver: boolean;
}) {
  const R = 88;
  const CIRC = 2 * Math.PI * R;
  const pct = Math.min(elapsed / Math.max(total, 1), 1);
  const dash = CIRC * pct;
  const gap = CIRC - dash;

  return (
    <svg
      width="220"
      height="220"
      viewBox="0 0 220 220"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx="110"
        cy="110"
        r={R}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="6"
      />
      {/* Progress arc — starts at top (−90°) */}
      <circle
        cx="110"
        cy="110"
        r={R}
        fill="none"
        stroke={isOver ? "#ef4444" : "#c4a35a"}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={CIRC * 0.25}
        style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.3s ease" }}
      />
      {/* Dot at arc head */}
      {pct > 0.01 && (
        <circle
          cx={
            110 +
            R *
              Math.cos(
                2 * Math.PI * pct - Math.PI / 2
              )
          }
          cy={
            110 +
            R *
              Math.sin(
                2 * Math.PI * pct - Math.PI / 2
              )
          }
          r="4"
          fill={isOver ? "#ef4444" : "#c4a35a"}
        />
      )}
    </svg>
  );
}

// ---------- Page ----------
export default function FacilitatorPage() {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (!saved) {
      window.location.href = "/admin";
      return;
    }
    setAuthChecked(true);
  }, []);

  // Active section tab
  const [activeSection, setActiveSection] = useState<
    "checklist" | "runsheet" | "talking" | "qa"
  >("checklist");

  // Checklist state
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const totalChecklistItems = useMemo(
    () => CHECKLIST_GROUPS.reduce((sum, g) => sum + g.items.length, 0),
    []
  );
  const checkedCount = useMemo(
    () => Object.values(checked).filter(Boolean).length,
    [checked]
  );

  // Run-sheet state
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStartTime, setStepStartTime] = useState<number | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const pausedElapsedRef = useRef<number>(0);
  const pausedSessionElapsedRef = useRef<number>(0);

  useEffect(() => {
    if (!sessionStarted || isPaused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sessionStarted, isPaused]);

  const currentStep = RUN_STEPS[currentStepIndex];
  const nextStep = RUN_STEPS[currentStepIndex + 1] ?? null;

  const stepElapsedSec = sessionStarted
    ? isPaused
      ? Math.floor(pausedElapsedRef.current / 1000)
      : stepStartTime != null
      ? Math.floor((now - stepStartTime) / 1000)
      : 0
    : 0;

  const stepDurationSec = currentStep.durationMin * 60;
  const stepRemainingSec = stepDurationSec - stepElapsedSec;
  const isStepOver = stepRemainingSec < 0;

  const sessionElapsedSec = sessionStarted
    ? isPaused
      ? Math.floor(pausedSessionElapsedRef.current / 1000)
      : sessionStartTime != null
      ? Math.floor((now - sessionStartTime) / 1000)
      : 0
    : 0;

  const startSession = () => {
    const t = Date.now();
    setSessionStarted(true);
    setIsPaused(false);
    setCurrentStepIndex(0);
    setStepStartTime(t);
    setSessionStartTime(t);
    pausedElapsedRef.current = 0;
    pausedSessionElapsedRef.current = 0;
    setActiveSection("runsheet");
  };

  const advanceStep = () => {
    if (currentStepIndex >= RUN_STEPS.length - 1) return;
    const t = Date.now();
    setCurrentStepIndex((i) => i + 1);
    setStepStartTime(t);
    pausedElapsedRef.current = 0;
    if (isPaused) setIsPaused(false);
  };

  const pauseSession = () => {
    if (!sessionStarted || isPaused) return;
    if (stepStartTime != null)
      pausedElapsedRef.current = Date.now() - stepStartTime;
    if (sessionStartTime != null)
      pausedSessionElapsedRef.current = Date.now() - sessionStartTime;
    setIsPaused(true);
  };

  const resumeSession = () => {
    if (!sessionStarted || !isPaused) return;
    const t = Date.now();
    setStepStartTime(t - pausedElapsedRef.current);
    setSessionStartTime(t - pausedSessionElapsedRef.current);
    setIsPaused(false);
  };

  const resetSession = () => {
    setSessionStarted(false);
    setIsPaused(false);
    setCurrentStepIndex(0);
    setStepStartTime(null);
    setSessionStartTime(null);
    pausedElapsedRef.current = 0;
    pausedSessionElapsedRef.current = 0;
  };

  // Talking-point accordion — default open to match current step
  const [openSection, setOpenSection] = useState<string | null>("opening");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  if (!authChecked) {
    return (
      <div
        style={{ background: "#0c1425" }}
        className="min-h-screen flex items-center justify-center"
      >
        <p
          style={{ color: "rgba(196,163,90,0.4)" }}
          className="text-xs tracking-[0.3em] uppercase"
        >
          Verifying access…
        </p>
      </div>
    );
  }

  const navItems = [
    { id: "checklist" as const, label: "Pre-Flight", code: "01" },
    { id: "runsheet" as const, label: "Cockpit", code: "02" },
    { id: "talking" as const, label: "Script", code: "03" },
    { id: "qa" as const, label: "Ref Bay", code: "04" },
  ];

  return (
    <div
      style={{ background: "#0c1425", minHeight: "100vh" }}
      className="font-body"
    >
      {/* ── TOP HEADER BAR ─────────────────────────────────────── */}
      <header
        style={{
          background: "#060d1a",
          borderBottom: "1px solid rgba(196,163,90,0.12)",
        }}
        className="sticky top-0 z-50"
      >
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          {/* Left: identity */}
          <div className="flex items-center gap-4">
            <div
              style={{
                background: "#c4a35a",
                width: 6,
                height: 32,
                borderRadius: 2,
              }}
            />
            <div>
              <p
                style={{ color: "rgba(196,163,90,0.5)" }}
                className="text-[9px] tracking-[0.35em] uppercase leading-none"
              >
                NMT — April 17, 2026
              </p>
              <p
                style={{ color: "#fafaf8", fontFamily: "var(--font-display), Georgia, serif" }}
                className="text-sm leading-tight"
              >
                Facilitator Console — Arun Rathod
              </p>
            </div>
          </div>

          {/* Center: section tabs */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    background: isActive
                      ? "rgba(196,163,90,0.12)"
                      : "transparent",
                    borderColor: isActive
                      ? "rgba(196,163,90,0.4)"
                      : "transparent",
                    color: isActive ? "#c4a35a" : "rgba(250,250,248,0.4)",
                    border: "1px solid",
                  }}
                  className="h-8 px-4 rounded text-[11px] tracking-[0.15em] uppercase transition-all hover:text-[#c4a35a] flex items-center gap-2"
                >
                  <span
                    style={{
                      color: isActive
                        ? "rgba(196,163,90,0.6)"
                        : "rgba(250,250,248,0.2)",
                    }}
                    className="text-[9px]"
                  >
                    {item.code}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: session status + nav links */}
          <div className="flex items-center gap-4">
            {sessionStarted && (
              <div className="flex items-center gap-2">
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isPaused ? "#f59e0b" : "#22c55e",
                    boxShadow: isPaused
                      ? "0 0 6px #f59e0b"
                      : "0 0 6px #22c55e",
                  }}
                />
                <span
                  style={{ color: "rgba(250,250,248,0.5)" }}
                  className="text-[10px] tracking-wider uppercase"
                >
                  {isPaused ? "Paused" : "Live"}
                </span>
                <span
                  style={{
                    color: "#c4a35a",
                    fontFamily: "var(--font-display), Georgia, serif",
                  }}
                  className="text-sm tabular-nums"
                >
                  {formatMMSS(sessionElapsedSec)}
                </span>
              </div>
            )}
            <div
              style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }}
            />
            <div className="flex gap-1">
              {[
                { href: "/admin", label: "Dash" },
                { href: "/admin/live", label: "Live" },
                { href: "/admin/commitments", label: "Cmts" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{ color: "rgba(250,250,248,0.3)" }}
                  className="h-7 px-3 text-[10px] tracking-wider uppercase rounded hover:text-[#c4a35a] flex items-center transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────────── */}
      <main className="max-w-screen-2xl mx-auto">

        {/* ====================================================== */}
        {/* 01  PRE-FLIGHT CHECKLIST                               */}
        {/* ====================================================== */}
        {activeSection === "checklist" && (
          <div className="px-6 py-10 animate-fade-in">
            {/* Section heading */}
            <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
              <div>
                <p
                  style={{ color: "rgba(196,163,90,0.5)" }}
                  className="text-[9px] tracking-[0.4em] uppercase mb-2"
                >
                  01 / Pre-Flight
                </p>
                <h1
                  style={{
                    color: "#fafaf8",
                    fontFamily: "var(--font-display), Georgia, serif",
                  }}
                  className="text-5xl leading-none"
                >
                  Pre-Session
                  <br />
                  <span style={{ color: "#c4a35a" }}>Checklist</span>
                </h1>
              </div>
              {/* Progress ring */}
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke={
                        checkedCount === totalChecklistItems
                          ? "#22c55e"
                          : "#c4a35a"
                      }
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${
                        (checkedCount / totalChecklistItems) * 201
                      } 201`}
                      style={{ transition: "stroke-dasharray 0.4s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      style={{
                        color:
                          checkedCount === totalChecklistItems
                            ? "#22c55e"
                            : "#c4a35a",
                        fontFamily: "var(--font-display), Georgia, serif",
                      }}
                      className="text-xl leading-none"
                    >
                      {checkedCount}
                    </span>
                    <span
                      style={{ color: "rgba(250,250,248,0.3)" }}
                      className="text-[10px]"
                    >
                      /{totalChecklistItems}
                    </span>
                  </div>
                </div>
                <div>
                  <p
                    style={{ color: "rgba(250,250,248,0.3)" }}
                    className="text-[10px] tracking-[0.2em] uppercase"
                  >
                    Cleared
                  </p>
                  <p
                    style={{ color: "#fafaf8" }}
                    className="text-2xl font-display"
                  >
                    {checkedCount === totalChecklistItems ? (
                      <span style={{ color: "#22c55e" }}>Go</span>
                    ) : (
                      <span>
                        {totalChecklistItems - checkedCount}{" "}
                        <span style={{ color: "rgba(250,250,248,0.3)" }}>
                          remaining
                        </span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 3-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CHECKLIST_GROUPS.map((group, gi) => {
                const groupChecked = group.items.filter(
                  (it) => !!checked[it.id]
                ).length;
                const groupDone = groupChecked === group.items.length;
                return (
                  <div
                    key={group.code}
                    style={{
                      background: groupDone
                        ? "rgba(34,197,94,0.04)"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${
                        groupDone
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(255,255,255,0.07)"
                      }`,
                      borderRadius: 12,
                    }}
                    className={`p-6 animate-slide-up stagger-${gi + 1}`}
                  >
                    {/* Group header */}
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p
                          style={{ color: "rgba(196,163,90,0.5)" }}
                          className="text-[9px] tracking-[0.4em] uppercase mb-1"
                        >
                          {group.code}
                        </p>
                        <p
                          style={{ color: "#fafaf8" }}
                          className="text-base font-medium tracking-wide"
                        >
                          {group.title}
                        </p>
                      </div>
                      <div
                        style={{
                          background: groupDone
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(255,255,255,0.05)",
                          border: `1px solid ${
                            groupDone
                              ? "rgba(34,197,94,0.3)"
                              : "rgba(255,255,255,0.08)"
                          }`,
                          color: groupDone
                            ? "#22c55e"
                            : "rgba(250,250,248,0.4)",
                          borderRadius: 6,
                          padding: "2px 8px",
                        }}
                        className="text-[11px] tabular-nums"
                      >
                        {groupChecked}/{group.items.length}
                      </div>
                    </div>

                    {/* Items */}
                    <ul className="space-y-3">
                      {group.items.map((item) => {
                        const isChecked = !!checked[item.id];
                        return (
                          <li key={item.id}>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              {/* Custom checkbox */}
                              <div
                                onClick={() =>
                                  setChecked((prev) => ({
                                    ...prev,
                                    [item.id]: !prev[item.id],
                                  }))
                                }
                                style={{
                                  width: 18,
                                  height: 18,
                                  flexShrink: 0,
                                  borderRadius: 4,
                                  border: `1.5px solid ${
                                    isChecked
                                      ? "#22c55e"
                                      : "rgba(255,255,255,0.2)"
                                  }`,
                                  background: isChecked
                                    ? "rgba(34,197,94,0.2)"
                                    : "transparent",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.15s ease",
                                  cursor: "pointer",
                                }}
                              >
                                {isChecked && (
                                  <svg
                                    width="10"
                                    height="8"
                                    viewBox="0 0 10 8"
                                    fill="none"
                                  >
                                    <path
                                      d="M1 4L3.5 6.5L9 1"
                                      stroke="#22c55e"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isChecked}
                                onChange={(e) =>
                                  setChecked((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.checked,
                                  }))
                                }
                              />
                              <span
                                style={{
                                  color: isChecked
                                    ? "rgba(250,250,248,0.25)"
                                    : "rgba(250,250,248,0.75)",
                                  textDecoration: isChecked
                                    ? "line-through"
                                    : "none",
                                  transition: "all 0.15s ease",
                                }}
                                className="text-sm leading-snug"
                              >
                                {item.label}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* CTA at bottom */}
            <div className="mt-10 flex items-center justify-between flex-wrap gap-4">
              <p
                style={{ color: "rgba(250,250,248,0.3)" }}
                className="text-sm"
              >
                Complete all checks before starting the session.
              </p>
              <button
                onClick={() => {
                  setActiveSection("runsheet");
                }}
                style={{
                  background:
                    checkedCount === totalChecklistItems
                      ? "#c4a35a"
                      : "rgba(196,163,90,0.15)",
                  color:
                    checkedCount === totalChecklistItems
                      ? "#0c1425"
                      : "rgba(196,163,90,0.5)",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 28px",
                  fontFamily: "var(--font-display), Georgia, serif",
                  fontSize: 15,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Proceed to Cockpit →
              </button>
            </div>
          </div>
        )}

        {/* ====================================================== */}
        {/* 02  COCKPIT — RUN-SHEET                                */}
        {/* ====================================================== */}
        {activeSection === "runsheet" && (
          <div className="animate-fade-in">
            {!sessionStarted ? (
              /* ── PRE-START SCREEN ── */
              <div
                className="flex flex-col items-center justify-center px-6"
                style={{ minHeight: "calc(100vh - 56px)" }}
              >
                <p
                  style={{ color: "rgba(196,163,90,0.5)" }}
                  className="text-[9px] tracking-[0.4em] uppercase mb-6"
                >
                  02 / Cockpit
                </p>
                <h2
                  style={{
                    color: "#fafaf8",
                    fontFamily: "var(--font-display), Georgia, serif",
                  }}
                  className="text-6xl text-center leading-tight mb-4"
                >
                  Ready to
                  <br />
                  <span style={{ color: "#c4a35a" }}>Begin?</span>
                </h2>
                <p
                  style={{ color: "rgba(250,250,248,0.35)" }}
                  className="text-center text-base max-w-md mb-10"
                >
                  Starts the timer on Step 1 — Opening address.
                  <br />
                  You can pause or reset at any point.
                </p>

                {/* Run-sheet preview pills */}
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mb-12">
                  {RUN_STEPS.map((step) => (
                    <div
                      key={step.id}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 6,
                        padding: "4px 12px",
                      }}
                      className="flex items-center gap-2"
                    >
                      <span
                        style={{ color: "rgba(196,163,90,0.5)" }}
                        className="text-[10px] tabular-nums"
                      >
                        {step.offsetMin}:00
                      </span>
                      <span
                        style={{ color: "rgba(250,250,248,0.5)" }}
                        className="text-[11px]"
                      >
                        {step.activity}
                      </span>
                      <span
                        style={{ color: "rgba(196,163,90,0.4)" }}
                        className="text-[10px]"
                      >
                        {step.durationMin}m
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={startSession}
                  style={{
                    background: "#c4a35a",
                    color: "#0c1425",
                    border: "none",
                    borderRadius: 10,
                    padding: "16px 56px",
                    fontFamily: "var(--font-display), Georgia, serif",
                    fontSize: 20,
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                    boxShadow: "0 0 40px rgba(196,163,90,0.25)",
                    transition: "all 0.2s ease",
                  }}
                >
                  Start Session
                </button>

                <p
                  style={{ color: "rgba(250,250,248,0.2)" }}
                  className="text-[11px] tracking-[0.2em] uppercase mt-6"
                >
                  {TOTAL_SESSION_MIN} minutes total · 8 steps
                </p>
              </div>
            ) : (
              /* ── ACTIVE COCKPIT ── */
              <div
                style={{
                  height: "calc(100vh - 56px)",
                  display: "grid",
                  gridTemplateColumns: "220px 1fr 280px",
                  gridTemplateRows: "1fr",
                }}
              >
                {/* ── LEFT RAIL: timeline ── */}
                <div
                  style={{
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                    overflowY: "auto",
                    padding: "24px 0",
                  }}
                >
                  <p
                    style={{ color: "rgba(196,163,90,0.4)" }}
                    className="text-[9px] tracking-[0.35em] uppercase px-5 mb-4"
                  >
                    Run-sheet
                  </p>
                  <ol>
                    {RUN_STEPS.map((step, idx) => {
                      const isActive = idx === currentStepIndex;
                      const isDone = idx < currentStepIndex;
                      return (
                        <li
                          key={step.id}
                          style={{
                            background: isActive
                              ? "rgba(196,163,90,0.08)"
                              : "transparent",
                            borderLeft: `2px solid ${
                              isActive
                                ? "#c4a35a"
                                : isDone
                                ? "rgba(34,197,94,0.4)"
                                : "transparent"
                            }`,
                            padding: "10px 20px 10px 18px",
                            transition: "all 0.2s ease",
                          }}
                          className="flex items-start gap-3"
                        >
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              flexShrink: 0,
                              borderRadius: "50%",
                              background: isDone
                                ? "rgba(34,197,94,0.2)"
                                : isActive
                                ? "#c4a35a"
                                : "rgba(255,255,255,0.06)",
                              border: `1px solid ${
                                isDone
                                  ? "rgba(34,197,94,0.4)"
                                  : isActive
                                  ? "#c4a35a"
                                  : "rgba(255,255,255,0.1)"
                              }`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginTop: 2,
                            }}
                          >
                            {isDone ? (
                              <svg
                                width="10"
                                height="8"
                                viewBox="0 0 10 8"
                                fill="none"
                              >
                                <path
                                  d="M1 4L3.5 6.5L9 1"
                                  stroke="#22c55e"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <span
                                style={{
                                  color: isActive
                                    ? "#0c1425"
                                    : "rgba(250,250,248,0.3)",
                                  fontSize: 10,
                                  fontWeight: 600,
                                }}
                              >
                                {step.id}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              style={{
                                color: isActive
                                  ? "#fafaf8"
                                  : isDone
                                  ? "rgba(250,250,248,0.3)"
                                  : "rgba(250,250,248,0.5)",
                                fontSize: 12,
                                fontWeight: isActive ? 500 : 400,
                                lineHeight: 1.3,
                              }}
                            >
                              {step.activity}
                            </p>
                            <p
                              style={{
                                color: isActive
                                  ? "rgba(196,163,90,0.7)"
                                  : "rgba(250,250,248,0.2)",
                                fontSize: 10,
                                marginTop: 2,
                              }}
                            >
                              {step.offsetMin}:00 · {step.durationMin}m
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  {/* Session elapsed at bottom of rail */}
                  <div
                    style={{
                      padding: "16px 20px",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      marginTop: 16,
                    }}
                  >
                    <p
                      style={{ color: "rgba(250,250,248,0.25)" }}
                      className="text-[9px] tracking-[0.3em] uppercase mb-1"
                    >
                      Total elapsed
                    </p>
                    <p
                      style={{
                        color: "rgba(250,250,248,0.7)",
                        fontFamily: "var(--font-display), Georgia, serif",
                      }}
                      className="text-xl tabular-nums"
                    >
                      {formatMMSS(sessionElapsedSec)}
                      <span
                        style={{ color: "rgba(250,250,248,0.2)" }}
                        className="text-sm"
                      >
                        {" "}
                        / {TOTAL_SESSION_MIN}:00
                      </span>
                    </p>
                  </div>
                </div>

                {/* ── MAIN STAGE: timer hero ── */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px 48px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Ambient glow */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 400,
                      height: 400,
                      borderRadius: "50%",
                      background: isStepOver
                        ? "radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(196,163,90,0.06) 0%, transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />

                  {/* Step label */}
                  <div className="flex items-center gap-3 mb-8">
                    <span
                      style={{ color: "rgba(196,163,90,0.5)" }}
                      className="text-[9px] tracking-[0.4em] uppercase"
                    >
                      Step {currentStep.id} of {RUN_STEPS.length}
                    </span>
                    {isPaused && (
                      <span
                        style={{
                          background: "rgba(245,158,11,0.15)",
                          border: "1px solid rgba(245,158,11,0.3)",
                          color: "#f59e0b",
                          borderRadius: 4,
                          padding: "1px 8px",
                          fontSize: 9,
                          letterSpacing: "0.2em",
                        }}
                      >
                        PAUSED
                      </span>
                    )}
                  </div>

                  {/* Activity title */}
                  <h2
                    style={{
                      color: "#fafaf8",
                      fontFamily: "var(--font-display), Georgia, serif",
                      textAlign: "center",
                      lineHeight: 1.1,
                    }}
                    className="text-5xl mb-3"
                  >
                    {currentStep.activity}
                  </h2>
                  <p
                    style={{ color: "rgba(250,250,248,0.45)", textAlign: "center" }}
                    className="text-base max-w-lg mb-12"
                  >
                    {currentStep.detail}
                  </p>

                  {/* Arc timer */}
                  <div
                    style={{
                      position: "relative",
                      width: 220,
                      height: 220,
                      flexShrink: 0,
                    }}
                  >
                    <ArcTimer
                      elapsed={stepElapsedSec}
                      total={stepDurationSec}
                      isOver={isStepOver}
                    />
                    {/* Center text */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          color: "rgba(250,250,248,0.3)",
                          fontSize: 9,
                          letterSpacing: "0.3em",
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        Remaining
                      </span>
                      <span
                        style={{
                          color: isStepOver ? "#ef4444" : "#c4a35a",
                          fontFamily: "var(--font-display), Georgia, serif",
                          fontSize: 40,
                          lineHeight: 1,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatMMSS(stepRemainingSec)}
                      </span>
                      <span
                        style={{
                          color: "rgba(250,250,248,0.2)",
                          fontSize: 11,
                          marginTop: 6,
                        }}
                      >
                        {formatMMSS(stepElapsedSec)} elapsed
                      </span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap gap-3 justify-center mt-12">
                    {nextStep && (
                      <button
                        onClick={advanceStep}
                        style={{
                          background: "#c4a35a",
                          color: "#0c1425",
                          border: "none",
                          borderRadius: 8,
                          padding: "10px 28px",
                          fontFamily: "var(--font-display), Georgia, serif",
                          fontSize: 14,
                          letterSpacing: "0.05em",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        Next Step →
                      </button>
                    )}
                    {!isPaused ? (
                      <button
                        onClick={pauseSession}
                        style={{
                          background: "transparent",
                          color: "rgba(250,250,248,0.6)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          padding: "10px 24px",
                          fontSize: 13,
                          letterSpacing: "0.05em",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={resumeSession}
                        style={{
                          background: "rgba(196,163,90,0.15)",
                          color: "#c4a35a",
                          border: "1px solid rgba(196,163,90,0.3)",
                          borderRadius: 8,
                          padding: "10px 24px",
                          fontSize: 13,
                          letterSpacing: "0.05em",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={resetSession}
                      style={{
                        background: "transparent",
                        color: "rgba(239,68,68,0.5)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        borderRadius: 8,
                        padding: "10px 24px",
                        fontSize: 13,
                        letterSpacing: "0.05em",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* ── RIGHT PANEL: next + session bar ── */}
                <div
                  style={{
                    borderLeft: "1px solid rgba(255,255,255,0.06)",
                    padding: "24px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    overflowY: "auto",
                  }}
                >
                  <p
                    style={{ color: "rgba(196,163,90,0.4)" }}
                    className="text-[9px] tracking-[0.35em] uppercase"
                  >
                    Up next
                  </p>

                  {nextStep ? (
                    <div
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 10,
                        padding: "16px",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          style={{ color: "rgba(196,163,90,0.5)" }}
                          className="text-[10px] tracking-wider"
                        >
                          Step {nextStep.id}
                        </span>
                        <span
                          style={{
                            color: "rgba(250,250,248,0.25)",
                            fontSize: 10,
                          }}
                        >
                          {nextStep.durationMin} min
                        </span>
                      </div>
                      <p
                        style={{
                          color: "#fafaf8",
                          fontFamily: "var(--font-display), Georgia, serif",
                          fontSize: 16,
                          lineHeight: 1.3,
                          marginBottom: 6,
                        }}
                      >
                        {nextStep.activity}
                      </p>
                      <p
                        style={{ color: "rgba(250,250,248,0.4)", fontSize: 12 }}
                      >
                        {nextStep.detail}
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "rgba(34,197,94,0.06)",
                        border: "1px solid rgba(34,197,94,0.15)",
                        borderRadius: 10,
                        padding: "16px",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{ color: "#22c55e", fontSize: 13 }}
                        className="tracking-wide"
                      >
                        Final step
                      </p>
                      <p
                        style={{ color: "rgba(250,250,248,0.3)", fontSize: 11 }}
                      >
                        One Bharat. One Spirit.
                      </p>
                    </div>
                  )}

                  {/* Divider */}
                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.06)",
                    }}
                  />

                  {/* Session timeline bar */}
                  <div>
                    <p
                      style={{ color: "rgba(250,250,248,0.25)" }}
                      className="text-[9px] tracking-[0.3em] uppercase mb-3"
                    >
                      Session progress
                    </p>
                    {/* Mini step dots */}
                    <div className="space-y-2">
                      {RUN_STEPS.map((step, idx) => {
                        const isActive = idx === currentStepIndex;
                        const isDone = idx < currentStepIndex;
                        const pctStart = step.offsetMin / TOTAL_SESSION_MIN;
                        const pctWidth =
                          step.durationMin / TOTAL_SESSION_MIN;
                        return (
                          <div key={step.id} className="flex items-center gap-2">
                            <div
                              style={{
                                width: "100%",
                                height: 4,
                                background: "rgba(255,255,255,0.05)",
                                borderRadius: 2,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  marginLeft: `${pctStart * 100}%`,
                                  width: `${pctWidth * 100}%`,
                                  height: "100%",
                                  background: isDone
                                    ? "rgba(34,197,94,0.5)"
                                    : isActive
                                    ? "#c4a35a"
                                    : "rgba(255,255,255,0.08)",
                                  borderRadius: 2,
                                  transition: "background 0.3s ease",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Progress summary */}
                    <div className="flex items-center justify-between mt-3">
                      <span
                        style={{ color: "rgba(250,250,248,0.3)" }}
                        className="text-[10px]"
                      >
                        {formatMMSS(sessionElapsedSec)}
                      </span>
                      <span
                        style={{ color: "rgba(250,250,248,0.3)" }}
                        className="text-[10px]"
                      >
                        {TOTAL_SESSION_MIN}:00
                      </span>
                    </div>
                  </div>

                  {/* Script shortcut */}
                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.06)",
                    }}
                  />
                  <button
                    onClick={() => setActiveSection("talking")}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(196,163,90,0.2)",
                      color: "rgba(196,163,90,0.6)",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      width: "100%",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Open Script for this step →
                  </button>
                  <button
                    onClick={() => setActiveSection("qa")}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(250,250,248,0.3)",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      width: "100%",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Q&A Reference →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================== */}
        {/* 03  SCRIPT — TALKING POINTS                            */}
        {/* ====================================================== */}
        {activeSection === "talking" && (
          <div className="px-6 py-10 animate-fade-in">
            <div className="mb-10">
              <p
                style={{ color: "rgba(196,163,90,0.5)" }}
                className="text-[9px] tracking-[0.4em] uppercase mb-2"
              >
                03 / Script
              </p>
              <h1
                style={{
                  color: "#fafaf8",
                  fontFamily: "var(--font-display), Georgia, serif",
                }}
                className="text-5xl leading-none mb-3"
              >
                Talking <span style={{ color: "#c4a35a" }}>Points</span>
              </h1>
              <p style={{ color: "rgba(250,250,248,0.35)" }} className="text-sm">
                From Rohan&apos;s Facilitator Playbook. Click any phase to expand.
              </p>
            </div>

            <div className="max-w-4xl space-y-2">
              {TALKING_POINTS.map((section, si) => {
                const isOpen = openSection === section.id;
                const isCurrentStep =
                  sessionStarted &&
                  section.stepId === currentStep.id;
                return (
                  <div
                    key={section.id}
                    style={{
                      background: isCurrentStep
                        ? "rgba(196,163,90,0.06)"
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${
                        isCurrentStep
                          ? "rgba(196,163,90,0.25)"
                          : isOpen
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(255,255,255,0.06)"
                      }`,
                      borderRadius: 10,
                      overflow: "hidden",
                      transition: "all 0.2s ease",
                    }}
                    className={`animate-slide-up stagger-${si + 1}`}
                  >
                    <button
                      onClick={() =>
                        setOpenSection(isOpen ? null : section.id)
                      }
                      className="w-full flex items-center justify-between gap-4 text-left"
                      style={{ padding: "16px 20px" }}
                    >
                      <div className="flex items-center gap-4">
                        {isCurrentStep && (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#c4a35a",
                              boxShadow: "0 0 8px rgba(196,163,90,0.6)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div>
                          <p
                            style={{ color: "rgba(196,163,90,0.5)" }}
                            className="text-[9px] tracking-[0.3em] uppercase mb-1"
                          >
                            {section.duration} · Step {section.stepId}
                          </p>
                          <p
                            style={{
                              color: "#fafaf8",
                              fontFamily: "var(--font-display), Georgia, serif",
                              fontSize: 18,
                            }}
                          >
                            {section.title}
                          </p>
                        </div>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{
                          flexShrink: 0,
                          transform: isOpen ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s ease",
                          color: "#c4a35a",
                        }}
                      >
                        <path
                          d="M2.5 5L7 9.5L11.5 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          padding: "0 20px 20px",
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div style={{ height: 16 }} />

                        {section.kind === "bullets" && section.bullets && (
                          <ol className="space-y-3">
                            {section.bullets.map((b, i) => (
                              <li key={i} className="flex gap-4">
                                <span
                                  style={{
                                    color: "rgba(196,163,90,0.5)",
                                    fontFamily:
                                      "var(--font-display), Georgia, serif",
                                    fontSize: 13,
                                    flexShrink: 0,
                                    marginTop: 1,
                                    minWidth: 20,
                                  }}
                                >
                                  {i + 1}.
                                </span>
                                <p
                                  style={{
                                    color: "rgba(250,250,248,0.75)",
                                    fontSize: 14,
                                    lineHeight: 1.65,
                                  }}
                                >
                                  {b}
                                </p>
                              </li>
                            ))}
                          </ol>
                        )}

                        {section.kind === "dodont" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p
                                style={{
                                  color: "rgba(34,197,94,0.7)",
                                  fontSize: 10,
                                  letterSpacing: "0.3em",
                                  textTransform: "uppercase",
                                  marginBottom: 12,
                                }}
                              >
                                Do
                              </p>
                              <ul className="space-y-3">
                                {section.dos?.map((d, i) => (
                                  <li key={i} className="flex gap-3">
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 14 14"
                                      fill="none"
                                      style={{ flexShrink: 0, marginTop: 3 }}
                                    >
                                      <circle
                                        cx="7"
                                        cy="7"
                                        r="6"
                                        stroke="rgba(34,197,94,0.4)"
                                        strokeWidth="1"
                                      />
                                      <path
                                        d="M4 7L6 9L10 5"
                                        stroke="#22c55e"
                                        strokeWidth="1.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                    <p
                                      style={{
                                        color: "rgba(250,250,248,0.7)",
                                        fontSize: 13,
                                        lineHeight: 1.6,
                                      }}
                                    >
                                      {d}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p
                                style={{
                                  color: "rgba(239,68,68,0.7)",
                                  fontSize: 10,
                                  letterSpacing: "0.3em",
                                  textTransform: "uppercase",
                                  marginBottom: 12,
                                }}
                              >
                                Don&apos;t
                              </p>
                              <ul className="space-y-3">
                                {section.donts?.map((d, i) => (
                                  <li key={i} className="flex gap-3">
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 14 14"
                                      fill="none"
                                      style={{ flexShrink: 0, marginTop: 3 }}
                                    >
                                      <circle
                                        cx="7"
                                        cy="7"
                                        r="6"
                                        stroke="rgba(239,68,68,0.4)"
                                        strokeWidth="1"
                                      />
                                      <path
                                        d="M5 5L9 9M9 5L5 9"
                                        stroke="#ef4444"
                                        strokeWidth="1.2"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                    <p
                                      style={{
                                        color: "rgba(250,250,248,0.7)",
                                        fontSize: 13,
                                        lineHeight: 1.6,
                                      }}
                                    >
                                      {d}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {section.kind === "flow" && section.flow && (
                          <div className="space-y-5">
                            {section.flow.map((f, i) => (
                              <div
                                key={i}
                                className="flex gap-4"
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: "50%",
                                      background: "rgba(196,163,90,0.12)",
                                      border:
                                        "1px solid rgba(196,163,90,0.25)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "#c4a35a",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {i + 1}
                                  </div>
                                  {i < section.flow!.length - 1 && (
                                    <div
                                      style={{
                                        width: 1,
                                        flex: 1,
                                        minHeight: 20,
                                        background:
                                          "rgba(196,163,90,0.15)",
                                        marginTop: 4,
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="pb-1">
                                  <p
                                    style={{
                                      color: "#c4a35a",
                                      fontSize: 10,
                                      letterSpacing: "0.25em",
                                      textTransform: "uppercase",
                                      marginBottom: 4,
                                    }}
                                  >
                                    {f.heading}
                                  </p>
                                  <p
                                    style={{
                                      color: "rgba(250,250,248,0.7)",
                                      fontSize: 13,
                                      lineHeight: 1.65,
                                    }}
                                  >
                                    {f.body}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================== */}
        {/* 04  Q&A REFERENCE BAY                                  */}
        {/* ====================================================== */}
        {activeSection === "qa" && (
          <div className="px-6 py-10 animate-fade-in">
            <div className="mb-10">
              <p
                style={{ color: "rgba(196,163,90,0.5)" }}
                className="text-[9px] tracking-[0.4em] uppercase mb-2"
              >
                04 / Reference Bay
              </p>
              <h1
                style={{
                  color: "#fafaf8",
                  fontFamily: "var(--font-display), Georgia, serif",
                }}
                className="text-5xl leading-none mb-3"
              >
                Anticipated <span style={{ color: "#c4a35a" }}>Q&amp;A</span>
              </h1>
              <p style={{ color: "rgba(250,250,248,0.35)" }} className="text-sm">
                If a participant asks, here is the tested answer.
              </p>
            </div>

            <div className="max-w-4xl space-y-2">
              {FAQ.map((item, i) => {
                const isOpen = openFaq === i;
                return (
                  <div
                    key={i}
                    style={{
                      background: isOpen
                        ? "rgba(196,163,90,0.05)"
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${
                        isOpen
                          ? "rgba(196,163,90,0.2)"
                          : "rgba(255,255,255,0.06)"
                      }`,
                      borderRadius: 10,
                      overflow: "hidden",
                      transition: "all 0.2s ease",
                    }}
                    className={`animate-slide-up stagger-${i + 1}`}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-start justify-between gap-4 text-left"
                      style={{ padding: "18px 20px" }}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          style={{
                            color: "#c4a35a",
                            fontFamily: "var(--font-display), Georgia, serif",
                            fontSize: 18,
                            lineHeight: 1.3,
                            flexShrink: 0,
                          }}
                        >
                          Q.
                        </span>
                        <p
                          style={{
                            color: "#fafaf8",
                            fontFamily: "var(--font-display), Georgia, serif",
                            fontSize: 17,
                            lineHeight: 1.35,
                          }}
                        >
                          {item.q}
                        </p>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{
                          flexShrink: 0,
                          marginTop: 4,
                          transform: isOpen ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s ease",
                          color: "#c4a35a",
                        }}
                      >
                        <path
                          d="M2.5 5L7 9.5L11.5 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          padding: "0 20px 20px",
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div style={{ height: 14 }} />
                        <div className="flex gap-4">
                          <span
                            style={{
                              color: "rgba(196,163,90,0.5)",
                              fontFamily: "var(--font-display), Georgia, serif",
                              fontSize: 16,
                              lineHeight: 1.5,
                              flexShrink: 0,
                            }}
                          >
                            A.
                          </span>
                          <p
                            style={{
                              color: "rgba(250,250,248,0.7)",
                              fontSize: 14,
                              lineHeight: 1.7,
                            }}
                          >
                            {item.a}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)" }}
              className="text-center"
            >
              <p
                style={{
                  color: "rgba(196,163,90,0.3)",
                  fontFamily: "var(--font-display), Georgia, serif",
                  fontSize: 13,
                  letterSpacing: "0.2em",
                }}
              >
                One Bharat. One Spirit.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
