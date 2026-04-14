"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { verticals } from "@/lib/yi-data";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  chair_name: string | null;
  co_chair_name: string | null;
  focus_reason: string | null;
  action_items_detailed: ActionItemDetail[] | null;
  dimension_observations: Record<string, string> | null;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function patchCommitment(
  id: string,
  edit: { status: StatusType; completion_notes: string },
  pw: string,
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

async function updateActionItem(
  id: string,
  index: number,
  status: StatusType,
  notes: string,
  pw: string,
): Promise<{ ok?: true; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`/api/commitments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ updateActionItem: { index, status, notes } }),
      signal: controller.signal,
    });
    if (!res.ok) {
      let msg = `Save failed: ${res.status} ${res.statusText}`;
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
      } catch { /* ignore */ }
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

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES: StatusType[] = ["pending", "in_progress", "done", "partial", "missed"];

const statusLabels: Record<StatusType, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
  partial: "Partial",
  missed: "Missed",
};

/** Editorial text + left-border treatment — no background chips */
const statusStyle: Record<StatusType, { text: string; bar: string }> = {
  pending:     { text: "text-slate-500",   bar: "bg-slate-300" },
  in_progress: { text: "text-blue-600",    bar: "bg-blue-500" },
  done:        { text: "text-emerald-700", bar: "bg-emerald-500" },
  partial:     { text: "text-amber-700",   bar: "bg-amber-500" },
  missed:      { text: "text-red-700",     bar: "bg-red-500" },
};

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatDeadline(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function buildChairMailto(c: Commitment): string {
  const subject = `Your NMT Diagnostic Scorecard — ${c.vertical_name}`;
  const greetingNames = [c.chair_name, c.co_chair_name]
    .map((n) => (n ? n.trim() : ""))
    .filter((n) => n.length > 0);
  const greeting = greetingNames.length > 0 ? `Hi ${greetingNames.join(" and ")},` : "Hi,";
  const lines: string[] = [];

  if (greetingNames.length === 0) {
    lines.push("Send to: (add Chair & Co-Chair email addresses in the To: field)");
    lines.push("");
  } else if (!c.chair_name || !c.co_chair_name) {
    lines.push(`Send to: ${greetingNames.join(" and ")} (add missing addresses as needed)`);
    lines.push("");
  }

  lines.push(greeting);
  lines.push("");
  lines.push(`Here is the scorecard for ${c.vertical_name} from the recent NMT diagnostic.`);
  lines.push("");
  lines.push(`Focus dimension: ${c.focus_dimension} (${c.focus_dimension_score}/25)`);
  lines.push(`Maturity movement: L${c.current_level} → L${c.target_level}`);

  if (c.focus_reason && c.focus_reason.trim().length > 0) {
    lines.push("");
    lines.push(`Why this dimension: ${c.focus_reason.trim()}`);
  }

  const detailed = Array.isArray(c.action_items_detailed) ? c.action_items_detailed : null;
  if (detailed && detailed.length > 0) {
    lines.push("");
    lines.push("Action commitments:");
    detailed.forEach((item, i) => {
      const parts: string[] = [`${i + 1}. ${item.text}`];
      if (item.owner) parts.push(`Owner: ${item.owner}`);
      if (item.deadline) parts.push(`Deadline: ${formatDeadline(item.deadline)}`);
      lines.push(parts.join(" — "));
    });
  } else if (Array.isArray(c.action_items) && c.action_items.length > 0) {
    lines.push("");
    lines.push("Action commitments:");
    c.action_items.forEach((text, i) => lines.push(`${i + 1}. ${text}`));
  }

  if (c.target_meeting) {
    lines.push("");
    lines.push(`Follow-up review at: ${c.target_meeting}${c.target_date ? ` (${formatDeadline(c.target_date)})` : ""}`);
  }
  lines.push("");
  lines.push("— Sent from the NMT diagnostic tracker");

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Inline status pill — text-only, editorial */
function StatusPill({ status }: { status: StatusType }) {
  const { text, bar } = statusStyle[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase font-bold ${text}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${bar}`} />
      {statusLabels[status]}
    </span>
  );
}

