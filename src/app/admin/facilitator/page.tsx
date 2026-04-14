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
    detail:
      "Each vertical's Chair + Co-Chair take the 35-Q test jointly.",
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
  items: ChecklistItem[];
}

const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    title: "Technical setup",
    items: [
      { id: "t1", label: "Assessment app tested" },
      { id: "t2", label: "Admin dashboard in presentation mode" },
      { id: "t3", label: "Link ready (QR or short URL)" },
      { id: "t4", label: "Paper backup printed" },
    ],
  },
  {
    title: "Room setup",
    items: [
      { id: "r1", label: "Chair & Co-Chair seated together" },
      { id: "r2", label: "One device per vertical" },
      { id: "r3", label: "Projector connected" },
      { id: "r4", label: "Printed Action Commitment Sheets distributed" },
    ],
  },
  {
    title: "Facilitator preparation",
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

  // Checklist state (component-level, not persisted)
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
  // Accumulated elapsed time in current step when paused (so resume is smooth)
  const pausedElapsedRef = useRef<number>(0);
  // Accumulated session elapsed time when paused
  const pausedSessionElapsedRef = useRef<number>(0);

  // Tick every second while running and not paused
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
  };

  const advanceStep = () => {
    if (currentStepIndex >= RUN_STEPS.length - 1) return;
    const t = Date.now();
    setCurrentStepIndex((i) => i + 1);
    setStepStartTime(t);
    pausedElapsedRef.current = 0;
    if (isPaused) {
      setIsPaused(false);
    }
  };

  const pauseSession = () => {
    if (!sessionStarted || isPaused) return;
    if (stepStartTime != null) {
      pausedElapsedRef.current = Date.now() - stepStartTime;
    }
    if (sessionStartTime != null) {
      pausedSessionElapsedRef.current = Date.now() - sessionStartTime;
    }
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

  // Talking-point accordion state
  const [openSection, setOpenSection] = useState<string | null>("opening");

  // Q&A accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <p className="text-navy/40 text-sm">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <div className="bg-navy px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold/50">
              NMT Admin
            </p>
            <h1 className="font-display text-2xl text-white">
              Facilitator Console
            </h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            <a
              href="/admin"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Dashboard
            </a>
            <a
              href="/admin/live"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Live
            </a>
            <a
              href="/admin/commitments"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Commitments
            </a>
            <a
              href="/admin/manage"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Manage
            </a>
            <span className="h-9 px-4 rounded-lg border border-gold/60 text-gold text-xs tracking-wider uppercase inline-flex items-center">
              Facilitator
            </span>
            <a
              href="/"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Back to Test
            </a>
          </div>
        </div>
      </div>

      {/* Sticky sub-nav */}
      <div className="sticky top-0 z-20 bg-parchment/95 backdrop-blur border-b border-navy/10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap gap-5 text-[11px] tracking-[0.2em] uppercase">
          <a href="#checklist" className="text-navy/60 hover:text-gold">
            Checklist
          </a>
          <a href="#runsheet" className="text-navy/60 hover:text-gold">
            Run-Sheet
          </a>
          <a href="#talking" className="text-navy/60 hover:text-gold">
            Talking Points
          </a>
          <a href="#qa" className="text-navy/60 hover:text-gold">
            Q&amp;A
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-16">
        {/* ==================== 1. CHECKLIST ==================== */}
        <section id="checklist" className="scroll-mt-20">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-gold/80">
                Section 1
              </p>
              <h2 className="font-display text-3xl text-navy leading-tight">
                Pre-Session Checklist
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40">
                Ready
              </p>
              <p className="font-display text-2xl text-navy tabular-nums">
                <span className="text-gold">{checkedCount}</span>
                <span className="text-navy/30"> of {totalChecklistItems}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CHECKLIST_GROUPS.map((group) => (
              <div
                key={group.title}
                className="bg-white rounded-lg border border-navy/10 p-5"
              >
                <p className="text-[10px] tracking-[0.2em] uppercase text-gold/70 mb-3">
                  {group.title}
                </p>
                <ul className="space-y-2">
                  {group.items.map((item) => {
                    const isChecked = !!checked[item.id];
                    return (
                      <li key={item.id}>
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-[#c4a35a] cursor-pointer"
                            checked={isChecked}
                            onChange={(e) =>
                              setChecked((prev) => ({
                                ...prev,
                                [item.id]: e.target.checked,
                              }))
                            }
                          />
                          <span
                            className={`text-sm leading-snug ${
                              isChecked
                                ? "text-navy/40 line-through"
                                : "text-navy/85 group-hover:text-navy"
                            }`}
                          >
                            {item.label}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== 2. RUN-SHEET ==================== */}
        <section id="runsheet" className="scroll-mt-20">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-gold/80">
                Section 2
              </p>
              <h2 className="font-display text-3xl text-navy leading-tight">
                Run-Sheet — 75 to 85 min
              </h2>
            </div>
            {sessionStarted && (
              <div className="text-right">
                <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40">
                  Session elapsed
                </p>
                <p className="font-display text-2xl text-navy tabular-nums">
                  {formatMMSS(sessionElapsedSec)}
                  <span className="text-navy/30 text-sm">
                    {" "}
                    / {TOTAL_SESSION_MIN}:00
                  </span>
                </p>
              </div>
            )}
          </div>

          {!sessionStarted ? (
            <div className="bg-navy rounded-xl p-10 text-center">
              <p className="text-[10px] tracking-[0.3em] uppercase text-gold/60 mb-3">
                Ready when you are
              </p>
              <h3 className="font-display text-4xl text-white mb-6">
                Begin the session
              </h3>
              <p className="text-white/50 text-sm max-w-md mx-auto mb-8">
                Starts the timer on Step 1 — Opening address. You can pause or
                reset at any point.
              </p>
              <button
                onClick={startSession}
                className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-navy font-display text-lg px-8 py-3 rounded-lg tracking-wide transition-colors"
              >
                Start Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
              {/* Timeline */}
              <ol className="bg-white rounded-lg border border-navy/10 p-4 space-y-1 h-fit">
                {RUN_STEPS.map((step, idx) => {
                  const isActive = idx === currentStepIndex;
                  const isDone = idx < currentStepIndex;
                  return (
                    <li
                      key={step.id}
                      className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm ${
                        isActive
                          ? "bg-gold/15 border border-gold/40"
                          : "border border-transparent"
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full text-[11px] flex items-center justify-center font-semibold ${
                          isDone
                            ? "bg-navy text-gold"
                            : isActive
                            ? "bg-gold text-navy"
                            : "bg-navy/5 text-navy/40"
                        }`}
                      >
                        {isDone ? "✓" : step.id}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`leading-tight font-medium ${
                            isActive
                              ? "text-navy"
                              : isDone
                              ? "text-navy/45"
                              : "text-navy/55"
                          }`}
                        >
                          {step.activity}
                        </p>
                        <p
                          className={`text-[10px] tracking-wider uppercase ${
                            isActive ? "text-gold" : "text-navy/35"
                          }`}
                        >
                          {step.offsetMin}:00 · {step.durationMin} min
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Active step display */}
              <div className="space-y-4">
                <div
                  className="bg-white rounded-xl border border-gold/40 p-8 shadow-[0_0_0_4px_rgba(196,163,90,0.10)]"
                  style={{ minHeight: 320 }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-gold">
                      Step {currentStep.id} of {RUN_STEPS.length}
                      {isPaused ? " · Paused" : ""}
                    </p>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40">
                      Scheduled {currentStep.offsetMin}:00 ·{" "}
                      {currentStep.durationMin} min
                    </p>
                  </div>

                  <h3 className="font-display text-4xl text-navy leading-tight mb-3">
                    {currentStep.activity}
                  </h3>
                  <p className="text-navy/70 text-base leading-relaxed mb-6">
                    {currentStep.detail}
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-5 border-t border-navy/10">
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40">
                        Elapsed in step
                      </p>
                      <p className="font-display text-3xl text-navy tabular-nums">
                        {formatMMSS(stepElapsedSec)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40">
                        Remaining
                      </p>
                      <p
                        className={`font-display text-3xl tabular-nums ${
                          stepRemainingSec < 0 ? "text-red-600" : "text-gold"
                        }`}
                      >
                        {formatMMSS(stepRemainingSec)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next up */}
                {nextStep && (
                  <div className="bg-white rounded-lg border border-navy/10 p-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-navy/40 mb-1">
                      Next up · {nextStep.durationMin} min
                    </p>
                    <p className="font-display text-lg text-navy leading-tight">
                      {nextStep.activity}
                    </p>
                    <p className="text-navy/55 text-sm mt-1 leading-snug">
                      {nextStep.detail}
                    </p>
                  </div>
                )}

                {/* Controls */}
                <div className="flex flex-wrap gap-3">
                  {nextStep && (
                    <button
                      onClick={advanceStep}
                      className="bg-navy hover:bg-navy-light text-white font-display text-sm px-5 py-2.5 rounded-lg tracking-wide transition-colors"
                    >
                      Next Step →
                    </button>
                  )}
                  {!isPaused ? (
                    <button
                      onClick={pauseSession}
                      className="border border-navy/20 text-navy/80 hover:border-gold hover:text-gold text-sm px-5 py-2.5 rounded-lg tracking-wide transition-colors"
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resumeSession}
                      className="bg-gold hover:bg-gold-light text-navy font-display text-sm px-5 py-2.5 rounded-lg tracking-wide transition-colors"
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={resetSession}
                    className="border border-red-300 text-red-700 hover:bg-red-50 text-sm px-5 py-2.5 rounded-lg tracking-wide transition-colors"
                  >
                    Reset Session
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ==================== 3. TALKING POINTS ==================== */}
        <section id="talking" className="scroll-mt-20">
          <div className="mb-6">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold/80">
              Section 3
            </p>
            <h2 className="font-display text-3xl text-navy leading-tight">
              Talking Points
            </h2>
            <p className="text-navy/55 text-sm mt-2 max-w-2xl">
              From Rohan&apos;s Facilitator Playbook. Click any phase to expand.
            </p>
          </div>

          <div className="space-y-3">
            {TALKING_POINTS.map((section) => {
              const isOpen = openSection === section.id;
              return (
                <div
                  key={section.id}
                  className="bg-white rounded-lg border border-navy/10 overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setOpenSection(isOpen ? null : section.id)
                    }
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-navy/[0.02]"
                  >
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-gold/70">
                        {section.duration}
                      </p>
                      <p className="font-display text-lg text-navy leading-tight">
                        {section.title}
                      </p>
                    </div>
                    <span
                      className={`text-gold text-lg transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      ⌄
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-navy/5">
                      {section.kind === "bullets" && section.bullets && (
                        <ol className="list-decimal list-inside space-y-2 text-navy/80 text-sm leading-relaxed marker:text-gold marker:font-semibold">
                          {section.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ol>
                      )}
                      {section.kind === "dodont" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <p className="text-[10px] tracking-[0.2em] uppercase text-emerald-700 mb-2">
                              Do
                            </p>
                            <ul className="space-y-2 text-navy/80 text-sm leading-relaxed">
                              {section.dos?.map((d, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-emerald-600">✓</span>
                                  <span>{d}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-[10px] tracking-[0.2em] uppercase text-red-700 mb-2">
                              Don&apos;t
                            </p>
                            <ul className="space-y-2 text-navy/80 text-sm leading-relaxed">
                              {section.donts?.map((d, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-red-600">✕</span>
                                  <span>{d}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      {section.kind === "flow" && section.flow && (
                        <div className="space-y-4">
                          {section.flow.map((f, i) => (
                            <div key={i}>
                              <p className="text-[10px] tracking-[0.2em] uppercase text-gold/80 mb-1">
                                {f.heading}
                              </p>
                              <p className="text-navy/80 text-sm leading-relaxed">
                                {f.body}
                              </p>
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
        </section>

        {/* ==================== 4. Q&A ==================== */}
        <section id="qa" className="scroll-mt-20">
          <div className="mb-6">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold/80">
              Section 4
            </p>
            <h2 className="font-display text-3xl text-navy leading-tight">
              Anticipated Q&amp;A
            </h2>
            <p className="text-navy/55 text-sm mt-2 max-w-2xl">
              If a participant asks, here is the tested answer.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-navy/10 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-navy/[0.02]"
                  >
                    <p className="font-display text-base text-navy leading-snug">
                      <span className="text-gold mr-2">Q.</span>
                      {item.q}
                    </p>
                    <span
                      className={`text-gold text-lg transition-transform flex-shrink-0 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      ⌄
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-navy/5">
                      <p className="text-navy/80 text-sm leading-relaxed">
                        <span className="text-gold mr-2 font-semibold">A.</span>
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="pt-8 pb-4 text-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-navy/30">
            One Bharat. One Spirit.
          </p>
        </div>
      </div>
    </div>
  );
}
