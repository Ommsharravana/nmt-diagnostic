"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
 * Main Page
 * ==========================================================================*/

export default function ManagePage() {
  const router = useRouter();
  const [storedPassword, setStoredPassword] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<TabKey>("verticals");

  // Entity state
  const [verticals, setVerticals] = useState<VerticalRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [dimensions, setDimensions] = useState<DimensionRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [commitments, setCommitments] = useState<CommitmentRow[]>([]);

  // Loading / errors per tab
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({
    verticals: false,
    regions: false,
    dimensions: false,
    questions: false,
    assessments: false,
    commitments: false,
    settings: false,
  });
  const [errors, setErrors] = useState<Record<TabKey, string | null>>({
    verticals: null,
    regions: null,
    dimensions: null,
    questions: null,
    assessments: null,
    commitments: null,
    settings: null,
  });

  /* -------------------------- Auth Gate -------------------------- */
  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (!saved) {
      router.replace("/admin");
      return;
    }
    setStoredPassword(saved);
    setAuthChecked(true);
  }, [router]);

  /* -------------------------- Fetchers -------------------------- */
  const setTabLoading = (tab: TabKey, value: boolean) =>
    setLoading((prev) => ({ ...prev, [tab]: value }));
  const setTabError = (tab: TabKey, value: string | null) =>
    setErrors((prev) => ({ ...prev, [tab]: value }));

  const loadVerticals = useCallback(async () => {
    setTabLoading("verticals", true);
    setTabError("verticals", null);
    const result = await fetchEntities<VerticalRow>(
      "/api/admin/verticals",
      storedPassword
    );
    if (result.error) setTabError("verticals", result.error);
    else if (result.data) setVerticals(result.data);
    setTabLoading("verticals", false);
  }, [storedPassword]);

  const loadRegions = useCallback(async () => {
    setTabLoading("regions", true);
    setTabError("regions", null);
    const result = await fetchEntities<RegionRow>(
      "/api/admin/regions",
      storedPassword
    );
    if (result.error) setTabError("regions", result.error);
    else if (result.data) setRegions(result.data);
    setTabLoading("regions", false);
  }, [storedPassword]);

  const loadDimensions = useCallback(async () => {
    setTabLoading("dimensions", true);
    setTabError("dimensions", null);
    const result = await fetchEntities<DimensionRow>(
      "/api/admin/dimensions",
      storedPassword
    );
    if (result.error) setTabError("dimensions", result.error);
    else if (result.data) setDimensions(result.data);
    setTabLoading("dimensions", false);
  }, [storedPassword]);

  const loadQuestions = useCallback(async () => {
    setTabLoading("questions", true);
    setTabError("questions", null);
    const result = await fetchEntities<QuestionRow>(
      "/api/admin/questions",
      storedPassword
    );
    if (result.error) setTabError("questions", result.error);
    else if (result.data) setQuestions(result.data);
    setTabLoading("questions", false);
  }, [storedPassword]);

  const loadAssessments = useCallback(async () => {
    setTabLoading("assessments", true);
    setTabError("assessments", null);
    const result = await fetchEntities<AssessmentRow>(
      "/api/assessments",
      storedPassword
    );
    if (result.error) setTabError("assessments", result.error);
    else if (result.data) setAssessments(result.data);
    setTabLoading("assessments", false);
  }, [storedPassword]);

  const loadCommitments = useCallback(async () => {
    setTabLoading("commitments", true);
    setTabError("commitments", null);
    const result = await fetchEntities<CommitmentRow>(
      "/api/commitments",
      storedPassword
    );
    if (result.error) setTabError("commitments", result.error);
    else if (result.data) setCommitments(result.data);
    setTabLoading("commitments", false);
  }, [storedPassword]);

  // Load data once authed; refresh on tab change.
  useEffect(() => {
    if (!authChecked || !storedPassword) return;
    if (activeTab === "verticals") loadVerticals();
    else if (activeTab === "regions") loadRegions();
    else if (activeTab === "dimensions") loadDimensions();
    else if (activeTab === "questions") loadQuestions();
    else if (activeTab === "assessments") loadAssessments();
    else if (activeTab === "commitments") loadCommitments();
  }, [
    activeTab,
    authChecked,
    storedPassword,
    loadVerticals,
    loadRegions,
    loadDimensions,
    loadQuestions,
    loadAssessments,
    loadCommitments,
  ]);

  /* ---------------------------- Counts ---------------------------- */
  const counts = useMemo<Record<TabKey, number | null>>(
    () => ({
      verticals: verticals.length,
      regions: regions.length,
      dimensions: dimensions.length,
      questions: questions.length,
      assessments: assessments.length,
      commitments: commitments.length,
      // Settings is a single config row — no meaningful count to show.
      settings: null,
    }),
    [
      verticals.length,
      regions.length,
      dimensions.length,
      questions.length,
      assessments.length,
      commitments.length,
    ]
  );

  /* ---------------------------- Render ---------------------------- */
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center text-navy/40 text-sm">
        Checking session…
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
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <div className="bg-navy px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold/50">
              NMT Admin
            </p>
            <h1 className="font-display text-2xl text-white">Manage Data</h1>
          </div>
          <div className="flex gap-3">
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
              Live View
            </a>
            <a
              href="/admin/commitments"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Commitments
            </a>
            <a
              href="/admin/manage"
              className="h-9 px-4 rounded-lg border border-gold/60 text-gold hover:text-gold-light hover:border-gold text-xs tracking-wider uppercase inline-flex items-center"
            >
              Manage
            </a>
            <a
              href="/"
              className="h-9 px-4 rounded-lg border border-white/10 text-white/60 hover:text-gold hover:border-gold/30 text-xs tracking-wider uppercase inline-flex items-center"
            >
              Back to Test
            </a>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-navy/5 bg-parchment sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 flex items-end gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = counts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-b-2 border-gold text-navy font-semibold"
                    : "border-b-2 border-transparent text-navy/40 hover:text-navy"
                }`}
              >
                {tab.label}
                {count !== null && (
                  <span
                    className={`ml-1 tabular-nums ${
                      isActive ? "text-gold" : "text-navy/30"
                    }`}
                  >
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === "verticals" && (
          <VerticalsPanel
            rows={verticals}
            loading={loading.verticals}
            error={errors.verticals}
            pw={storedPassword}
            refetch={loadVerticals}
          />
        )}

        {activeTab === "regions" && (
          <RegionsPanel
            rows={regions}
            loading={loading.regions}
            error={errors.regions}
            pw={storedPassword}
            refetch={loadRegions}
          />
        )}

        {activeTab === "dimensions" && (
          <DimensionsPanel
            rows={dimensions}
            loading={loading.dimensions}
            error={errors.dimensions}
            pw={storedPassword}
            refetch={loadDimensions}
          />
        )}

        {activeTab === "questions" && (
          <QuestionsPanel
            rows={questions}
            dimensions={dimensions}
            loading={loading.questions}
            error={errors.questions}
            pw={storedPassword}
            refetch={loadQuestions}
            refetchDimensions={loadDimensions}
          />
        )}

        {activeTab === "assessments" && (
          <AssessmentsPanel
            rows={assessments}
            loading={loading.assessments}
            error={errors.assessments}
            pw={storedPassword}
            refetch={loadAssessments}
          />
        )}

        {activeTab === "commitments" && (
          <CommitmentsPanel
            rows={commitments}
            loading={loading.commitments}
            error={errors.commitments}
            pw={storedPassword}
            refetch={loadCommitments}
          />
        )}

        {activeTab === "settings" && <SettingsPanel />}
      </div>
    </div>
  );
}

/* ============================================================================
 * Shared UI pieces
 * ==========================================================================*/

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
      {children}
    </p>
  );
}

function StatusBadge({ archived }: { archived: boolean }) {
  if (archived) {
    return (
      <Badge className="bg-gray-200 text-gray-700 text-[10px] tracking-wider uppercase">
        Archived
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  );
}

function LoadingBlock() {
  return (
    <div className="p-8 text-center text-navy/30 text-sm">Loading…</div>
  );
}

function ErrorBlock({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="p-6 text-sm bg-red-50 border border-red-200 rounded-lg text-red-800">
      {error}{" "}
      <button
        onClick={onRetry}
        className="underline text-red-900 ml-2 font-medium"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="p-8 text-center text-navy/30 text-sm">{label}</div>
  );
}

/* ============================================================================
 * Verticals Panel
 * ==========================================================================*/

function VerticalsPanel({
  rows,
  loading,
  error,
  pw,
  refetch,
}: {
  rows: VerticalRow[];
  loading: boolean;
  error: string | null;
  pw: string;
  refetch: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("project");
  const [newSort, setNewSort] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("project");
  const [editSort, setEditSort] = useState<string>("");

  const startEdit = (row: VerticalRow) => {
    setEditId(row.id);
    setEditName(row.name);
    setEditCategory(row.category || "project");
    setEditSort(String(row.sort_order ?? 0));
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditCategory("project");
    setEditSort("");
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const result = await updateEntity(
      `/api/admin/verticals/${id}`,
      {
        name: editName,
        category: editCategory,
        sortOrder: Number(editSort) || 0,
      },
      pw
    );
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    cancelEdit();
    refetch();
  };

  const saveNew = async () => {
    if (!newName.trim()) {
      alert("Name is required.");
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {
      name: newName.trim(),
      category: newCategory,
    };
    if (newSort !== "") body.sortOrder = Number(newSort);
    const result = await createEntity("/api/admin/verticals", body, pw);
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setAdding(false);
    setNewName("");
    setNewCategory("project");
    setNewSort("");
    refetch();
  };

  const toggleArchive = async (row: VerticalRow) => {
    const result = await updateEntity(
      `/api/admin/verticals/${row.id}`,
      { archived: !row.archived },
      pw
    );
    if (result.error) {
      alert(result.error);
      return;
    }
    refetch();
  };

  const handleDelete = async (row: VerticalRow) => {
    if (!confirm(`Delete vertical "${row.name}"? This cannot be undone.`)) return;
    const result = await deleteEntity(`/api/admin/verticals/${row.id}`, pw);
    if (result.error) {
      alert(result.error);
      return;
    }
    refetch();
  };

  return (
    <Card className="border border-navy/5 shadow-none bg-white">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-5 border-b border-navy/5">
          <div>
            <SectionLabel>Verticals</SectionLabel>
            <h2 className="font-display text-xl text-navy mt-1">
              Project, Stakeholder &amp; Initiative Verticals
            </h2>
          </div>
          {!adding && (
            <Button
              onClick={() => setAdding(true)}
              className="bg-gold hover:bg-gold-light text-navy font-semibold text-xs tracking-wider uppercase"
            >
              + Add Vertical
            </Button>
          )}
        </div>

        {adding && (
          <div className="p-5 border-b border-navy/5 bg-gold/5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2">
                <SectionLabel>Name</SectionLabel>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. MASOOM"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-navy/10 bg-white text-sm text-navy"
                  autoFocus
                />
              </div>
              <div>
                <SectionLabel>Category</SectionLabel>
                <Select
                  value={newCategory}
                  onValueChange={(v) => v && setNewCategory(v)}
                >
                  <SelectTrigger className="mt-1 h-9 bg-white border-navy/10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <SectionLabel>Sort</SectionLabel>
                <input
                  type="number"
                  value={newSort}
                  onChange={(e) => setNewSort(e.target.value)}
                  placeholder="0"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-navy/10 bg-white text-sm text-navy"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={saveNew}
                disabled={saving}
                className="bg-navy hover:bg-navy-light text-white text-xs tracking-wider uppercase"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                onClick={() => {
                  setAdding(false);
                  setNewName("");
                  setNewCategory("project");
                  setNewSort("");
                }}
                variant="outline"
                className="border-navy/10 text-navy/60 text-xs tracking-wider uppercase"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <div className="p-5">
            <ErrorBlock error={error} onRetry={refetch} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyBlock label="No verticals yet. Add the first one above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy/5 bg-navy/[0.02]">
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Sort
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isEditing = editId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-navy/5 hover:bg-gold/[0.03]"
                    >
                      <td className="px-4 py-3 font-medium text-navy">
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-navy/10 bg-white text-sm"
                          />
                        ) : (
                          row.name
                        )}
                      </td>
                      <td className="px-4 py-3 text-navy/60">
                        {isEditing ? (
                          <Select
                            value={editCategory}
                            onValueChange={(v) => v && setEditCategory(v)}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white border-navy/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs tracking-wide uppercase text-navy/50">
                            {row.category || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-navy/60">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editSort}
                            onChange={(e) => setEditSort(e.target.value)}
                            className="w-20 px-2 py-1 rounded border border-navy/10 bg-white text-sm text-right"
                          />
                        ) : (
                          row.sort_order ?? 0
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge archived={row.archived} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => saveEdit(row.id)}
                              disabled={saving}
                              className="text-xs font-semibold text-navy hover:text-gold"
                            >
                              {saving ? "…" : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-xs text-navy/40 hover:text-navy"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-3 text-xs">
                            <button
                              onClick={() => startEdit(row)}
                              className="text-navy/60 hover:text-navy"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleArchive(row)}
                              className="text-navy/50 hover:text-navy"
                            >
                              {row.archived ? "Unarchive" : "Archive"}
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
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
      </CardContent>
    </Card>
  );
}

/* ============================================================================
 * Regions Panel
 * ==========================================================================*/

function RegionsPanel({
  rows,
  loading,
  error,
  pw,
  refetch,
}: {
  rows: RegionRow[];
  loading: boolean;
  error: string | null;
  pw: string;
  refetch: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSort, setNewSort] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editSort, setEditSort] = useState<string>("");

  const startEdit = (row: RegionRow) => {
    setEditId(row.id);
    setEditCode(row.code);
    setEditName(row.name);
    setEditSort(String(row.sort_order ?? 0));
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditCode("");
    setEditName("");
    setEditSort("");
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const result = await updateEntity(
      `/api/admin/regions/${id}`,
      {
        code: editCode,
        name: editName,
        sortOrder: Number(editSort) || 0,
      },
      pw
    );
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    cancelEdit();
    refetch();
  };

  const saveNew = async () => {
    if (!newCode.trim() || !newName.trim()) {
      alert("Code and Name are required.");
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {
      code: newCode.trim(),
      name: newName.trim(),
    };
    if (newSort !== "") body.sortOrder = Number(newSort);
    const result = await createEntity("/api/admin/regions", body, pw);
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setAdding(false);
    setNewCode("");
    setNewName("");
    setNewSort("");
    refetch();
  };

  const toggleArchive = async (row: RegionRow) => {
    const result = await updateEntity(
      `/api/admin/regions/${row.id}`,
      { archived: !row.archived },
      pw
    );
    if (result.error) {
      alert(result.error);
      return;
    }
    refetch();
  };

  const handleDelete = async (row: RegionRow) => {
    if (!confirm(`Delete region "${row.code} — ${row.name}"? This cannot be undone.`))
      return;
    const result = await deleteEntity(`/api/admin/regions/${row.id}`, pw);
    if (result.error) {
      alert(result.error);
      return;
    }
    refetch();
  };

  return (
    <Card className="border border-navy/5 shadow-none bg-white">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-5 border-b border-navy/5">
          <div>
            <SectionLabel>Regions</SectionLabel>
            <h2 className="font-display text-xl text-navy mt-1">
              Regional Codes &amp; Names
            </h2>
          </div>
          {!adding && (
            <Button
              onClick={() => setAdding(true)}
              className="bg-gold hover:bg-gold-light text-navy font-semibold text-xs tracking-wider uppercase"
            >
              + Add Region
            </Button>
          )}
        </div>

        {adding && (
          <div className="p-5 border-b border-navy/5 bg-gold/5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <SectionLabel>Code</SectionLabel>
                <input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. ERD"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-navy/10 bg-white text-sm uppercase tracking-wider text-navy"
                  autoFocus
                />
              </div>
              <div className="sm:col-span-2">
                <SectionLabel>Name</SectionLabel>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Erode"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-navy/10 bg-white text-sm text-navy"
                />
              </div>
              <div>
                <SectionLabel>Sort</SectionLabel>
                <input
                  type="number"
                  value={newSort}
                  onChange={(e) => setNewSort(e.target.value)}
                  placeholder="0"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-navy/10 bg-white text-sm text-navy"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={saveNew}
                disabled={saving}
                className="bg-navy hover:bg-navy-light text-white text-xs tracking-wider uppercase"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                onClick={() => {
                  setAdding(false);
                  setNewCode("");
                  setNewName("");
                  setNewSort("");
                }}
                variant="outline"
                className="border-navy/10 text-navy/60 text-xs tracking-wider uppercase"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <div className="p-5">
            <ErrorBlock error={error} onRetry={refetch} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyBlock label="No regions yet. Add the first one above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy/5 bg-navy/[0.02]">
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Name
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Sort
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isEditing = editId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-navy/5 hover:bg-gold/[0.03]"
                    >
                      <td className="px-4 py-3 font-medium text-navy uppercase tracking-wider">
                        {isEditing ? (
                          <input
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            className="w-24 px-2 py-1 rounded border border-navy/10 bg-white text-sm uppercase"
                          />
                        ) : (
                          row.code
                        )}
                      </td>
                      <td className="px-4 py-3 text-navy/70">
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-navy/10 bg-white text-sm"
                          />
                        ) : (
                          row.name
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-navy/60">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editSort}
                            onChange={(e) => setEditSort(e.target.value)}
                            className="w-20 px-2 py-1 rounded border border-navy/10 bg-white text-sm text-right"
                          />
                        ) : (
                          row.sort_order ?? 0
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge archived={row.archived} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => saveEdit(row.id)}
                              disabled={saving}
                              className="text-xs font-semibold text-navy hover:text-gold"
                            >
                              {saving ? "…" : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-xs text-navy/40 hover:text-navy"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-3 text-xs">
                            <button
                              onClick={() => startEdit(row)}
                              className="text-navy/60 hover:text-navy"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleArchive(row)}
                              className="text-navy/50 hover:text-navy"
                            >
                              {row.archived ? "Unarchive" : "Archive"}
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
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
      </CardContent>
    </Card>
  );
}

/* ============================================================================
 * Dimensions Panel
 * ==========================================================================*/

function DimensionsPanel({
  rows,
  loading,
  error,
  pw,
  refetch,
}: {
  rows: DimensionRow[];
  loading: boolean;
  error: string | null;
  pw: string;
  refetch: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newShort, setNewShort] = useState("");
  const [newIdx, setNewIdx] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editShort, setEditShort] = useState("");

  const startEdit = (row: DimensionRow) => {
    setEditId(row.id);
    setEditName(row.name);
    setEditShort(row.short_name);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditShort("");
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const result = await updateEntity(
      `/api/admin/dimensions/${id}`,
      { name: editName, shortName: editShort },
      pw
    );
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    cancelEdit();
    refetch();
  };

  const saveNew = async () => {
    if (!newName.trim() || !newShort.trim() || newIdx === "") {
      alert("Name, Short Name, and Dim Index are required.");
      return;
    }
    setSaving(true);
    const result = await createEntity(
      "/api/admin/dimensions",
      {
        name: newName.trim(),
        shortName: newShort.trim(),
        dimIndex: Number(newIdx),
      },
      pw
    );
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setAdding(false);
    setNewName("");
    setNewShort("");
    setNewIdx("");
    refetch();
  };

  const toggleArchive = async (row: DimensionRow) => {
    const result = await updateEntity(
      `/api/admin/dimensions/${row.id}`,
      { archived: !row.archived },
      pw
    );
    if (result.error) {
      alert(result.error);
      return;
    }
    refetch();
  };

  return (
    <Card className="border border-navy/5 shadow-none bg-white">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-5 border-b border-navy/5">
          <div>
            <SectionLabel>Dimensions</SectionLabel>
            <h2 className="font-display text-xl text-navy mt-1">
              Maturity Dimensions (Foundational)
            </h2>
            <p className="text-xs text-navy/40 mt-1">
              Dimensions cannot be deleted, only archived.
            </p>
          </div>
          {!adding && (
            <Button
              onClick={() => setAdding(true)}
              className="bg-gold hover:bg-gold-light text-navy font-semibold text-xs tracking-wider uppercase"
            >
              + Add Dimension
            </Button>
          )}
        </div>

        {adding && (
          <div className="p-5 border-b border-navy/5 bg-gold/5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <SectionLabel>Dim Index</SectionLabel>
                <input
                  type="number"
                  value={newIdx}
                  onChange={(e) => setNewIdx(e.target.value)}
                  placeholder="e.g. 8"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-navy/10 bg-white text-sm text-navy"
                  autoFocus
                />
              </div>
              <div className="sm:col-span-2">
                <SectionLabel>Name</SectionLabel>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Strategic Clarity"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-navy/10 bg-white text-sm text-navy"
                />
              </div>
              <div>
                <SectionLabel>Short Name</SectionLabel>
                <input
                  value={newShort}
                  onChange={(e) => setNewShort(e.target.value)}
                  placeholder="e.g. Strategy"
                  className="w-full mt-1 px-3 py-2 rounded-md border border-navy/10 bg-white text-sm text-navy"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={saveNew}
                disabled={saving}
                className="bg-navy hover:bg-navy-light text-white text-xs tracking-wider uppercase"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                onClick={() => {
                  setAdding(false);
                  setNewName("");
                  setNewShort("");
                  setNewIdx("");
                }}
                variant="outline"
                className="border-navy/10 text-navy/60 text-xs tracking-wider uppercase"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <div className="p-5">
            <ErrorBlock error={error} onRetry={refetch} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyBlock label="No dimensions yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy/5 bg-navy/[0.02]">
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold w-16">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Short Name
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isEditing = editId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-navy/5 hover:bg-gold/[0.03]"
                    >
                      <td className="px-4 py-3 text-navy/50 tabular-nums">
                        {row.dim_index}
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-navy/10 bg-white text-sm"
                          />
                        ) : (
                          row.name
                        )}
                      </td>
                      <td className="px-4 py-3 text-navy/60">
                        {isEditing ? (
                          <input
                            value={editShort}
                            onChange={(e) => setEditShort(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-navy/10 bg-white text-sm"
                          />
                        ) : (
                          row.short_name
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge archived={row.archived} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => saveEdit(row.id)}
                              disabled={saving}
                              className="text-xs font-semibold text-navy hover:text-gold"
                            >
                              {saving ? "…" : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-xs text-navy/40 hover:text-navy"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-3 text-xs">
                            <button
                              onClick={() => startEdit(row)}
                              className="text-navy/60 hover:text-navy"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleArchive(row)}
                              className="text-navy/50 hover:text-navy"
                            >
                              {row.archived ? "Unarchive" : "Archive"}
                            </button>
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
      </CardContent>
    </Card>
  );
}

/* ============================================================================
 * Questions Panel (grouped by dimension)
 * ==========================================================================*/

function QuestionsPanel({
  rows,
  dimensions,
  loading,
  error,
  pw,
  refetch,
  refetchDimensions,
}: {
  rows: QuestionRow[];
  dimensions: DimensionRow[];
  loading: boolean;
  error: string | null;
  pw: string;
  refetch: () => void;
  refetchDimensions: () => void;
}) {
  // Ensure dimensions are loaded so we can render groups.
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
    rows.forEach((q) => {
      const list = map.get(q.dimension_index) || [];
      list.push(q);
      map.set(q.dimension_index, list);
    });
    return map;
  }, [rows]);

  const orderedDimensions = useMemo(
    () =>
      [...dimensions]
        .filter((d) => !d.archived)
        .sort((a, b) => a.dim_index - b.dim_index),
    [dimensions]
  );

  const toggleGroup = (idx: number) =>
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const startEdit = (q: QuestionRow) => {
    setEditId(q.id);
    setEditText(q.text);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditText("");
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const result = await updateEntity(
      `/api/admin/questions/${id}`,
      { text: editText },
      pw
    );
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    cancelEdit();
    refetch();
  };

  const toggleSelected = async (q: QuestionRow) => {
    const result = await updateEntity(
      `/api/admin/questions/${q.id}`,
      { selected: !q.selected },
      pw
    );
    if (result.error) {
      alert(result.error);
      return;
    }
    refetch();
  };

  const toggleArchive = async (q: QuestionRow) => {
    const result = await updateEntity(
      `/api/admin/questions/${q.id}`,
      { archived: !q.archived },
      pw
    );
    if (result.error) {
      alert(result.error);
      return;
    }
    refetch();
  };

  const handleDelete = async (q: QuestionRow) => {
    if (!confirm(`Delete question Q${q.question_number}? This cannot be undone.`))
      return;
    const result = await deleteEntity(`/api/admin/questions/${q.id}`, pw);
    if (result.error) {
      alert(result.error);
      return;
    }
    refetch();
  };

  const saveNewQuestion = async (dimensionIndex: number) => {
    if (!newText.trim()) {
      alert("Question text is required.");
      return;
    }
    setSaving(true);
    const result = await createEntity(
      "/api/admin/questions",
      {
        dimensionIndex,
        text: newText.trim(),
        selected: newSelected,
      },
      pw
    );
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setAddingFor(null);
    setNewText("");
    setNewSelected(false);
    refetch();
  };

  if (loading) {
    return (
      <Card className="border border-navy/5 shadow-none bg-white">
        <CardContent>
          <LoadingBlock />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-navy/5 shadow-none bg-white">
        <CardContent className="p-5">
          <ErrorBlock error={error} onRetry={refetch} />
        </CardContent>
      </Card>
    );
  }

  if (orderedDimensions.length === 0) {
    return (
      <Card className="border border-navy/5 shadow-none bg-white">
        <CardContent>
          <EmptyBlock label="No dimensions found. Add a dimension first before creating questions." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orderedDimensions.map((dim) => {
        const dimQuestions = (groups.get(dim.dim_index) || []).sort(
          (a, b) => a.question_number - b.question_number
        );
        const selectedCount = dimQuestions.filter((q) => q.selected).length;
        const isOpen = expanded[dim.dim_index] !== false; // default open
        const isAdding = addingFor === dim.dim_index;

        return (
          <Card
            key={dim.id}
            className="border border-navy/5 shadow-none bg-white"
          >
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-navy/5">
                <button
                  onClick={() => toggleGroup(dim.dim_index)}
                  className="flex items-center gap-3 text-left"
                >
                  <span className="text-navy/30 text-xs">
                    {isOpen ? "▼" : "▶"}
                  </span>
                  <div>
                    <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                      Dimension {dim.dim_index}
                    </p>
                    <h3 className="font-display text-lg text-navy">
                      {dim.name}{" "}
                      <span className="text-xs text-navy/40 font-normal tracking-wide">
                        ({dimQuestions.length} questions, {selectedCount} selected)
                      </span>
                    </h3>
                  </div>
                </button>
                <Button
                  onClick={() => {
                    setAddingFor(dim.dim_index);
                    setNewText("");
                    setNewSelected(false);
                    setExpanded((prev) => ({ ...prev, [dim.dim_index]: true }));
                  }}
                  className="bg-gold hover:bg-gold-light text-navy font-semibold text-[11px] tracking-wider uppercase"
                >
                  + Add Question
                </Button>
              </div>

              {isOpen && (
                <>
                  {isAdding && (
                    <div className="p-4 border-b border-navy/5 bg-gold/5">
                      <SectionLabel>New Question</SectionLabel>
                      <textarea
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        placeholder="Enter the question text…"
                        rows={3}
                        className="w-full mt-2 px-3 py-2 rounded-md border border-navy/10 bg-white text-sm text-navy resize-y"
                        autoFocus
                      />
                      <label className="inline-flex items-center gap-2 mt-3 text-xs text-navy/70">
                        <input
                          type="checkbox"
                          checked={newSelected}
                          onChange={(e) => setNewSelected(e.target.checked)}
                          className="w-4 h-4 accent-gold"
                        />
                        Include in active 5-per-dim test
                      </label>
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => saveNewQuestion(dim.dim_index)}
                          disabled={saving}
                          className="bg-navy hover:bg-navy-light text-white text-xs tracking-wider uppercase"
                        >
                          {saving ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          onClick={() => {
                            setAddingFor(null);
                            setNewText("");
                            setNewSelected(false);
                          }}
                          variant="outline"
                          className="border-navy/10 text-navy/60 text-xs tracking-wider uppercase"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {dimQuestions.length === 0 ? (
                    <EmptyBlock label="No questions in this dimension yet." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-navy/5 bg-navy/[0.02]">
                            <th className="px-4 py-2 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold w-16">
                              Q#
                            </th>
                            <th className="px-4 py-2 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                              Text
                            </th>
                            <th className="px-4 py-2 text-center text-[10px] tracking-wider uppercase text-navy/40 font-semibold w-24">
                              Selected
                            </th>
                            <th className="px-4 py-2 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold w-28">
                              Status
                            </th>
                            <th className="px-4 py-2 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold w-44">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dimQuestions.map((q) => {
                            const isEditing = editId === q.id;
                            return (
                              <tr
                                key={q.id}
                                className={`border-b border-navy/5 hover:bg-gold/[0.03] ${
                                  q.selected ? "border-l-4 border-l-gold" : ""
                                }`}
                              >
                                <td className="px-4 py-3 text-navy/50 tabular-nums">
                                  Q{q.question_number}
                                </td>
                                <td className="px-4 py-3 text-navy/80">
                                  {isEditing ? (
                                    <textarea
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      rows={3}
                                      className="w-full px-2 py-1 rounded border border-navy/10 bg-white text-sm resize-y"
                                    />
                                  ) : (
                                    q.text
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={q.selected}
                                    onChange={() => toggleSelected(q)}
                                    className="w-4 h-4 accent-gold cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge archived={q.archived} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {isEditing ? (
                                    <div className="inline-flex gap-2">
                                      <button
                                        onClick={() => saveEdit(q.id)}
                                        disabled={saving}
                                        className="text-xs font-semibold text-navy hover:text-gold"
                                      >
                                        {saving ? "…" : "Save"}
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="text-xs text-navy/40 hover:text-navy"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="inline-flex gap-3 text-xs">
                                      <button
                                        onClick={() => startEdit(q)}
                                        className="text-navy/60 hover:text-navy"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => toggleArchive(q)}
                                        className="text-navy/50 hover:text-navy"
                                      >
                                        {q.archived ? "Unarchive" : "Archive"}
                                      </button>
                                      <button
                                        onClick={() => handleDelete(q)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        Delete
                                      </button>
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ============================================================================
 * Assessments Panel (read-only + delete)
 * ==========================================================================*/

function AssessmentsPanel({
  rows,
  loading,
  error,
  pw,
  refetch,
}: {
  rows: AssessmentRow[];
  loading: boolean;
  error: string | null;
  pw: string;
  refetch: () => void;
}) {
  const handleDelete = async (
    e: React.MouseEvent,
    row: AssessmentRow
  ) => {
    e.stopPropagation();
    if (
      !confirm(
        "This will permanently delete this assessment. Are you sure?"
      )
    )
      return;
    const result = await deleteEntity(`/api/admin/assessments/${row.id}`, pw);
    if (result.error) {
      alert(result.error);
      return;
    }
    refetch();
  };

  return (
    <Card className="border border-navy/5 shadow-none bg-white">
      <CardContent className="p-0">
        <div className="p-5 border-b border-navy/5">
          <SectionLabel>Assessments</SectionLabel>
          <h2 className="font-display text-xl text-navy mt-1">
            Completed Diagnostic Records
          </h2>
          <p className="text-xs text-navy/40 mt-1">
            Read-only. Click a row to open results in a new tab.
          </p>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <div className="p-5">
            <ErrorBlock error={error} onRetry={refetch} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyBlock label="No assessments recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy/5 bg-navy/[0.02]">
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Vertical
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Region
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Score
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Level
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-navy/5 hover:bg-gold/[0.03] cursor-pointer"
                    onClick={() =>
                      window.open(`/results/${row.id}`, "_blank")
                    }
                  >
                    <td className="px-4 py-3 font-medium text-navy">
                      {row.vertical_name}
                    </td>
                    <td className="px-4 py-3 text-navy/50">
                      {row.region || "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-navy">
                      {row.total_score}
                      <span className="text-navy/25">/175</span>
                      <span className="text-navy/40 text-xs ml-2">
                        ({row.percentage}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className="bg-navy/[0.04] text-navy text-[10px]">
                        L{row.maturity_level} —{" "}
                        {MATURITY_LABELS[row.maturity_level] || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-navy/50 text-xs">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => handleDelete(e, row)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================================
 * Commitments Panel (read-only + delete)
 * ==========================================================================*/

function CommitmentsPanel({
  rows,
  loading,
  error,
  pw,
  refetch,
}: {
  rows: CommitmentRow[];
  loading: boolean;
  error: string | null;
  pw: string;
  refetch: () => void;
}) {
  const handleDelete = async (row: CommitmentRow) => {
    if (
      !confirm(
        `Delete commitment for "${row.vertical_name}"? This cannot be undone.`
      )
    )
      return;
    const result = await deleteEntity(`/api/admin/commitments/${row.id}`, pw);
    if (result.error) {
      alert(result.error);
      return;
    }
    refetch();
  };

  return (
    <Card className="border border-navy/5 shadow-none bg-white">
      <CardContent className="p-0">
        <div className="p-5 border-b border-navy/5">
          <SectionLabel>Commitments</SectionLabel>
          <h2 className="font-display text-xl text-navy mt-1">
            Action Commitments &amp; Follow-through
          </h2>
          <p className="text-xs text-navy/40 mt-1">Read-only list.</p>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <div className="p-5">
            <ErrorBlock error={error} onRetry={refetch} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyBlock label="No commitments yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy/5 bg-navy/[0.02]">
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Vertical
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Focus Dim
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Target
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Meeting
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] tracking-wider uppercase text-navy/40 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-navy/5 hover:bg-gold/[0.03]"
                  >
                    <td className="px-4 py-3 font-medium text-navy">
                      {row.vertical_name}
                    </td>
                    <td className="px-4 py-3 text-navy/70">
                      {row.focus_dimension}
                    </td>
                    <td className="px-4 py-3 text-center text-navy/70 tabular-nums">
                      L{row.current_level} → L{row.target_level}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-navy/[0.04] text-navy text-[10px] tracking-wider uppercase">
                        {row.status || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-navy/50 text-xs">
                      {row.target_meeting
                        ? formatDate(row.target_meeting)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(row)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================================
 * Settings Panel (Next NMT meeting)
 * ==========================================================================*/

function SettingsPanel() {
  // Seed with the synchronous default so SSR and first render match.
  // The effect below pulls the admin-saved value from localStorage on mount.
  const [name, setName] = useState<string>(DEFAULT_NEXT_MEETING.name);
  const [date, setDate] = useState<string>(DEFAULT_NEXT_MEETING.date);
  const [savedName, setSavedName] = useState<string>(DEFAULT_NEXT_MEETING.name);
  const [savedDate, setSavedDate] = useState<string>(DEFAULT_NEXT_MEETING.date);
  const [saveLabel, setSaveLabel] = useState<string>("Save");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const current = getNextMeeting();
    setName(current.name);
    setDate(current.date);
    setSavedName(current.name);
    setSavedDate(current.date);
  }, []);

  const trimmedName = name.trim();
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const dirty = trimmedName !== savedName || date !== savedDate;
  const canSave = dirty && trimmedName.length > 0 && dateValid;

  const handleSave = () => {
    setValidationError(null);
    if (trimmedName.length === 0) {
      setValidationError("Meeting name is required.");
      return;
    }
    if (!dateValid) {
      setValidationError("Please pick a valid date.");
      return;
    }
    const next: NextMeeting = { name: trimmedName, date };
    setNextMeeting(next);
    setSavedName(trimmedName);
    setSavedDate(date);
    setSaveLabel("Saved!");
    window.setTimeout(() => setSaveLabel("Save"), 2000);
  };

  const handleReset = () => {
    setName(DEFAULT_NEXT_MEETING.name);
    setDate(DEFAULT_NEXT_MEETING.date);
    setValidationError(null);
  };

  return (
    <Card className="border border-navy/5 shadow-none bg-white">
      <CardContent className="p-0">
        <div className="p-5 border-b border-navy/5">
          <SectionLabel>Settings</SectionLabel>
          <h2 className="font-display text-xl text-navy mt-1">
            Next NMT Meeting
          </h2>
          <p className="text-xs text-navy/50 mt-1">
            This name and date default onto every new commitment form.
          </p>
        </div>

        <div className="p-5 space-y-5 max-w-2xl">
          <div>
            <label
              htmlFor="next-meeting-name"
              className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold block mb-1"
            >
              Meeting Name
            </label>
            <input
              id="next-meeting-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="e.g. NMT Madurai"
              className="w-full px-3 py-2 rounded-md border border-navy/10 bg-white text-sm text-navy"
            />
          </div>

          <div>
            <label
              htmlFor="next-meeting-date"
              className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold block mb-1"
            >
              Meeting Date
            </label>
            <input
              id="next-meeting-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-navy/10 bg-white text-sm text-navy"
            />
          </div>

          {validationError && (
            <p className="text-sm text-red-600">{validationError}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="bg-navy hover:bg-navy-light text-white text-xs tracking-wider uppercase disabled:opacity-40"
            >
              {saveLabel}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-navy/10 text-navy/60 text-xs tracking-wider uppercase"
            >
              Reset to Default
            </Button>
            <span className="text-[11px] text-navy/40 ml-auto">
              Currently saved:{" "}
              <span className="text-navy/60 font-medium">{savedName}</span> ·{" "}
              <span className="text-navy/60 tabular-nums">{savedDate}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