/** Summary stat — editorial serif number */
function StatCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="py-5 px-6 border-r border-[#0c1425]/8 last:border-r-0 flex flex-col gap-1">
      <span className={`font-display text-[2.6rem] leading-none tabular-nums ${accent ? "text-[#c4a35a]" : "text-[#0c1425]"}`}>
        {value}
      </span>
      <span className="text-[10px] tracking-[0.22em] uppercase font-semibold text-[#0c1425]/35">{label}</span>
    </div>
  );
}

/** Nav link pill */
function NavLink({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  return (
    <a
      href={href}
      className={`inline-flex items-center h-8 px-3.5 text-[10px] tracking-[0.18em] uppercase font-semibold transition-colors rounded-sm ${
        active
          ? "text-[#c4a35a] border border-[#c4a35a]/40 bg-[#c4a35a]/[0.06]"
          : "text-white/50 border border-white/[0.08] hover:text-[#c4a35a] hover:border-[#c4a35a]/25"
      }`}
    >
      {label}
    </a>
  );
}

// ─── Action Item Card ─────────────────────────────────────────────────────────

function ActionItemCard({
  commitmentId,
  index,
  item,
  itemEdits,
  savingItemKey,
  onUpdateEdit,
  onSaveItem,
}: {
  commitmentId: string;
  index: number;
  item: ActionItemDetail;
  itemEdits: Record<string, { status: StatusType; notes: string }>;
  savingItemKey: string | null;
  onUpdateEdit: (cid: string, idx: number, patch: Partial<{ status: StatusType; notes: string }>) => void;
  onSaveItem: (cid: string, idx: number) => void;
}) {
  const key = `${commitmentId}:${index}`;
  const edit = itemEdits[key] ?? { status: (item.status ?? "pending") as StatusType, notes: item.notes ?? "" };
  const isDirty =
    edit.status !== (item.status ?? "pending") || (edit.notes ?? "") !== (item.notes ?? "");
  const isSaving = savingItemKey === key;
  const { text: statusText, bar: statusBar } = statusStyle[edit.status];

  return (
    <div className="border border-[#0c1425]/8 rounded-sm bg-[#fafaf8] p-4 space-y-3">
      {/* Item text + current status */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[#0c1425] leading-relaxed">
          <span className="text-[#0c1425]/30 font-semibold mr-1.5">{index + 1}.</span>
          {item.text}
        </p>
        <span className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase font-bold ${statusText}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusBar}`} />
          {statusLabels[(item.status ?? "pending") as StatusType]}
        </span>
      </div>

      {/* Owner + deadline metadata */}
      <div className="flex gap-5 text-[11px] text-[#0c1425]/50">
        <span>
          <span className="text-[9px] tracking-[0.18em] uppercase text-[#0c1425]/30 font-semibold mr-1.5">Owner</span>
          <span className="font-medium text-[#0c1425]/70">{item.owner || "—"}</span>
        </span>
        <span>
          <span className="text-[9px] tracking-[0.18em] uppercase text-[#0c1425]/30 font-semibold mr-1.5">Due</span>
          <span className="font-medium text-[#0c1425]/70 tabular-nums">{formatDeadline(item.deadline)}</span>
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#0c1425]/6">
        <select
          value={edit.status}
          onChange={(e) => onUpdateEdit(commitmentId, index, { status: e.target.value as StatusType })}
          className="h-7 px-2 pr-6 rounded-sm border border-[#0c1425]/12 bg-white text-[11px] text-[#0c1425]/70 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50 appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%230c142540'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
          }}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>

        <button
          onClick={() => onSaveItem(commitmentId, index)}
          disabled={!isDirty || isSaving}
          className="h-7 px-3 rounded-sm bg-[#0c1425] text-white text-[10px] tracking-[0.15em] uppercase font-bold hover:bg-[#162033] disabled:opacity-30 transition-colors"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Notes textarea — shown when status is set */}
      {edit.status !== "pending" && (
        <textarea
          value={edit.notes}
          onChange={(e) => onUpdateEdit(commitmentId, index, { notes: e.target.value.slice(0, 2000) })}
          placeholder="Progress notes…"
          maxLength={2000}
          rows={2}
          className="w-full px-3 py-2 rounded-sm border border-[#0c1425]/10 bg-white text-xs text-[#0c1425]/80 placeholder:text-[#0c1425]/25 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50 resize-none"
        />
      )}
    </div>
  );
}

// ─── Commitment Card ──────────────────────────────────────────────────────────

function CommitmentCard({
  c,
  edits,
  itemEdits,
  savingId,
  savingItemKey,
  obsOpen,
  onUpdateEdit,
  onUpdateItemEdit,
  onSave,
  onSaveItem,
  onToggleObs,
}: {
  c: Commitment;
  edits: Record<string, { status: StatusType; completion_notes: string }>;
  itemEdits: Record<string, { status: StatusType; notes: string }>;
  savingId: string | null;
  savingItemKey: string | null;
  obsOpen: Record<string, boolean>;
  onUpdateEdit: (id: string, patch: Partial<{ status: StatusType; completion_notes: string }>) => void;
  onUpdateItemEdit: (cid: string, idx: number, patch: Partial<{ status: StatusType; notes: string }>) => void;
  onSave: (id: string) => void;
  onSaveItem: (cid: string, idx: number) => void;
  onToggleObs: (id: string) => void;
}) {
  const edit = edits[c.id] ?? { status: c.status, completion_notes: c.completion_notes ?? "" };
  const isDirty =
    edit.status !== c.status || edit.completion_notes !== (c.completion_notes ?? "");

  const hasDetailed =
    Array.isArray(c.action_items_detailed) && c.action_items_detailed.length > 0;

  const headerParts: string[] = [];
  if (c.chair_name) headerParts.push(c.chair_name);
  if (c.co_chair_name) headerParts.push(c.co_chair_name);
  const leaderDisplay = headerParts.length > 0
    ? headerParts.join(" · ")
    : (c.respondent_name ?? null);

  const observations = c.dimension_observations ?? null;
  const observationEntries = observations
    ? Object.entries(observations).filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    : [];
  const obsExpanded = !!obsOpen[c.id];

  return (
    <article className="bg-white border border-[#0c1425]/8 rounded-sm overflow-hidden">
      {/* Card header — accent left border in gold */}
      <div className="flex border-l-[3px] border-[#c4a35a]">
        <div className="flex-1 px-6 py-5">
          {/* Vertical + region + leaders row */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h3 className="font-display text-xl text-[#0c1425] leading-tight">
                {c.vertical_name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {c.region && (
                  <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-[#0c1425]/35">
                    {c.region}
                  </span>
                )}
                {leaderDisplay && (
                  <>
                    {c.region && <span className="text-[#0c1425]/20 text-xs">·</span>}
                    <span className="text-xs italic text-[#0c1425]/45">{leaderDisplay}</span>
                  </>
                )}
              </div>
            </div>

            {/* Right meta cluster */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <time className="text-[10px] tabular-nums text-[#0c1425]/30">
                {new Date(c.created_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </time>
              <div className="flex items-center gap-2">
                <a
                  href={buildChairMailto(c)}
                  className="h-7 px-3 inline-flex items-center rounded-sm border border-[#0c1425]/12 text-[9px] tracking-[0.18em] uppercase font-bold text-[#0c1425]/45 hover:text-[#c4a35a] hover:border-[#c4a35a]/40 transition-colors"
                  title="Open email draft to Chair & Co-Chair"
                >
                  Email Chairs
                </a>
                <a
                  href={`/admin/present/${c.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-7 px-3 inline-flex items-center rounded-sm border border-[#c4a35a]/40 text-[9px] tracking-[0.18em] uppercase font-bold text-[#c4a35a] hover:bg-[#c4a35a]/8 transition-colors"
                  title="Open full-screen presentation view"
                >
                  Present ↗
                </a>
              </div>
            </div>
          </div>

          {/* Horizontal rule */}
          <hr className="border-0 border-t border-[#0c1425]/6 my-3" />

          {/* Focus line */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm mb-3">
            <span className="text-[9px] tracking-[0.22em] uppercase font-bold text-[#0c1425]/30">
              Focus
            </span>
            <span className="font-semibold text-[#0c1425]">{c.focus_dimension}</span>
            <span className="text-[#0c1425]/25">·</span>
            <span className="text-[#0c1425]/40 text-xs tabular-nums">{c.focus_dimension_score}/25</span>
            <span className="text-[#0c1425]/25">·</span>
            <span className="text-[#0c1425]/60 font-semibold tabular-nums">
              L{c.current_level}
            </span>
            <span className="text-[#c4a35a] text-xs">→</span>
            <span className="text-[#c4a35a] font-bold tabular-nums">
              L{c.target_level}
            </span>
          </div>

          {/* Focus reason — italic block quote */}
          {c.focus_reason && c.focus_reason.trim().length > 0 && (
            <blockquote className="text-sm italic text-[#0c1425]/50 border-l-2 border-[#c4a35a]/30 pl-3.5 py-1 mb-4 leading-relaxed">
              {c.focus_reason}
            </blockquote>
          )}
        </div>
      </div>

      {/* Body — 2-column: action items + status sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-t border-[#0c1425]/6">

        {/* Left: action items (2 cols wide) */}
        <div className="md:col-span-2 px-6 py-5 space-y-4">
          {/* Detailed action items */}
          {hasDetailed ? (
            <div className="space-y-2">
              <p className="text-[9px] tracking-[0.22em] uppercase font-bold text-[#0c1425]/30 mb-3">
                Action Commitments
              </p>
              <div className="space-y-3">
                {c.action_items_detailed!.map((item, i) => (
                  <ActionItemCard
                    key={i}
                    commitmentId={c.id}
                    index={i}
                    item={item}
                    itemEdits={itemEdits}
                    savingItemKey={savingItemKey}
                    onUpdateEdit={onUpdateItemEdit}
                    onSaveItem={onSaveItem}
                  />
                ))}
              </div>
            </div>
          ) : (
            c.action_items && c.action_items.length > 0 && (
              <div>
                <p className="text-[9px] tracking-[0.22em] uppercase font-bold text-[#0c1425]/30 mb-3">
                  Action Commitments
                </p>
                <ol className="space-y-2">
                  {c.action_items.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-[#0c1425]/70 leading-relaxed">
                      <span className="text-[#0c1425]/25 font-semibold tabular-nums shrink-0 mt-px">{i + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )
          )}

          {/* Quick observations (collapsible) */}
          {observationEntries.length > 0 && (
            <div className="pt-2 border-t border-[#0c1425]/6">
              <button
                type="button"
                onClick={() => onToggleObs(c.id)}
                className="text-[9px] tracking-[0.22em] uppercase font-bold text-[#0c1425]/35 hover:text-[#c4a35a] inline-flex items-center gap-1.5 transition-colors"
              >
                <span className="text-[10px]">{obsExpanded ? "▾" : "▸"}</span>
                Quick Observations ({observationEntries.length})
              </button>
              {obsExpanded && (
                <ul className="mt-3 space-y-2 border-l-2 border-[#0c1425]/8 pl-4">
                  {observationEntries.map(([dim, text]) => (
                    <li key={dim} className="text-sm leading-relaxed">
                      <span className="font-semibold text-[#0c1425]/70">{dim}: </span>
                      <span className="text-[#0c1425]/50">{text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Right: status sidebar */}
        <div className="md:border-l border-t md:border-t-0 border-[#0c1425]/6 px-6 py-5 space-y-5 bg-[#fafaf8]/60">
          {/* Current overall status */}
          <div>
            <p className="text-[9px] tracking-[0.22em] uppercase font-bold text-[#0c1425]/30 mb-2">
              {hasDetailed ? "Overall Status" : "Status"}
            </p>
            <StatusPill status={c.status} />
          </div>

          {/* Update status */}
          <div>
            <p className="text-[9px] tracking-[0.22em] uppercase font-bold text-[#0c1425]/30 mb-2">
              Update
            </p>
            <select
              value={edit.status}
              onChange={(e) => onUpdateEdit(c.id, { status: e.target.value as StatusType })}
              className="w-full h-8 px-3 pr-7 rounded-sm border border-[#0c1425]/12 bg-white text-xs text-[#0c1425]/70 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%230c142540'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </div>

          {/* Completion notes */}
          {edit.status !== "pending" && (
            <div>
              <p className="text-[9px] tracking-[0.22em] uppercase font-bold text-[#0c1425]/30 mb-2">
                Notes
              </p>
              <textarea
                value={edit.completion_notes}
                onChange={(e) => onUpdateEdit(c.id, { completion_notes: e.target.value })}
                placeholder="What was done, what's left…"
                rows={3}
                className="w-full px-3 py-2 rounded-sm border border-[#0c1425]/10 bg-white text-xs text-[#0c1425]/80 placeholder:text-[#0c1425]/25 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50 resize-none"
              />
            </div>
          )}

          {/* Save button */}
          <button
            onClick={() => onSave(c.id)}
            disabled={!isDirty || savingId === c.id}
            className="w-full h-8 rounded-sm bg-[#0c1425] text-white text-[10px] tracking-[0.18em] uppercase font-bold hover:bg-[#162033] disabled:opacity-30 transition-colors"
          >
            {savingId === c.id ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommitmentsPage() {
  const [storedPassword, setStoredPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterVertical, setFilterVertical] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMeeting, setFilterMeeting] = useState("");

  const [edits, setEdits] = useState<
    Record<string, { status: StatusType; completion_notes: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [itemEdits, setItemEdits] = useState<
    Record<string, { status: StatusType; notes: string }>
  >({});
  const [savingItemKey, setSavingItemKey] = useState<string | null>(null);

  const [obsOpen, setObsOpen] = useState<Record<string, boolean>>({});

  // Auth check + ?vertical= query param
  useEffect(() => {
    const saved = sessionStorage.getItem("nmt-admin-pw");
    if (!saved) {
      window.location.href = "/admin";
      return;
    }
    setStoredPassword(saved);
    setAuthenticated(true);

    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const v = sp.get("vertical");
      if (v && v.trim().length > 0) setFilterVertical(v);
    }
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

  // Sync edit state when commitments load
  useEffect(() => {
    const next: Record<string, { status: StatusType; completion_notes: string }> = {};
    const nextItems: Record<string, { status: StatusType; notes: string }> = {};
    commitments.forEach((c) => {
      next[c.id] = { status: c.status, completion_notes: c.completion_notes ?? "" };
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

  const updateEdit = (id: string, patch: Partial<{ status: StatusType; completion_notes: string }>) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { status: prev[id]?.status ?? "pending", completion_notes: prev[id]?.completion_notes ?? "", ...patch },
    }));
  };

  const updateItemEdit = (commitmentId: string, index: number, patch: Partial<{ status: StatusType; notes: string }>) => {
    const key = `${commitmentId}:${index}`;
    setItemEdits((prev) => ({
      ...prev,
      [key]: { status: prev[key]?.status ?? "pending", notes: prev[key]?.notes ?? "", ...patch },
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
    const result = await updateActionItem(commitmentId, index, edit.status, edit.notes ?? "", storedPassword);
    if (result.error) alert(result.error);
    else await fetchCommitments();
    setSavingItemKey(null);
  };

  // Summary stats
  const stats = useMemo(() => {
    let total = 0, done = 0, inProgress = 0, pendingMissed = 0;
    commitments.forEach((c) => {
      if (Array.isArray(c.action_items_detailed) && c.action_items_detailed.length > 0) {
        c.action_items_detailed.forEach((item) => {
          total += 1;
          const s = (item.status ?? "pending") as StatusType;
          if (s === "done") done += 1;
          else if (s === "in_progress" || s === "partial") inProgress += 1;
          else pendingMissed += 1;
        });
      } else {
        total += 1;
        const s = c.status;
        if (s === "done") done += 1;
        else if (s === "in_progress" || s === "partial") inProgress += 1;
        else pendingMissed += 1;
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
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
  }, [commitments]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <span className="text-[10px] tracking-[0.25em] uppercase text-[#0c1425]/30 font-semibold">
          Redirecting…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8]" style={{ fontFamily: "var(--font-body, system-ui)" }}>

      {/* ── Masthead ──────────────────────────────────────────────────── */}
      <header className="bg-[#0c1425]">
        <div className="border-b border-[#c4a35a]/20" />
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] tracking-[0.38em] uppercase text-[#c4a35a]/50 font-semibold mb-1.5">
              Young Indians · NMT Diagnostic
            </p>
            <h1 className="font-display text-[1.85rem] leading-tight text-white tracking-tight">
              Commitments Tracker
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end pb-1">
            <NavLink href="/admin" label="Dashboard" />
            <NavLink href="/admin/live" label="Live View" />
            <NavLink href="/admin/commitments" label="Commitments" active />
            <NavLink href="/" label="← Test" />
          </div>
        </div>
        <div className="border-b border-white/[0.06]" />
        <div className="border-b border-[#c4a35a]/20 mt-[1px]" />
      </header>

      {/* ── Stat band ─────────────────────────────────────────────────── */}
      <div className="border-b border-[#0c1425]/8 bg-white">
        <div className="max-w-7xl mx-auto px-2">
          <div className="grid grid-cols-2 sm:flex sm:flex-row divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-[#0c1425]/8">
            <StatCell label="Total Action Items" value={stats.total.toString()} />
            <StatCell label="Completed" value={stats.done.toString()} accent />
            <StatCell label="In Progress" value={stats.inProgress.toString()} />
            <StatCell label="Pending / Missed" value={stats.pendingMissed.toString()} />
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Filter bar ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterVertical}
            onChange={(e) => setFilterVertical(e.target.value)}
            className="h-8 px-3 pr-7 rounded-sm border border-[#0c1425]/12 bg-white text-xs text-[#0c1425]/70 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%230c142540'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
          >
            <option value="all">All Verticals</option>
            {verticals.map((v) => (
              <option key={v.name} value={v.name}>{v.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 px-3 pr-7 rounded-sm border border-[#0c1425]/12 bg-white text-xs text-[#0c1425]/70 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%230c142540'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
          >
            <option value="all">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>

          <input
            type="text"
            value={filterMeeting}
            onChange={(e) => setFilterMeeting(e.target.value)}
            placeholder="Target meeting…"
            className="h-8 px-3 rounded-sm border border-[#0c1425]/12 bg-white text-xs text-[#0c1425]/70 placeholder:text-[#0c1425]/30 focus:outline-none focus:ring-1 focus:ring-[#c4a35a]/50 w-52"
          />

          <div className="flex-1" />

          <span className="text-[10px] tracking-[0.15em] uppercase text-[#0c1425]/30 font-semibold">
            {commitments.length} commitment{commitments.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Content ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="py-20 text-center">
            <span className="text-[10px] tracking-[0.22em] uppercase text-[#0c1425]/25 font-semibold">
              Loading commitments…
            </span>
          </div>
        ) : commitments.length === 0 ? (
          <div className="py-20 bg-white border border-[#0c1425]/8 rounded-sm text-center">
            <p className="font-display text-2xl text-[#0c1425]/50 mb-2">
              No commitments captured yet
            </p>
            <p className="text-sm text-[#0c1425]/30">
              They will appear here as verticals complete their assessments.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(([meeting, items]) => (
              <section key={meeting} className="space-y-4">
                {/* Section heading — editorial double-rule treatment */}
                <div>
                  <div className="border-t-2 border-[#0c1425] mb-2" />
                  <div className="flex items-baseline justify-between pb-2 border-b border-[#0c1425]/12">
                    <h2 className="font-display text-2xl text-[#0c1425]">
                      {meeting}
                    </h2>
                    <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#0c1425]/30">
                      {items.length} commitment{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {items.map((c) => (
                    <CommitmentCard
                      key={c.id}
                      c={c}
                      edits={edits}
                      itemEdits={itemEdits}
                      savingId={savingId}
                      savingItemKey={savingItemKey}
                      obsOpen={obsOpen}
                      onUpdateEdit={updateEdit}
                      onUpdateItemEdit={updateItemEdit}
                      onSave={handleSave}
                      onSaveItem={handleSaveItem}
                      onToggleObs={(id) => setObsOpen((prev) => ({ ...prev, [id]: !prev[id] }))}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
