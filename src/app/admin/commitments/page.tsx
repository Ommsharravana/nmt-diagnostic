"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { verticals } from "@/lib/yi-data";

type StatusType = "pending" | "in_progress" | "done" | "missed" | "partial";

interface ActionItemDetail {
  text: string;
  owner: string;
  deadline: string;
  status: StatusType;
  notes?: string;
}

interface Commitment {
  id: string;
  assessment_id: string | null;
  vertical_name: string;
  region: string | null;
  respondent_name: string | null;
  focus_dimension: string;
  focus_dimension_score: number;
  current_level: number;
  target_level: number;
  action_items: string[];
  target_meeting: string | null;
  target_date: string | null;
  status: StatusType;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
  // Extended fields (Rohan's Action Commitment Sheet)
  chair_name: string | null;
  co_chair_name: string | null;
  focus_reason: string | null;
  action_items_detailed: ActionItemDetail[] | null;
  dimension_observations: Record<string, string> | null;
}

// Module-scoped fetch helper with timeout + error handling.
// Keeps the click handler tiny so the silent-failure auditor can verify it.
async function patchCommitment(
  id: string,
  edit: { status: StatusType; completion_notes: string },
  pw: string
): Promise<{ ok?: true; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`/api/commitments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ status: edit.status, completion_notes: edit.completion_notes }),
      signal: controller.signal,
    });
    if (!res.ok) return { error: `Save failed: ${res.status} ${res.statusText}` };
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Save timed out. Please check your connection and retry." };
    }
    return { error: "Save failed. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

// Module-scoped fetch helper for updating a single action item (index 0..2).
async function updateActionItem(
  id: string,
  index: number,
  status: StatusType,
  notes: string,
  pw: string
): Promise<{ ok?: true; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`/api/commitments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({
        updateActionItem: { index, status, notes },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      let msg = `Save failed: ${res.status} ${res.statusText}`;
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
      } catch {
        /* ignore */
      }
      return { error: msg };
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Save timed out. Please check your connection and retry." };
    }
    return { error: "Save failed. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

const statusColors: Record<StatusType, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-300",
  in_progress: "bg-blue-50 text-blue-700 border-blue-300",
  done: "bg-emerald-50 text-emerald-700 border-emerald-300",
  partial: "bg-amber-50 text-amber-700 border-amber-300",
  missed: "bg-red-50 text-red-700 border-red-300",
};

const statusLabels: Record<StatusType, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
  partial: "Partial",
  missed: "Missed",
};

const ALL_STATUSES: StatusType[] = [
  "pending",
  "in_progress",
  "done",
  "partial",
  "missed",
];

