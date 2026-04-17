"use client";

import { useState, useEffect, useCallback, useMemo, startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getNextMeeting,
  setNextMeeting,
  DEFAULT_NEXT_MEETING,
  type NextMeeting,
} from "@/lib/next-meeting";

/* ============================================================================
 * Types
 * ==========================================================================*/

type TabKey =
  | "verticals"
  | "regions"
  | "dimensions"
  | "questions"
  | "assessments"
  | "commitments"
  | "settings";

interface VerticalRow {
  id: string;
  name: string;
  category: string;
  sort_order: number;
  archived: boolean;
}

interface RegionRow {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  archived: boolean;
}

interface DimensionRow {
  id: string;
  dim_index: number;
  name: string;
  short_name: string;
  sort_order: number;
  archived: boolean;
}

interface QuestionRow {
  id: string;
  dimension_index: number;
  question_number: number;
  text: string;
  selected: boolean;
  archived: boolean;
}

interface AssessmentRow {
  id: string;
  vertical_name: string;
  region: string | null;
  respondent_name: string | null;
  total_score: number;
  percentage: number;
  maturity_level: number;
  created_at: string;
}

interface CommitmentRow {
  id: string;
  vertical_name: string;
  focus_dimension: string;
  current_level: number;
  target_level: number;
  action_items: string[];
  target_meeting: string | null;
  status: string;
  created_at: string;
}

type FetchResult<T> = { data?: T; error?: string };

/* ============================================================================
 * Module-scoped fetch helpers (all with 10s AbortController timeout)
 * ==========================================================================*/

async function fetchEntities<T>(
  endpoint: string,
  pw: string
): Promise<FetchResult<T[]>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(endpoint, {
      headers: { "x-admin-password": pw },
      signal: controller.signal,
    });
    if (!res.ok) return { error: `Failed to load: ${res.status} ${res.statusText}` };
    const data = await res.json();
    return { data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Request timed out. Please retry." };
    }
    return { error: "Request failed. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

async function createEntity(
  endpoint: string,
  body: Record<string, unknown>,
  pw: string
): Promise<FetchResult<unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": pw,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { error: `Create failed: ${res.status} ${text || res.statusText}` };
    }
    const data = await res.json().catch(() => ({}));
    return { data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Create timed out. Please retry." };
    }
    return { error: "Create failed. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

async function updateEntity(
  endpoint: string,
  body: Record<string, unknown>,
  pw: string
): Promise<FetchResult<unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": pw,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { error: `Update failed: ${res.status} ${text || res.statusText}` };
    }
    const data = await res.json().catch(() => ({}));
    return { data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Update timed out. Please retry." };
    }
    return { error: "Update failed. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

async function deleteEntity(
  endpoint: string,
  pw: string
): Promise<FetchResult<unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(endpoint, {
      method: "DELETE",
      headers: { "x-admin-password": pw },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { error: `Delete failed: ${res.status} ${text || res.statusText}` };
    }
    return { data: {} };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Delete timed out. Please retry." };
    }
    return { error: "Delete failed. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

/* ============================================================================
 * Helpers
 * ==========================================================================*/

const CATEGORY_OPTIONS = [
  { value: "project", label: "Project" },
  { value: "stakeholder", label: "Stakeholder" },
  { value: "initiative", label: "Initiative" },
  { value: "other", label: "Other" },
  { value: "custom", label: "Custom" },
];

const MATURITY_LABELS: Record<number, string> = {
  1: "Fragile",
  2: "Emerging",
  3: "Growing",
  4: "Established",
  5: "Flagship",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/* ============================================================================
 * Engineering-aesthetic shared primitives
 * ==========================================================================*/

// Monospace field label — the engineering "identifier" style
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-navy/40 select-none">
      {children}
    </span>
  );
}

// Row-level status pill
function StatusPill({ archived }: { archived: boolean }) {
  if (archived) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase text-navy/30 border border-navy/10 px-2 py-0.5 rounded-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-navy/20" />
        archived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-sm bg-emerald-50/60">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      active
    </span>
  );
}

function LoadingBlock() {
  return (
    <div className="p-10 text-center font-mono text-xs text-navy/25 tracking-widest uppercase">
      loading…
    </div>
  );
}

function ErrorBlock({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="m-5 px-4 py-3 border border-red-200 bg-red-50/60 rounded font-mono text-xs text-red-700 flex items-center justify-between gap-4">
      <span>{error}</span>
      <button
        onClick={onRetry}
        className="underline underline-offset-2 text-red-800 font-semibold whitespace-nowrap"
      >
        retry
      </button>
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="p-10 text-center font-mono text-xs text-navy/25 tracking-wider">
      — {label} —
    </div>
  );
}

// Shared table header cell
function TH({
  children,
  align = "left",
  width,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
}) {
  return (
    <th
      style={width ? { width } : {}}
      className={`px-4 py-2.5 font-mono text-[9px] tracking-[0.2em] uppercase text-navy/35 font-medium border-b border-navy/6 bg-navy/[0.015] text-${align}`}
    >
      {children}
    </th>
  );
}

// Engineering-style text input
function EInput({
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={`font-mono text-xs bg-white border border-navy/12 rounded px-2.5 py-1.5 text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/20 w-full ${className}`}
    />
  );
}

