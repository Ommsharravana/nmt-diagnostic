import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ALLOWED_ITEM_STATUSES = [
  "pending",
  "in_progress",
  "done",
  "partial",
  "missed",
] as const;
type ActionItemStatus = (typeof ALLOWED_ITEM_STATUSES)[number];

interface ActionItemDetailed {
  text: string;
  owner: string;
  deadline: string;
  status: ActionItemStatus;
  notes?: string;
}

function isValidYmd(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === value;
}

// GET — fetch a single commitment by ID (no auth — for follow-up UX)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("commitments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH — update commitment fields
// No auth required: RLS policy allows public updates, and the retake flow
// lets respondents close the loop on their own prior commitments. The admin
// UI still sends an x-admin-password header, which is safely ignored.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    const errors: string[] = [];
    const allowedStatuses = ["pending", "in_progress", "done", "missed", "partial"];

    // --- Validate top-level status / completion_notes ---
    if (body.status !== undefined && !allowedStatuses.includes(body.status)) {
      errors.push(`status must be one of: ${allowedStatuses.join(", ")}`);
    }

    if (body.completion_notes !== undefined) {
      if (typeof body.completion_notes !== "string") {
        errors.push("completion_notes must be a string");
      } else if (body.completion_notes.length > 2000) {
        errors.push("completion_notes must be at most 2000 characters");
      }
    }

    // --- Validate simple string updates ---
    if (body.chairName !== undefined && body.chairName !== null) {
      if (typeof body.chairName !== "string" || body.chairName.trim().length === 0) {
        errors.push("chairName must be a non-empty string when provided");
      } else if (body.chairName.length > 100) {
        errors.push("chairName must be at most 100 characters");
      }
    }

    if (body.coChairName !== undefined && body.coChairName !== null) {
      if (typeof body.coChairName !== "string" || body.coChairName.trim().length === 0) {
        errors.push("coChairName must be a non-empty string when provided");
      } else if (body.coChairName.length > 100) {
        errors.push("coChairName must be at most 100 characters");
      }
    }

    if (body.focusReason !== undefined && body.focusReason !== null) {
      if (typeof body.focusReason !== "string") {
        errors.push("focusReason must be a string");
      } else if (body.focusReason.length > 1000) {
        errors.push("focusReason must be at most 1000 characters");
      }
    }

    // --- Validate actionItemsDetailed (full replacement) ---
    let validatedActionItemsDetailed: ActionItemDetailed[] | undefined;
    if (body.actionItemsDetailed !== undefined) {
      if (!Array.isArray(body.actionItemsDetailed) || body.actionItemsDetailed.length !== 3) {
        errors.push("actionItemsDetailed must be an array of exactly 3 items");
      } else {
        const validated: ActionItemDetailed[] = [];
        for (let i = 0; i < body.actionItemsDetailed.length; i++) {
          const item = body.actionItemsDetailed[i];
          if (!item || typeof item !== "object") {
            errors.push(`actionItemsDetailed[${i}] must be an object`);
            continue;
          }

          const text = item.text;
          const owner = item.owner;
          const deadline = item.deadline;
          const status = item.status;
          const notes = item.notes;

          let itemValid = true;

          if (typeof text !== "string" || text.trim().length === 0) {
            errors.push(`actionItemsDetailed[${i}].text must be a non-empty string`);
            itemValid = false;
          } else if (text.length > 500) {
            errors.push(`actionItemsDetailed[${i}].text must be at most 500 characters`);
            itemValid = false;
          }

          if (typeof owner !== "string" || owner.trim().length === 0) {
            errors.push(`actionItemsDetailed[${i}].owner must be a non-empty string`);
            itemValid = false;
          } else if (owner.length > 100) {
            errors.push(`actionItemsDetailed[${i}].owner must be at most 100 characters`);
            itemValid = false;
          }

          if (!isValidYmd(deadline)) {
            errors.push(`actionItemsDetailed[${i}].deadline must be a valid YYYY-MM-DD date`);
            itemValid = false;
          }

          let resolvedStatus: ActionItemStatus = "pending";
          if (status !== undefined && status !== null) {
            if (
              typeof status !== "string" ||
              !(ALLOWED_ITEM_STATUSES as readonly string[]).includes(status)
            ) {
              errors.push(
                `actionItemsDetailed[${i}].status must be one of: ${ALLOWED_ITEM_STATUSES.join(", ")}`,
              );
              itemValid = false;
            } else {
              resolvedStatus = status as ActionItemStatus;
            }
          }

          if (notes !== undefined && notes !== null) {
            if (typeof notes !== "string") {
              errors.push(`actionItemsDetailed[${i}].notes must be a string`);
              itemValid = false;
            } else if (notes.length > 2000) {
              errors.push(`actionItemsDetailed[${i}].notes must be at most 2000 characters`);
              itemValid = false;
            }
          }

          if (itemValid) {
            const entry: ActionItemDetailed = {
              text: (text as string).trim(),
              owner: (owner as string).trim(),
              deadline: deadline as string,
              status: resolvedStatus,
            };
            if (typeof notes === "string") entry.notes = notes;
            validated.push(entry);
          }
        }
        if (validated.length === 3) validatedActionItemsDetailed = validated;
      }
    }

    // --- Validate dimensionObservations (full replacement) ---
    let validatedDimensionObservations: Record<string, string> | undefined;
    if (body.dimensionObservations !== undefined) {
      const raw = body.dimensionObservations;
      if (typeof raw !== "object" || Array.isArray(raw) || raw === null) {
        errors.push("dimensionObservations must be an object keyed by dimension index");
      } else {
        const validated: Record<string, string> = {};
        let ok = true;
        for (const [key, value] of Object.entries(raw)) {
          if (typeof key !== "string" || key.trim().length === 0) {
            errors.push("dimensionObservations keys must be non-empty strings");
            ok = false;
            continue;
          }
          if (typeof value !== "string") {
            errors.push(`dimensionObservations["${key}"] must be a string`);
            ok = false;
            continue;
          }
          if (value.length > 500) {
            errors.push(`dimensionObservations["${key}"] must be at most 500 characters`);
            ok = false;
            continue;
          }
          validated[key] = value;
        }
        if (ok) validatedDimensionObservations = validated;
      }
    }

    // --- Validate updateActionItem (individual item patch) ---
    let updateActionItemPayload:
      | { index: number; status?: ActionItemStatus; notes?: string }
      | undefined;
    if (body.updateActionItem !== undefined && body.updateActionItem !== null) {
      const u = body.updateActionItem;
      if (typeof u !== "object" || Array.isArray(u)) {
        errors.push("updateActionItem must be an object");
      } else {
        const index = u.index;
        if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index > 2) {
          errors.push("updateActionItem.index must be 0, 1, or 2");
        }

        let itemStatus: ActionItemStatus | undefined;
        if (u.status !== undefined && u.status !== null) {
          if (
            typeof u.status !== "string" ||
            !(ALLOWED_ITEM_STATUSES as readonly string[]).includes(u.status)
          ) {
            errors.push(
              `updateActionItem.status must be one of: ${ALLOWED_ITEM_STATUSES.join(", ")}`,
            );
          } else {
            itemStatus = u.status as ActionItemStatus;
          }
        }

        let itemNotes: string | undefined;
        if (u.notes !== undefined && u.notes !== null) {
          if (typeof u.notes !== "string") {
            errors.push("updateActionItem.notes must be a string");
          } else if (u.notes.length > 2000) {
            errors.push("updateActionItem.notes must be at most 2000 characters");
          } else {
            itemNotes = u.notes;
          }
        }

        if (u.status === undefined && u.notes === undefined) {
          errors.push("updateActionItem must include at least one of status or notes");
        }

        if (
          typeof index === "number" &&
          Number.isInteger(index) &&
          index >= 0 &&
          index <= 2
        ) {
          updateActionItemPayload = { index, status: itemStatus, notes: itemNotes };
        }
      }
    }

    // --- Require at least one update ---
    const hasAnyUpdate =
      body.status !== undefined ||
      body.completion_notes !== undefined ||
      body.chairName !== undefined ||
      body.coChairName !== undefined ||
      body.focusReason !== undefined ||
      body.actionItemsDetailed !== undefined ||
      body.dimensionObservations !== undefined ||
      body.updateActionItem !== undefined;

    if (!hasAnyUpdate) {
      errors.push(
        "At least one of status, completion_notes, chairName, coChairName, focusReason, actionItemsDetailed, dimensionObservations, or updateActionItem must be provided",
      );
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 422 });
    }

    // --- Build updates ---
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) updates.status = body.status;
    if (body.completion_notes !== undefined) updates.completion_notes = body.completion_notes;

    if (body.chairName !== undefined) {
      updates.chair_name =
        typeof body.chairName === "string" && body.chairName.trim().length > 0
          ? body.chairName.trim()
          : null;
    }
    if (body.coChairName !== undefined) {
      updates.co_chair_name =
        typeof body.coChairName === "string" && body.coChairName.trim().length > 0
          ? body.coChairName.trim()
          : null;
    }
    if (body.focusReason !== undefined) {
      updates.focus_reason =
        typeof body.focusReason === "string" ? body.focusReason : null;
    }

    if (validatedActionItemsDetailed !== undefined) {
      updates.action_items_detailed = validatedActionItemsDetailed;
    }
    if (validatedDimensionObservations !== undefined) {
      updates.dimension_observations = validatedDimensionObservations;
    }

    // --- Handle individual action item patch (fetch, merge, write back) ---
    if (updateActionItemPayload) {
      const { data: current, error: fetchError } = await supabase
        .from("commitments")
        .select("action_items_detailed")
        .eq("id", id)
        .single();

      if (fetchError || !current) {
        return NextResponse.json(
          { error: fetchError?.message || "Commitment not found" },
          { status: 404 },
        );
      }

      const existing = Array.isArray(current.action_items_detailed)
        ? (current.action_items_detailed as ActionItemDetailed[])
        : [];

      if (existing.length === 0) {
        return NextResponse.json(
          { error: "Commitment has no action_items_detailed to update" },
          { status: 422 },
        );
      }

      const { index, status: newStatus, notes: newNotes } = updateActionItemPayload;
      if (index >= existing.length) {
        return NextResponse.json(
          { error: `updateActionItem.index ${index} is out of range for this commitment` },
          { status: 422 },
        );
      }

      const merged = existing.map((item, i) => {
        if (i !== index) return item;
        const next: ActionItemDetailed = { ...item };
        if (newStatus !== undefined) next.status = newStatus;
        if (newNotes !== undefined) next.notes = newNotes;
        return next;
      });

      // If the explicit actionItemsDetailed replacement was ALSO provided, the
      // explicit replacement already wrote to updates above — we merge on top
      // so the individual patch still takes effect on the final value.
      const base =
        validatedActionItemsDetailed !== undefined
          ? (updates.action_items_detailed as ActionItemDetailed[])
          : merged;

      if (validatedActionItemsDetailed !== undefined) {
        // Apply the per-item patch on top of the full replacement
        const final = base.map((item, i) => {
          if (i !== index) return item;
          const next: ActionItemDetailed = { ...item };
          if (newStatus !== undefined) next.status = newStatus;
          if (newNotes !== undefined) next.notes = newNotes;
          return next;
        });
        updates.action_items_detailed = final;
      } else {
        updates.action_items_detailed = merged;
      }
    }

    const { data, error } = await supabase
      .from("commitments")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Commitment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