function formatDeadline(value: string | null | undefined): string {
  if (!value) return "—";
  // Try YYYY-MM-DD fast-path
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CommitmentsPage() {
  const [storedPassword, setStoredPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterVertical, setFilterVertical] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMeeting, setFilterMeeting] = useState("");

  // Per-row local edits (legacy: commitment-level status/notes)
  const [edits, setEdits] = useState<
    Record<string, { status: StatusType; completion_notes: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Per-item local edits — keyed by `${commitmentId}:${index}`
  const [itemEdits, setItemEdits] = useState<
    Record<string, { status: StatusType; notes: string }>
  >({});
  const [savingItemKey, setSavingItemKey] = useState<string | null>(null);

  // Expanded "Quick observations" section state — keyed by commitment id
  const [obsOpen, setObsOpen] = useState<Record<string, boolean>>({});

  // Check session - redirect if not authenticated
  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (!saved) {
      window.location.href = "/admin";
      return;
    }
    setStoredPassword(saved);
    setAuthenticated(true);
  }, []);

  const fetchCommitments = useCallback(async () => {
    if (!storedPassword) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (filterVertical !== "all") params.set("vertical", filterVertical);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterMeeting.trim()) params.set("target_meeting", filterMeeting.trim());

    try {
      const res = await fetch(`/api/commitments?${params}`, {
        headers: { "x-admin-password": storedPassword },
      });
      if (res.ok) {
        const data = await res.json();
        setCommitments(Array.isArray(data) ? data : data.commitments || []);
      }
    } catch (e) {
      console.error("Failed to fetch commitments:", e);
    }
    setLoading(false);
  }, [storedPassword, filterVertical, filterStatus, filterMeeting]);

  useEffect(() => {
    if (authenticated) fetchCommitments();
  }, [authenticated, fetchCommitments]);

  // Initialize edit state when commitments load
  useEffect(() => {
    const next: Record<string, { status: StatusType; completion_notes: string }> = {};
    const nextItems: Record<string, { status: StatusType; notes: string }> = {};
    commitments.forEach((c) => {
      next[c.id] = {
        status: c.status,
        completion_notes: c.completion_notes ?? "",
      };
      if (Array.isArray(c.action_items_detailed)) {
        c.action_items_detailed.forEach((item, i) => {
          nextItems[`${c.id}:${i}`] = {
            status: (item.status ?? "pending") as StatusType,
            notes: item.notes ?? "",
          };
        });
      }
    });
    setEdits(next);
    setItemEdits(nextItems);
  }, [commitments]);

  const updateEdit = (
    id: string,
    patch: Partial<{ status: StatusType; completion_notes: string }>,
  ) => {
    setEdits((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status ?? "pending",
        completion_notes: prev[id]?.completion_notes ?? "",
        ...patch,
      },
    }));
  };

  const updateItemEdit = (
    commitmentId: string,
    index: number,
    patch: Partial<{ status: StatusType; notes: string }>,
  ) => {
    const key = `${commitmentId}:${index}`;
    setItemEdits((prev) => ({
      ...prev,
      [key]: {
        status: prev[key]?.status ?? "pending",
        notes: prev[key]?.notes ?? "",
        ...patch,
      },
    }));
  };

  const handleSave = async (id: string) => {
    const edit = edits[id];
    if (!edit) return;
    setSavingId(id);
    const result = await patchCommitment(id, edit, storedPassword);
    if (result.error) alert(result.error);
    else await fetchCommitments();
    setSavingId(null);
  };

  const handleSaveItem = async (commitmentId: string, index: number) => {
    const key = `${commitmentId}:${index}`;
    const edit = itemEdits[key];
    if (!edit) return;
    if ((edit.notes ?? "").length > 2000) {
      alert("Notes must be at most 2000 characters.");
      return;
    }
    setSavingItemKey(key);
    const result = await updateActionItem(
      commitmentId,
      index,
      edit.status,
      edit.notes ?? "",
      storedPassword,
    );
    if (result.error) alert(result.error);
    else await fetchCommitments();
    setSavingItemKey(null);
  };

  // Summary stats — count action items across all commitments when detailed
  // data exists; fall back to commitment-level status otherwise.
  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    let inProgress = 0;
    let pendingMissed = 0;

    commitments.forEach((c) => {
      if (Array.isArray(c.action_items_detailed) && c.action_items_detailed.length > 0) {
        c.action_items_detailed.forEach((item) => {
          total += 1;
          const s = (item.status ?? "pending") as StatusType;
          if (s === "done") done += 1;
          else if (s === "in_progress" || s === "partial") inProgress += 1;
          else if (s === "pending" || s === "missed") pendingMissed += 1;
        });
      } else {
        total += 1;
        const s = c.status;
        if (s === "done") done += 1;
        else if (s === "in_progress" || s === "partial") inProgress += 1;
        else if (s === "pending" || s === "missed") pendingMissed += 1;
      }
    });

    return { total, done, inProgress, pendingMissed };
  }, [commitments]);

  // Group by target_meeting
  const grouped = useMemo(() => {
    const map = new Map<string, Commitment[]>();
    commitments.forEach((c) => {
      const key = c.target_meeting || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    // Sort groups: known meetings first, "Unassigned" last
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
  }, [commitments]);

  if (!authenticated) {
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
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold/50">
              NMT Admin
            </p>
            <h1 className="font-display text-2xl text-white">
              Commitments Tracker
            </h1>
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
            <span className="h-9 px-4 rounded-lg border border-gold/40 text-gold text-xs tracking-wider uppercase inline-flex items-center">
              Commitments
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

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Action Items", value: stats.total.toString() },
            { label: "Completed", value: stats.done.toString() },
            { label: "In Progress", value: stats.inProgress.toString() },
            { label: "Pending / Missed", value: stats.pendingMissed.toString() },
          ].map((card) => (
            <Card
              key={card.label}
              className="border border-navy/5 shadow-none bg-white"
            >
              <CardContent className="p-4">
                <p className="text-[10px] tracking-[0.15em] uppercase text-navy/30 font-semibold">
                  {card.label}
                </p>
                <p className="font-display text-3xl text-navy mt-1">
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filterVertical}
            onValueChange={(v) => v && setFilterVertical(v)}
          >
            <SelectTrigger className="w-48 h-9 bg-white border-navy/10 text-sm">
              <SelectValue placeholder="All Verticals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verticals</SelectItem>
              {verticals.map((v) => (
                <SelectItem key={v.name} value={v.name}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterStatus}
            onValueChange={(v) => v && setFilterStatus(v)}
          >
            <SelectTrigger className="w-40 h-9 bg-white border-navy/10 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="text"
            value={filterMeeting}
            onChange={(e) => setFilterMeeting(e.target.value)}
            placeholder="Target meeting..."
            className="h-9 px-3 rounded-lg border border-navy/10 bg-white text-sm text-navy/70 w-56"
          />

          <div className="flex-1" />

          <span className="text-xs text-navy/30">
            {commitments.length} commitment
            {commitments.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center text-navy/30 text-sm bg-white rounded-lg border border-navy/5">
            Loading...
          </div>
        ) : commitments.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-lg border border-navy/5">
            <p className="font-display text-xl text-navy/70 mb-2">
              No commitments captured yet
            </p>
            <p className="text-sm text-navy/40">
              They&apos;ll appear here as verticals complete their assessments.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([meeting, items]) => (
              <section key={meeting} className="space-y-3">
                <div className="flex items-baseline justify-between pb-2 border-b border-navy/10">
                  <h2 className="font-display text-2xl text-navy">{meeting}</h2>
                  <span className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                    {items.length} commitment{items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-3">
                  {items.map((c) => {
                    const edit = edits[c.id] ?? {
                      status: c.status,
                      completion_notes: c.completion_notes ?? "",
                    };
                    const dirty =
                      edit.status !== c.status ||
                      edit.completion_notes !== (c.completion_notes ?? "");

                    const hasDetailed =
                      Array.isArray(c.action_items_detailed) &&
                      c.action_items_detailed.length > 0;

                    // Header — Chair / Co-Chair / Respondent fallback
                    const headerParts: string[] = [];
                    if (c.chair_name) headerParts.push(`Chair: ${c.chair_name}`);
                    if (c.co_chair_name) headerParts.push(`Co-Chair: ${c.co_chair_name}`);
                    if (headerParts.length === 0 && c.respondent_name) {
                      headerParts.push(c.respondent_name);
                    }
                    const headerMeta = [c.region, headerParts.join(" · ")]
                      .filter(Boolean)
                      .join(" · ");

                    const observations = c.dimension_observations ?? null;
                    const observationEntries = observations
                      ? Object.entries(observations).filter(
                          ([, v]) => typeof v === "string" && v.trim().length > 0,
                        )
                      : [];
                    const obsExpanded = !!obsOpen[c.id];

                    return (
                      <Card
                        key={c.id}
                        className="border border-navy/5 shadow-none bg-white"
                      >
                        <CardContent className="p-5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Left: main content (2 cols) */}
                            <div className="md:col-span-2 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-navy text-base">
                                    {c.vertical_name}
                                  </p>
                                  <p className="text-xs text-navy/50 mt-0.5">
                                    {headerMeta || "—"}
                                  </p>
                                </div>
                                <p className="text-[10px] text-navy/40 tabular-nums whitespace-nowrap">
                                  {new Date(c.created_at).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </p>
                              </div>

                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                                  Focus
                                </span>
                                <span className="text-navy">
                                  {c.focus_dimension}
                                </span>
                                <span className="text-navy/30">·</span>
                                <span className="font-medium text-navy">
                                  L{c.current_level}
                                </span>
                                <span className="text-navy/30">→</span>
                                <span className="font-medium text-gold">
                                  L{c.target_level}
                                </span>
                              </div>

                              {c.focus_reason && c.focus_reason.trim().length > 0 && (
                                <div className="text-sm text-navy/60 italic border-l-2 border-gold/30 pl-3 py-1 mt-2">
                                  <span className="not-italic font-semibold text-navy/70">
                                    Why this dimension?
                                  </span>{" "}
                                  {c.focus_reason}
                                </div>
                              )}

                              {/* Action Items — detailed cards OR legacy numbered list */}
                              {hasDetailed ? (
                                <div className="space-y-2">
                                  <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold">
                                    Action Items
                                  </p>
                                  <div className="space-y-3">
                                    {c.action_items_detailed!.map((item, i) => {
                                      const itemKey = `${c.id}:${i}`;
                                      const itemEdit =
                                        itemEdits[itemKey] ?? {
                                          status: (item.status ?? "pending") as StatusType,
                                          notes: item.notes ?? "",
                                        };
                                      const itemDirty =
                                        itemEdit.status !== (item.status ?? "pending") ||
                                        (itemEdit.notes ?? "") !== (item.notes ?? "");
                                      const saving = savingItemKey === itemKey;
                                      return (
                                        <div
                                          key={i}
                                          className="rounded-lg border border-navy/10 bg-parchment/40 p-3 space-y-2"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm text-navy font-medium leading-snug">
                                              {i + 1}. {item.text}
                                            </p>
                                            <Badge
                                              className={`text-[10px] border whitespace-nowrap ${statusColors[(item.status ?? "pending") as StatusType]}`}
                                            >
                                              {statusLabels[(item.status ?? "pending") as StatusType]}
                                            </Badge>
                                          </div>

                                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-navy/60">
                                            <span>
                                              <span className="text-navy/40 uppercase tracking-wider text-[10px] mr-1">
                                                Owner
                                              </span>
                                              <span className="text-navy/80 font-medium">
                                                {item.owner || "—"}
                                              </span>
                                            </span>
                                            <span className="text-navy/20">·</span>
                                            <span>
                                              <span className="text-navy/40 uppercase tracking-wider text-[10px] mr-1">
                                                Deadline
                                              </span>
                                              <span className="text-navy/80 font-medium tabular-nums">
                                                {formatDeadline(item.deadline)}
                                              </span>
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                            <Select
                                              value={itemEdit.status}
                                              onValueChange={(v) =>
                                                v &&
                                                updateItemEdit(c.id, i, {
                                                  status: v as StatusType,
                                                })
                                              }
                                            >
                                              <SelectTrigger className="h-8 bg-white border-navy/10 text-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {ALL_STATUSES.map((s) => (
                                                  <SelectItem key={s} value={s}>
                                                    {statusLabels[s]}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>

                                            <Button
                                              onClick={() => handleSaveItem(c.id, i)}
                                              disabled={!itemDirty || saving}
                                              className="h-8 bg-navy hover:bg-navy-light text-white text-[11px] tracking-wider uppercase disabled:opacity-40 sm:col-start-3"
                                            >
                                              {saving ? "Saving..." : "Save item"}
                                            </Button>
                                          </div>

                                          {itemEdit.status !== "pending" && (
                                            <textarea
                                              value={itemEdit.notes}
                                              onChange={(e) =>
                                                updateItemEdit(c.id, i, {
                                                  notes: e.target.value.slice(0, 2000),
                                                })
                                              }
                                              placeholder="Notes on progress..."
                                              maxLength={2000}
                                              rows={2}
                                              className="w-full px-2 py-1.5 rounded-md border border-navy/10 bg-white text-xs text-navy/80 placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                c.action_items && c.action_items.length > 0 && (
                                  <div>
                                    <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-2">
                                      Action Items
                                    </p>
                                    <ol className="list-decimal list-inside space-y-1 text-sm text-navy/75 marker:text-navy/30">
                                      {c.action_items.map((item, i) => (
                                        <li key={i}>{item}</li>
                                      ))}
                                    </ol>
                                  </div>
                                )
                              )}

                              {/* Quick observations (collapsible) */}
                              {observationEntries.length > 0 && (
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setObsOpen((prev) => ({
                                        ...prev,
                                        [c.id]: !prev[c.id],
                                      }))
                                    }
                                    className="text-[10px] tracking-[0.15em] uppercase text-navy/50 hover:text-gold font-semibold inline-flex items-center gap-1"
                                  >
                                    <span>{obsExpanded ? "▾" : "▸"}</span>
                                    Quick observations ({observationEntries.length})
                                  </button>
                                  {obsExpanded && (
                                    <ul className="mt-2 space-y-1.5 text-sm text-navy/75 border-l-2 border-navy/10 pl-3">
                                      {observationEntries.map(([dim, text]) => (
                                        <li key={dim}>
                                          <span className="font-semibold text-navy">
                                            {dim}:
                                          </span>{" "}
                                          <span className="text-navy/70">{text}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right: status controls (commitment-level — legacy) */}
                            <div className="space-y-3 md:border-l md:border-navy/5 md:pl-5">
                              <div>
                                <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-2">
                                  {hasDetailed ? "Overall Status" : "Current Status"}
                                </p>
                                <Badge
                                  className={`text-[11px] border ${statusColors[c.status]}`}
                                >
                                  {statusLabels[c.status]}
                                </Badge>
                              </div>

                              <div>
                                <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-2">
                                  Update Status
                                </p>
                                <Select
                                  value={edit.status}
                                  onValueChange={(v) =>
                                    v &&
                                    updateEdit(c.id, {
                                      status: v as StatusType,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-full h-9 bg-white border-navy/10 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ALL_STATUSES.map((s) => (
                                      <SelectItem key={s} value={s}>
                                        {statusLabels[s]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {edit.status !== "pending" && (
                                <div>
                                  <p className="text-[10px] tracking-[0.15em] uppercase text-navy/40 font-semibold mb-2">
                                    Completion Notes
                                  </p>
                                  <textarea
                                    value={edit.completion_notes}
                                    onChange={(e) =>
                                      updateEdit(c.id, {
                                        completion_notes: e.target.value,
                                      })
                                    }
                                    placeholder="What was done, what's left..."
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-navy/10 bg-white text-sm text-navy/80 placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                                  />
                                </div>
                              )}

                              <Button
                                onClick={() => handleSave(c.id)}
                                disabled={!dirty || savingId === c.id}
                                className="w-full h-9 bg-navy hover:bg-navy-light text-white text-xs tracking-wider uppercase disabled:opacity-40"
                              >
                                {savingId === c.id ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