// Engineering-style action button
function ActionBtn({
  children,
  onClick,
  variant = "default",
  disabled,
  small,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "default" | "ghost" | "danger" | "primary";
  disabled?: boolean;
  small?: boolean;
}) {
  const base = `inline-flex items-center font-mono tracking-wider uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`;
  const size = small ? "text-[9px] px-2.5 py-1" : "text-[10px] px-3.5 py-1.5";

  const styles = {
    default: "border border-navy/15 text-navy/60 hover:text-navy hover:border-navy/30 bg-transparent rounded-sm",
    primary: "border border-gold/50 text-gold hover:border-gold bg-gold/5 hover:bg-gold/10 rounded-sm",
    ghost: "text-navy/40 hover:text-navy border border-transparent rounded-sm",
    danger: "text-red-500/70 hover:text-red-700 border border-transparent rounded-sm",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${size} ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

/* ============================================================================
 * Panel wrapper — consistent card chrome
 * ==========================================================================*/

function PanelShell({
  label,
  title,
  subtitle,
  headerRight,
  children,
}: {
  label: string;
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-navy/8 bg-white rounded overflow-hidden">
      {/* Header strip */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-navy/6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-gold/70">
              {label}
            </span>
          </div>
          <h2 className="font-display text-lg text-navy leading-tight">{title}</h2>
          {subtitle && (
            <p className="font-mono text-[10px] text-navy/35 mt-0.5">{subtitle}</p>
          )}
        </div>
        {headerRight && <div className="shrink-0 ml-4 mt-0.5">{headerRight}</div>}
      </div>
      {children}
    </div>
  );
}

/* ============================================================================
 * Add-row tray — slides in below the header
 * ==========================================================================*/

function AddTray({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-navy/6 bg-[#fafaf3]">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-navy/30">
          new record
        </span>
        <div className="flex-1 h-px bg-navy/6" />
        <button
          onClick={onClose}
          className="font-mono text-[9px] text-navy/30 hover:text-navy/60 tracking-wider"
        >
          esc
        </button>
      </div>
      {children}
    </div>
  );
}

/* ============================================================================
 * Main Page
 * ==========================================================================*/

export default function AdminManagePage() {
  const router = useRouter();
  const [storedPassword] = useState<string>(() =>
    typeof window !== "undefined"
      ? sessionStorage.getItem("nmt-admin-pw") ?? ""
      : ""
  );
  const [authChecked] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? sessionStorage.getItem("nmt-admin-pw") != null
      : false
  );
  const [activeTab, setActiveTab] = useState<TabKey>("verticals");

  const [verticals, setVerticals] = useState<VerticalRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [dimensions, setDimensions] = useState<DimensionRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [commitments, setCommitments] = useState<CommitmentRow[]>([]);

  const [loading, setLoading] = useState<Record<TabKey, boolean>>({
    verticals: false, regions: false, dimensions: false, questions: false,
    assessments: false, commitments: false, settings: false,
  });
  const [errors, setErrors] = useState<Record<TabKey, string | null>>({
    verticals: null, regions: null, dimensions: null, questions: null,
    assessments: null, commitments: null, settings: null,
  });

  /* Auth gate — redirect only; state is hydrated via lazy initializers */
  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (!saved) { router.replace("/admin"); return; }
  }, [router]);

  const setTabLoading = (tab: TabKey, value: boolean) =>
    setLoading((prev) => ({ ...prev, [tab]: value }));
  const setTabError = (tab: TabKey, value: string | null) =>
    setErrors((prev) => ({ ...prev, [tab]: value }));

  const loadVerticals = useCallback(async () => {
    startTransition(() => { setTabLoading("verticals", true); setTabError("verticals", null); });
    const r = await fetchEntities<VerticalRow>("/api/admin/verticals", storedPassword);
    startTransition(() => {
      if (r.error) setTabError("verticals", r.error);
      else if (r.data) setVerticals(r.data);
      setTabLoading("verticals", false);
    });
  }, [storedPassword]);

  const loadRegions = useCallback(async () => {
    startTransition(() => { setTabLoading("regions", true); setTabError("regions", null); });
    const r = await fetchEntities<RegionRow>("/api/admin/regions", storedPassword);
    startTransition(() => {
      if (r.error) setTabError("regions", r.error);
      else if (r.data) setRegions(r.data);
      setTabLoading("regions", false);
    });
  }, [storedPassword]);

  const loadDimensions = useCallback(async () => {
    startTransition(() => { setTabLoading("dimensions", true); setTabError("dimensions", null); });
    const r = await fetchEntities<DimensionRow>("/api/admin/dimensions", storedPassword);
    startTransition(() => {
      if (r.error) setTabError("dimensions", r.error);
      else if (r.data) setDimensions(r.data);
      setTabLoading("dimensions", false);
    });
  }, [storedPassword]);

  const loadQuestions = useCallback(async () => {
    startTransition(() => { setTabLoading("questions", true); setTabError("questions", null); });
    const r = await fetchEntities<QuestionRow>("/api/admin/questions", storedPassword);
    startTransition(() => {
      if (r.error) setTabError("questions", r.error);
      else if (r.data) setQuestions(r.data);
      setTabLoading("questions", false);
    });
  }, [storedPassword]);

  const loadAssessments = useCallback(async () => {
    startTransition(() => { setTabLoading("assessments", true); setTabError("assessments", null); });
    const r = await fetchEntities<AssessmentRow>("/api/assessments", storedPassword);
    startTransition(() => {
      if (r.error) setTabError("assessments", r.error);
      else if (r.data) setAssessments(r.data);
      setTabLoading("assessments", false);
    });
  }, [storedPassword]);

  const loadCommitments = useCallback(async () => {
    startTransition(() => { setTabLoading("commitments", true); setTabError("commitments", null); });
    const r = await fetchEntities<CommitmentRow>("/api/commitments", storedPassword);
    startTransition(() => {
      if (r.error) setTabError("commitments", r.error);
      else if (r.data) setCommitments(r.data);
      setTabLoading("commitments", false);
    });
  }, [storedPassword]);

  useEffect(() => {
    if (!authChecked || !storedPassword) return;
    if (activeTab === "verticals") void loadVerticals();
    else if (activeTab === "regions") void loadRegions();
    else if (activeTab === "dimensions") void loadDimensions();
    else if (activeTab === "questions") void loadQuestions();
    else if (activeTab === "assessments") void loadAssessments();
    else if (activeTab === "commitments") void loadCommitments();
  }, [activeTab, authChecked, storedPassword, loadVerticals, loadRegions, loadDimensions, loadQuestions, loadAssessments, loadCommitments]);

  // Populate all tab counts on first mount so [0] reflects DB, not initial empty state
  useEffect(() => {
    if (!authChecked || !storedPassword) return;
    void loadVerticals();
    void loadRegions();
    void loadDimensions();
    void loadQuestions();
    void loadAssessments();
    void loadCommitments();
  }, [authChecked, storedPassword, loadVerticals, loadRegions, loadDimensions, loadQuestions, loadAssessments, loadCommitments]);

  const counts = useMemo<Record<TabKey, number | null>>(
    () => ({
      verticals: verticals.length, regions: regions.length,
      dimensions: dimensions.length, questions: questions.length,
      assessments: assessments.length, commitments: commitments.length,
      settings: null,
    }),
    [verticals.length, regions.length, dimensions.length, questions.length, assessments.length, commitments.length]
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0c1425] flex items-center justify-center font-mono text-xs text-white/20 tracking-widest uppercase">
        checking session…
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "verticals", label: "Verticals" },
    { key: "regions", label: "Regions" },
    { key: "dimensions", label: "Dimensions" },
    { key: "questions", label: "Questions" },
    { key: "assessments", label: "Assessments" },
    { key: "commitments", label: "Commitments" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      {/* ── Top rail ── */}
      <div className="bg-navy border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Breadcrumb-style identity */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[10px] text-white/25 tracking-[0.25em] uppercase">
              NMT
            </span>
            <span className="text-white/15 text-sm">›</span>
            <span className="font-mono text-[10px] text-white/25 tracking-[0.25em] uppercase">
              Admin
            </span>
            <span className="text-white/15 text-sm">›</span>
            <span className="font-mono text-[10px] text-gold/60 tracking-[0.25em] uppercase">
              Manage
            </span>
          </div>
          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            {[
              { href: "/admin", label: "Dashboard" },
              { href: "/admin/live", label: "Live View" },
              { href: "/admin/commitments", label: "Commitments" },
              { href: "/", label: "Test" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/30 hover:text-white/70 px-3 py-1.5 border border-transparent hover:border-white/10 rounded-sm transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Page title bar ── */}
      <div className="bg-navy/95 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-gold/50 mb-1">
            Configuration Console
          </p>
          <h1 className="font-display text-2xl text-white tracking-tight">
            Data Management
          </h1>
        </div>
      </div>

      {/* ── Tab rail ── */}
      <div className="bg-white border-b border-navy/8 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end gap-0 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = counts[tab.key];
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    relative px-4 py-3.5 font-mono text-[10px] tracking-[0.15em] uppercase whitespace-nowrap
                    transition-colors border-b-2
                    ${isActive
                      ? "text-navy border-gold bg-gold/[0.04]"
                      : "text-navy/35 border-transparent hover:text-navy/70 hover:bg-navy/[0.02]"
                    }
                  `}
                >
                  {tab.label}
                  {count !== null && (
                    <span
                      className={`ml-1.5 tabular-nums font-mono text-[9px] ${isActive ? "text-gold/80" : "text-navy/25"}`}
                    >
                      [{count}]
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-7">
        {activeTab === "verticals" && (
          <VerticalsPanel rows={verticals} loading={loading.verticals} error={errors.verticals} pw={storedPassword} refetch={loadVerticals} />
        )}
        {activeTab === "regions" && (
          <RegionsPanel rows={regions} loading={loading.regions} error={errors.regions} pw={storedPassword} refetch={loadRegions} />
        )}
        {activeTab === "dimensions" && (
          <DimensionsPanel rows={dimensions} loading={loading.dimensions} error={errors.dimensions} pw={storedPassword} refetch={loadDimensions} />
        )}
        {activeTab === "questions" && (
          <QuestionsPanel rows={questions} dimensions={dimensions} loading={loading.questions} error={errors.questions} pw={storedPassword} refetch={loadQuestions} refetchDimensions={loadDimensions} />
        )}
        {activeTab === "assessments" && (
          <AssessmentsPanel rows={assessments} loading={loading.assessments} error={errors.assessments} pw={storedPassword} refetch={loadAssessments} />
        )}
        {activeTab === "commitments" && (
          <CommitmentsPanel rows={commitments} loading={loading.commitments} error={errors.commitments} pw={storedPassword} refetch={loadCommitments} />
        )}
        {activeTab === "settings" && <SettingsPanel />}
      </div>
    </div>
  );
}

/* ============================================================================
 * Verticals Panel
 * ==========================================================================*/

function VerticalsPanel({ rows, loading, error, pw, refetch }: {
  rows: VerticalRow[]; loading: boolean; error: string | null; pw: string; refetch: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("project");
  const [newSort, setNewSort] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("project");
  const [editSort, setEditSort] = useState("");

  const startEdit = (row: VerticalRow) => {
    setEditId(row.id); setEditName(row.name);
    setEditCategory(row.category || "project"); setEditSort(String(row.sort_order ?? 0));
  };
  const cancelEdit = () => { setEditId(null); setEditName(""); setEditCategory("project"); setEditSort(""); };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const r = await updateEntity(`/api/admin/verticals/${id}`, { name: editName, category: editCategory, sortOrder: Number(editSort) || 0 }, pw);
    setSaving(false);
    if (r.error) { alert(r.error); return; }
    cancelEdit(); refetch();
  };

  const saveNew = async () => {
    if (!newName.trim()) { alert("Name is required."); return; }
    setSaving(true);
    const body: Record<string, unknown> = { name: newName.trim(), category: newCategory };
    if (newSort !== "") body.sortOrder = Number(newSort);
    const r = await createEntity("/api/admin/verticals", body, pw);
    setSaving(false);
    if (r.error) { alert(r.error); return; }
    setAdding(false); setNewName(""); setNewCategory("project"); setNewSort(""); refetch();
  };

  const toggleArchive = async (row: VerticalRow) => {
    const r = await updateEntity(`/api/admin/verticals/${row.id}`, { archived: !row.archived }, pw);
    if (r.error) { alert(r.error); return; }
    refetch();
  };

  const handleDelete = async (row: VerticalRow) => {
    if (!confirm(`Delete vertical "${row.name}"? This cannot be undone.`)) return;
    const r = await deleteEntity(`/api/admin/verticals/${row.id}`, pw);
    if (r.error) { alert(r.error); return; }
    refetch();
  };

  return (
    <PanelShell
      label="entity / verticals"
      title="Project, Stakeholder & Initiative Verticals"
      headerRight={
        !adding ? (
          <ActionBtn variant="primary" onClick={() => setAdding(true)}>+ New Record</ActionBtn>
        ) : undefined
      }
    >
      {adding && (
        <AddTray onClose={() => { setAdding(false); setNewName(""); setNewCategory("project"); setNewSort(""); }}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <FieldLabel>name</FieldLabel>
              <div className="mt-1.5"><EInput value={newName} onChange={setNewName} placeholder="e.g. MASOOM" autoFocus /></div>
            </div>
            <div>
              <FieldLabel>category</FieldLabel>
              <div className="mt-1.5">
                <Select value={newCategory} onValueChange={(v) => v && setNewCategory(v)}>
                  <SelectTrigger className="font-mono text-xs h-8 border-navy/12 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="font-mono text-xs">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <FieldLabel>sort</FieldLabel>
              <div className="mt-1.5"><EInput type="number" value={newSort} onChange={setNewSort} placeholder="0" /></div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <ActionBtn variant="primary" onClick={saveNew} disabled={saving}>{saving ? "writing…" : "commit"}</ActionBtn>
            <ActionBtn variant="ghost" onClick={() => { setAdding(false); setNewName(""); setNewCategory("project"); setNewSort(""); }}>cancel</ActionBtn>
          </div>
        </AddTray>
      )}

      {loading ? <LoadingBlock /> : error ? <ErrorBlock error={error} onRetry={refetch} /> : rows.length === 0 ? <EmptyBlock label="No verticals. Add the first record above." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <TH>Name</TH>
                <TH>Category</TH>
                <TH align="right" width="80px">Sort</TH>
                <TH width="110px">Status</TH>
                <TH align="right" width="180px">Actions</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isEditing = editId === row.id;
                return (
                  <tr key={row.id} className={`border-b border-navy/[0.045] hover:bg-gold/[0.025] transition-colors ${i % 2 === 0 ? "" : "bg-navy/[0.008]"}`}>
                    <td className="px-4 py-3 font-medium text-navy text-sm">
                      {isEditing ? <EInput value={editName} onChange={setEditName} /> : row.name}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Select value={editCategory} onValueChange={(v) => v && setEditCategory(v)}>
                          <SelectTrigger className="font-mono text-xs h-7 border-navy/12 bg-white w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value} className="font-mono text-xs">{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="font-mono text-[10px] tracking-wider uppercase text-navy/40">{row.category || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-xs text-navy/50">
                      {isEditing ? <EInput type="number" value={editSort} onChange={setEditSort} className="w-20 text-right" /> : row.sort_order ?? 0}
                    </td>
                    <td className="px-4 py-3"><StatusPill archived={row.archived} /></td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="inline-flex gap-2">
                          <ActionBtn variant="primary" small onClick={() => saveEdit(row.id)} disabled={saving}>{saving ? "…" : "save"}</ActionBtn>
                          <ActionBtn variant="ghost" small onClick={cancelEdit}>cancel</ActionBtn>
                        </div>
                      ) : (
                        <div className="inline-flex gap-2">
                          <ActionBtn variant="default" small onClick={() => startEdit(row)}>edit</ActionBtn>
                          <ActionBtn variant="default" small onClick={() => toggleArchive(row)}>{row.archived ? "unarchive" : "archive"}</ActionBtn>
                          <ActionBtn variant="danger" small onClick={() => handleDelete(row)}>delete</ActionBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}

/* ============================================================================
 * Regions Panel
 * ==========================================================================*/

function RegionsPanel({ rows, loading, error, pw, refetch }: {
  rows: RegionRow[]; loading: boolean; error: string | null; pw: string; refetch: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState(""); const [newName, setNewName] = useState(""); const [newSort, setNewSort] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState(""); const [editName, setEditName] = useState(""); const [editSort, setEditSort] = useState("");

  const startEdit = (row: RegionRow) => { setEditId(row.id); setEditCode(row.code); setEditName(row.name); setEditSort(String(row.sort_order ?? 0)); };
  const cancelEdit = () => { setEditId(null); setEditCode(""); setEditName(""); setEditSort(""); };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const r = await updateEntity(`/api/admin/regions/${id}`, { code: editCode, name: editName, sortOrder: Number(editSort) || 0 }, pw);
    setSaving(false);
    if (r.error) { alert(r.error); return; }
    cancelEdit(); refetch();
  };

  const saveNew = async () => {
    if (!newCode.trim() || !newName.trim()) { alert("Code and Name are required."); return; }
    setSaving(true);
    const body: Record<string, unknown> = { code: newCode.trim(), name: newName.trim() };
    if (newSort !== "") body.sortOrder = Number(newSort);
    const r = await createEntity("/api/admin/regions", body, pw);
    setSaving(false);
    if (r.error) { alert(r.error); return; }
    setAdding(false); setNewCode(""); setNewName(""); setNewSort(""); refetch();
  };

  const toggleArchive = async (row: RegionRow) => {
    const r = await updateEntity(`/api/admin/regions/${row.id}`, { archived: !row.archived }, pw);
    if (r.error) { alert(r.error); return; }
    refetch();
  };

  const handleDelete = async (row: RegionRow) => {
    if (!confirm(`Delete region "${row.code} — ${row.name}"? This cannot be undone.`)) return;
    const r = await deleteEntity(`/api/admin/regions/${row.id}`, pw);
    if (r.error) { alert(r.error); return; }
    refetch();
  };

  return (
    <PanelShell
      label="entity / regions"
      title="Regional Codes & Names"
      headerRight={!adding ? <ActionBtn variant="primary" onClick={() => setAdding(true)}>+ New Record</ActionBtn> : undefined}
    >
      {adding && (
        <AddTray onClose={() => { setAdding(false); setNewCode(""); setNewName(""); setNewSort(""); }}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <FieldLabel>code</FieldLabel>
              <div className="mt-1.5"><EInput value={newCode} onChange={setNewCode} placeholder="ERD" autoFocus /></div>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>name</FieldLabel>
              <div className="mt-1.5"><EInput value={newName} onChange={setNewName} placeholder="Erode" /></div>
            </div>
            <div>
              <FieldLabel>sort</FieldLabel>
              <div className="mt-1.5"><EInput type="number" value={newSort} onChange={setNewSort} placeholder="0" /></div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <ActionBtn variant="primary" onClick={saveNew} disabled={saving}>{saving ? "writing…" : "commit"}</ActionBtn>
            <ActionBtn variant="ghost" onClick={() => { setAdding(false); setNewCode(""); setNewName(""); setNewSort(""); }}>cancel</ActionBtn>
          </div>
        </AddTray>
      )}
      {loading ? <LoadingBlock /> : error ? <ErrorBlock error={error} onRetry={refetch} /> : rows.length === 0 ? <EmptyBlock label="No regions. Add the first record above." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <TH width="100px">Code</TH>
                <TH>Name</TH>
                <TH align="right" width="80px">Sort</TH>
                <TH width="110px">Status</TH>
                <TH align="right" width="180px">Actions</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isEditing = editId === row.id;
                return (
                  <tr key={row.id} className={`border-b border-navy/[0.045] hover:bg-gold/[0.025] transition-colors ${i % 2 === 0 ? "" : "bg-navy/[0.008]"}`}>
                    <td className="px-4 py-3">
                      {isEditing ? <EInput value={editCode} onChange={setEditCode} className="w-24 uppercase" /> : <span className="font-mono text-xs tracking-widest uppercase text-navy font-semibold">{row.code}</span>}
                    </td>
                    <td className="px-4 py-3 text-navy/80 text-sm">
                      {isEditing ? <EInput value={editName} onChange={setEditName} /> : row.name}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-xs text-navy/50">
                      {isEditing ? <EInput type="number" value={editSort} onChange={setEditSort} className="w-20 text-right" /> : row.sort_order ?? 0}
                    </td>
                    <td className="px-4 py-3"><StatusPill archived={row.archived} /></td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="inline-flex gap-2">
                          <ActionBtn variant="primary" small onClick={() => saveEdit(row.id)} disabled={saving}>{saving ? "…" : "save"}</ActionBtn>
                          <ActionBtn variant="ghost" small onClick={cancelEdit}>cancel</ActionBtn>
                        </div>
                      ) : (
                        <div className="inline-flex gap-2">
                          <ActionBtn variant="default" small onClick={() => startEdit(row)}>edit</ActionBtn>
                          <ActionBtn variant="default" small onClick={() => toggleArchive(row)}>{row.archived ? "unarchive" : "archive"}</ActionBtn>
                          <ActionBtn variant="danger" small onClick={() => handleDelete(row)}>delete</ActionBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}

/* ============================================================================
 * Dimensions Panel
 * ==========================================================================*/

function DimensionsPanel({ rows, loading, error, pw, refetch }: {
  rows: DimensionRow[]; loading: boolean; error: string | null; pw: string; refetch: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState(""); const [newShort, setNewShort] = useState(""); const [newIdx, setNewIdx] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState(""); const [editShort, setEditShort] = useState("");

  const startEdit = (row: DimensionRow) => { setEditId(row.id); setEditName(row.name); setEditShort(row.short_name); };
  const cancelEdit = () => { setEditId(null); setEditName(""); setEditShort(""); };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const r = await updateEntity(`/api/admin/dimensions/${id}`, { name: editName, shortName: editShort }, pw);
    setSaving(false);
    if (r.error) { alert(r.error); return; }
    cancelEdit(); refetch();
  };

  const saveNew = async () => {
    if (!newName.trim() || !newShort.trim() || newIdx === "") { alert("Name, Short Name, and Dim Index are required."); return; }
    setSaving(true);
    const r = await createEntity("/api/admin/dimensions", { name: newName.trim(), shortName: newShort.trim(), dimIndex: Number(newIdx) }, pw);
    setSaving(false);
    if (r.error) { alert(r.error); return; }
    setAdding(false); setNewName(""); setNewShort(""); setNewIdx(""); refetch();
  };

  const toggleArchive = async (row: DimensionRow) => {
    const r = await updateEntity(`/api/admin/dimensions/${row.id}`, { archived: !row.archived }, pw);
    if (r.error) { alert(r.error); return; }
    refetch();
  };

  return (
    <PanelShell
      label="entity / dimensions"
      title="Maturity Dimensions"
      subtitle="Dimensions cannot be deleted — archive only."
      headerRight={!adding ? <ActionBtn variant="primary" onClick={() => setAdding(true)}>+ New Record</ActionBtn> : undefined}
    >
      {adding && (
        <AddTray onClose={() => { setAdding(false); setNewName(""); setNewShort(""); setNewIdx(""); }}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <FieldLabel>dim_index</FieldLabel>
              <div className="mt-1.5"><EInput type="number" value={newIdx} onChange={setNewIdx} placeholder="8" autoFocus /></div>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>name</FieldLabel>
              <div className="mt-1.5"><EInput value={newName} onChange={setNewName} placeholder="Strategic Clarity" /></div>
            </div>
            <div>
              <FieldLabel>short_name</FieldLabel>
              <div className="mt-1.5"><EInput value={newShort} onChange={setNewShort} placeholder="Strategy" /></div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <ActionBtn variant="primary" onClick={saveNew} disabled={saving}>{saving ? "writing…" : "commit"}</ActionBtn>
            <ActionBtn variant="ghost" onClick={() => { setAdding(false); setNewName(""); setNewShort(""); setNewIdx(""); }}>cancel</ActionBtn>
          </div>
        </AddTray>
      )}
      {loading ? <LoadingBlock /> : error ? <ErrorBlock error={error} onRetry={refetch} /> : rows.length === 0 ? <EmptyBlock label="No dimensions yet." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <TH width="60px">#</TH>
                <TH>Name</TH>
                <TH width="130px">Short Name</TH>
                <TH width="110px">Status</TH>
                <TH align="right" width="140px">Actions</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isEditing = editId === row.id;
                return (
                  <tr key={row.id} className={`border-b border-navy/[0.045] hover:bg-gold/[0.025] transition-colors ${i % 2 === 0 ? "" : "bg-navy/[0.008]"}`}>
                    <td className="px-4 py-3 font-mono text-xs text-navy/40 tabular-nums">{row.dim_index}</td>
                    <td className="px-4 py-3 font-medium text-navy text-sm">
                      {isEditing ? <EInput value={editName} onChange={setEditName} /> : row.name}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? <EInput value={editShort} onChange={setEditShort} /> : <span className="font-mono text-[10px] tracking-wider uppercase text-navy/50">{row.short_name}</span>}
                    </td>
                    <td className="px-4 py-3"><StatusPill archived={row.archived} /></td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="inline-flex gap-2">
                          <ActionBtn variant="primary" small onClick={() => saveEdit(row.id)} disabled={saving}>{saving ? "…" : "save"}</ActionBtn>
                          <ActionBtn variant="ghost" small onClick={cancelEdit}>cancel</ActionBtn>
                        </div>
                      ) : (
                        <div className="inline-flex gap-2">
                          <ActionBtn variant="default" small onClick={() => startEdit(row)}>edit</ActionBtn>
                          <ActionBtn variant="default" small onClick={() => toggleArchive(row)}>{row.archived ? "unarchive" : "archive"}</ActionBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}

/* ============================================================================
 * Questions Panel (grouped by dimension, expandable)
 * ==========================================================================*/

function QuestionsPanel({ rows, dimensions, loading, error, pw, refetch, refetchDimensions }: {
  rows: QuestionRow[]; dimensions: DimensionRow[]; loading: boolean; error: string | null;
  pw: string; refetch: () => void; refetchDimensions: () => void;
}) {
  useEffect(() => {
    if (dimensions.length === 0) refetchDimensions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [addingFor, setAddingFor] = useState<number | null>(null);
  const [newText, setNewText] = useState("");
  const [newSelected, setNewSelected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const groups = useMemo(() => {
    const map = new Map<number, QuestionRow[]>();
    rows.forEach((q) => { const list = map.get(q.dimension_index) || []; list.push(q); map.set(q.dimension_index, list); });
    return map;
  }, [rows]);

  const orderedDimensions = useMemo(() =>
    [...dimensions].filter((d) => !d.archived).sort((a, b) => a.dim_index - b.dim_index),
    [dimensions]
  );

  const toggleGroup = (idx: number) => setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  const startEdit = (q: QuestionRow) => { setEditId(q.id); setEditText(q.text); };
  const cancelEdit = () => { setEditId(null); setEditText(""); };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const r = await updateEntity(`/api/admin/questions/${id}`, { text: editText }, pw);
    setSaving(false);
    if (r.error) { alert(r.error); return; }
    cancelEdit(); refetch();
  };

  const toggleSelected = async (q: QuestionRow) => {
    const r = await updateEntity(`/api/admin/questions/${q.id}`, { selected: !q.selected }, pw);
    if (r.error) { alert(r.error); return; }
    refetch();
  };

  const toggleArchive = async (q: QuestionRow) => {
    const r = await updateEntity(`/api/admin/questions/${q.id}`, { archived: !q.archived }, pw);
    if (r.error) { alert(r.error); return; }
    refetch();
  };

  const handleDelete = async (q: QuestionRow) => {
    if (!confirm(`Delete question Q${q.question_number}? This cannot be undone.`)) return;
    const r = await deleteEntity(`/api/admin/questions/${q.id}`, pw);
    if (r.error) { alert(r.error); return; }
    refetch();
  };

  const saveNewQuestion = async (dimensionIndex: number) => {
    if (!newText.trim()) { alert("Question text is required."); return; }
    setSaving(true);
    const r = await createEntity("/api/admin/questions", { dimensionIndex, text: newText.trim(), selected: newSelected }, pw);
    setSaving(false);
    if (r.error) { alert(r.error); return; }
    setAddingFor(null); setNewText(""); setNewSelected(false); refetch();
  };

  if (loading) return (
    <div className="border border-navy/8 bg-white rounded overflow-hidden"><LoadingBlock /></div>
  );
  if (error) return (
    <div className="border border-navy/8 bg-white rounded overflow-hidden"><ErrorBlock error={error} onRetry={refetch} /></div>
  );
  if (orderedDimensions.length === 0) return (
    <div className="border border-navy/8 bg-white rounded overflow-hidden">
      <EmptyBlock label="No dimensions found. Create a dimension first." />
    </div>
  );

  return (
    <div className="space-y-3">
      {orderedDimensions.map((dim) => {
        const dimQuestions = (groups.get(dim.dim_index) || []).sort((a, b) => a.question_number - b.question_number);
        const selectedCount = dimQuestions.filter((q) => q.selected).length;
        const isOpen = expanded[dim.dim_index] !== false;
        const isAdding = addingFor === dim.dim_index;

        return (
          <div key={dim.id} className="border border-navy/8 bg-white rounded overflow-hidden">
            {/* Dimension header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-navy/6">
              <button
                onClick={() => toggleGroup(dim.dim_index)}
                className="flex items-center gap-3 text-left group"
              >
                <span className="font-mono text-[10px] text-navy/30 group-hover:text-navy/50 transition-colors w-3">
                  {isOpen ? "▾" : "▸"}
                </span>
                <div>
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold/60">
                    dim_{dim.dim_index} / {dim.short_name}
                  </span>
                  <h3 className="font-display text-base text-navy mt-0.5">{dim.name}</h3>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className="font-mono text-[10px] text-navy/30">{dimQuestions.length} questions</span>
                  <span className="font-mono text-[10px] text-gold/70">{selectedCount} selected</span>
                </div>
              </button>
              <ActionBtn
                variant="primary"
                small
                onClick={() => {
                  setAddingFor(dim.dim_index); setNewText(""); setNewSelected(false);
                  setExpanded((prev) => ({ ...prev, [dim.dim_index]: true }));
                }}
              >
                + add question
              </ActionBtn>
            </div>

            {isOpen && (
              <>
                {isAdding && (
                  <div className="px-5 py-4 border-b border-navy/6 bg-[#fafaf3]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-navy/30">new question</span>
                      <div className="flex-1 h-px bg-navy/6" />
                    </div>
                    <textarea
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      placeholder="Enter the question text…"
                      rows={3}
                      autoFocus
                      className="w-full font-mono text-xs px-3 py-2.5 border border-navy/12 rounded bg-white text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/20 resize-y"
                    />
                    <label className="inline-flex items-center gap-2 mt-3 font-mono text-[10px] text-navy/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newSelected}
                        onChange={(e) => setNewSelected(e.target.checked)}
                        className="w-3.5 h-3.5 accent-gold"
                      />
                      include in active 5-per-dim test
                    </label>
                    <div className="flex gap-2 mt-3">
                      <ActionBtn variant="primary" onClick={() => saveNewQuestion(dim.dim_index)} disabled={saving}>{saving ? "writing…" : "commit"}</ActionBtn>
                      <ActionBtn variant="ghost" onClick={() => { setAddingFor(null); setNewText(""); setNewSelected(false); }}>cancel</ActionBtn>
                    </div>
                  </div>
                )}

                {dimQuestions.length === 0 ? (
                  <EmptyBlock label="No questions in this dimension yet." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <TH width="56px">Q#</TH>
                          <TH>Text</TH>
                          <TH align="center" width="80px">Active</TH>
                          <TH width="100px">Status</TH>
                          <TH align="right" width="180px">Actions</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {dimQuestions.map((q, i) => {
                          const isEditing = editId === q.id;
                          return (
                            <tr
                              key={q.id}
                              className={`
                                border-b border-navy/[0.04] hover:bg-gold/[0.025] transition-colors
                                ${q.selected ? "border-l-2 border-l-gold/50" : "border-l-2 border-l-transparent"}
                                ${i % 2 === 0 ? "" : "bg-navy/[0.008]"}
                              `}
                            >
                              <td className="px-4 py-3 font-mono text-[10px] text-navy/35 tabular-nums">Q{q.question_number}</td>
                              <td className="px-4 py-3 text-navy/75 text-sm leading-relaxed max-w-lg">
                                {isEditing ? (
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    rows={3}
                                    className="w-full font-mono text-xs px-2.5 py-1.5 border border-navy/12 rounded bg-white text-navy focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/20 resize-y"
                                  />
                                ) : q.text}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={q.selected}
                                  onChange={() => toggleSelected(q)}
                                  className="w-3.5 h-3.5 accent-gold cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3"><StatusPill archived={q.archived} /></td>
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <div className="inline-flex gap-2">
                                    <ActionBtn variant="primary" small onClick={() => saveEdit(q.id)} disabled={saving}>{saving ? "…" : "save"}</ActionBtn>
                                    <ActionBtn variant="ghost" small onClick={cancelEdit}>cancel</ActionBtn>
                                  </div>
                                ) : (
                                  <div className="inline-flex gap-2">
                                    <ActionBtn variant="default" small onClick={() => startEdit(q)}>edit</ActionBtn>
                                    <ActionBtn variant="default" small onClick={() => toggleArchive(q)}>{q.archived ? "unarchive" : "archive"}</ActionBtn>
                                    <ActionBtn variant="danger" small onClick={() => handleDelete(q)}>delete</ActionBtn>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================================
 * Assessments Panel
 * ==========================================================================*/

function AssessmentsPanel({ rows, loading, error, pw, refetch }: {
  rows: AssessmentRow[]; loading: boolean; error: string | null; pw: string; refetch: () => void;
}) {
  const router = useRouter();
  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>, row: AssessmentRow) => {
    e.stopPropagation();
    if (!confirm("Permanently delete this assessment?")) return;
    const r = await deleteEntity(`/api/admin/assessments/${row.id}`, pw);
    if (r.error) { alert(r.error); return; }
    refetch();
  };

  return (
    <PanelShell
      label="records / assessments"
      title="Completed Diagnostic Records"
      subtitle="Read-only. Click a row to open results."
    >
      {loading ? <LoadingBlock /> : error ? <ErrorBlock error={error} onRetry={refetch} /> : rows.length === 0 ? <EmptyBlock label="No assessments recorded yet." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <TH>Vertical</TH>
                <TH>Region</TH>
                <TH align="right">Score</TH>
                <TH align="center">Level</TH>
                <TH align="right">Date</TH>
                <TH align="right" width="80px">Actions</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/results/${row.id}`)}
                  className={`border-b border-navy/[0.045] hover:bg-gold/[0.025] cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-navy/[0.008]"}`}
                >
                  <td className="px-4 py-3 font-medium text-navy text-sm">{row.vertical_name}</td>
                  <td className="px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-navy/40">{row.region || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-navy tabular-nums">
                    {row.total_score}<span className="text-navy/25">/175</span>
                    <span className="text-navy/40 ml-1.5">({row.percentage}%)</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-[10px] tracking-wider uppercase border border-navy/10 px-2 py-0.5 rounded-sm text-navy/60 bg-navy/[0.03]">
                      L{row.maturity_level} {MATURITY_LABELS[row.maturity_level] ? `· ${MATURITY_LABELS[row.maturity_level]}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[10px] text-navy/40">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <ActionBtn variant="danger" small onClick={(e) => handleDelete(e, row)}>delete</ActionBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}

/* ============================================================================
 * Commitments Panel
 * ==========================================================================*/

function CommitmentsPanel({ rows, loading, error, pw, refetch }: {
  rows: CommitmentRow[]; loading: boolean; error: string | null; pw: string; refetch: () => void;
}) {
  const router = useRouter();
  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>, row: CommitmentRow) => {
    e.stopPropagation();
    if (!confirm(`Delete commitment for "${row.vertical_name}"? This cannot be undone.`)) return;
    const r = await deleteEntity(`/api/admin/commitments/${row.id}`, pw);
    if (r.error) { alert(r.error); return; }
    refetch();
  };

  return (
    <PanelShell
      label="records / commitments"
      title="Action Commitments & Follow-through"
      subtitle="Read-only list."
    >
      {loading ? <LoadingBlock /> : error ? <ErrorBlock error={error} onRetry={refetch} /> : rows.length === 0 ? <EmptyBlock label="No commitments yet." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <TH>Vertical</TH>
                <TH>Focus Dimension</TH>
                <TH align="center" width="100px">Target</TH>
                <TH width="110px">Status</TH>
                <TH>Meeting</TH>
                <TH align="right" width="80px">Actions</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/admin/present/${row.id}`)}
                  className={`border-b border-navy/[0.045] hover:bg-gold/[0.025] cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-navy/[0.008]"}`}
                >
                  <td className="px-4 py-3 font-medium text-navy text-sm">{row.vertical_name}</td>
                  <td className="px-4 py-3 text-navy/70 text-sm">{row.focus_dimension}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-navy/60 tabular-nums">
                    L{row.current_level} → L{row.target_level}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] tracking-wider uppercase border border-navy/10 px-2 py-0.5 rounded-sm text-navy/60 bg-navy/[0.03]">
                      {row.status || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-navy/40">
                    {row.target_meeting ? formatDate(row.target_meeting) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ActionBtn variant="danger" small onClick={(e) => handleDelete(e, row)}>delete</ActionBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}

/* ============================================================================
 * Settings Panel
 * ==========================================================================*/

function SettingsPanel() {
  const [name, setName] = useState<string>(() => getNextMeeting().name);
  const [date, setDate] = useState<string>(() => getNextMeeting().date);
  const [savedName, setSavedName] = useState<string>(() => getNextMeeting().name);
  const [savedDate, setSavedDate] = useState<string>(() => getNextMeeting().date);
  const [saveLabel, setSaveLabel] = useState<"Save" | "Saved!">("Save");
  const [validationError, setValidationError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const dirty = trimmedName !== savedName || date !== savedDate;
  const canSave = dirty && trimmedName.length > 0 && dateValid;

  const handleSave = () => {
    setValidationError(null);
    if (trimmedName.length === 0) { setValidationError("Meeting name is required."); return; }
    if (!dateValid) { setValidationError("Please pick a valid date."); return; }
    const next: NextMeeting = { name: trimmedName, date };
    setNextMeeting(next);
    setSavedName(trimmedName); setSavedDate(date);
    setSaveLabel("Saved!");
    window.setTimeout(() => setSaveLabel("Save"), 2000);
  };

  const handleReset = () => { setName(DEFAULT_NEXT_MEETING.name); setDate(DEFAULT_NEXT_MEETING.date); setValidationError(null); };

  return (
    <PanelShell label="config / settings" title="Next NMT Meeting" subtitle="Name and date default onto every new commitment form.">
      <div className="px-5 py-6 max-w-2xl space-y-6">
        {/* Current value readout */}
        <div className="border border-navy/8 rounded bg-navy/[0.02] px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-navy/30">currently saved</span>
            <div className="font-mono text-xs text-navy/70 mt-0.5">
              {savedName} <span className="text-navy/35 mx-1">·</span> <span className="tabular-nums">{savedDate}</span>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
        </div>

        <div className="space-y-4">
          <div>
            <FieldLabel>meeting_name</FieldLabel>
            <div className="mt-1.5">
              <input
                id="next-meeting-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="e.g. NMT Madurai"
                className="w-full font-mono text-sm px-3 py-2.5 border border-navy/12 rounded bg-white text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/20"
              />
            </div>
          </div>

          <div>
            <FieldLabel>meeting_date</FieldLabel>
            <div className="mt-1.5">
              <input
                id="next-meeting-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full font-mono text-sm px-3 py-2.5 border border-navy/12 rounded bg-white text-navy focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/20"
              />
            </div>
          </div>
        </div>

        {validationError && (
          <p className="font-mono text-xs text-red-600 border border-red-200 bg-red-50/60 px-3 py-2 rounded">
            error: {validationError}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`
              font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 rounded-sm border transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              ${saveLabel === "Saved!"
                ? "border-emerald-300 text-emerald-700 bg-emerald-50/60"
                : "border-gold/50 text-gold hover:border-gold bg-gold/5 hover:bg-gold/10"
              }
            `}
          >
            {saveLabel}
          </button>
          <button
            onClick={handleReset}
            className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 rounded-sm border border-navy/12 text-navy/50 hover:text-navy/80 hover:border-navy/20 bg-transparent transition-colors"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </PanelShell>
  );
}
