import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Allowed statuses for individual action items (matches top-level commitment statuses)
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

// Strict YYYY-MM-DD check (also validates real-calendar dates)
function isValidYmd(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  // Guard against things like 2026-02-31 being coerced
  return d.toISOString().slice(0, 10) === value;
}

// POST — save a new commitment (no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // --- Input validation ---
    const errors: string[] = [];

    if (typeof body.assessmentId !== "string" || body.assessmentId.trim().length === 0) {
      errors.push("assessmentId must be a non-empty string");
    }

    if (typeof body.verticalName !== "string" || body.verticalName.trim().length === 0) {
      errors.push("verticalName must be a non-empty string");
    } else if (body.verticalName.length > 100) {
      errors.push("verticalName must be at most 100 characters");
    }

    if (typeof body.focusDimension !== "string" || body.focusDimension.trim().length === 0) {
      errors.push("focusDimension must be a non-empty string");
    } else if (body.focusDimension.length > 200) {
      errors.push("focusDimension must be at most 200 characters");
    }

    if (
      typeof body.focusDimensionScore !== "number" ||
      body.focusDimensionScore < 0 ||
      body.focusDimensionScore > 25
    ) {
      errors.push("focusDimensionScore must be a number between 0 and 25");
    }

    if (
      typeof body.currentLevel !== "number" ||
      ![1, 2, 3, 4, 5].includes(body.currentLevel)
    ) {
      errors.push("currentLevel must be 1, 2, 3, 4, or 5");
    }

    if (
      typeof body.targetLevel !== "number" ||
      ![1, 2, 3, 4, 5].includes(body.targetLevel)
    ) {
      errors.push("targetLevel must be 1, 2, 3, 4, or 5");
    }

    // actionItems (legacy string[]) — still validated for backward compat
    if (!Array.isArray(body.actionItems) || body.actionItems.length !== 3) {
      errors.push("actionItems must be an array of exactly 3 items");
    } else {
      for (let i = 0; i < body.actionItems.length; i++) {
        const item = body.actionItems[i];
        if (typeof item !== "string" || item.trim().length === 0) {
          errors.push(`actionItems[${i}] must be a non-empty string`);
        } else if (item.length > 500) {
          errors.push(`actionItems[${i}] must be at most 500 characters`);
        }
      }
    }

    if (
      body.targetMeeting !== null &&
      body.targetMeeting !== undefined &&
      (typeof body.targetMeeting !== "string" || body.targetMeeting.length > 200)
    ) {
      errors.push("targetMeeting must be a string of at most 200 characters");
    }

    // --- New optional fields (Rohan's Action Commitment Sheet) ---

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

    let actionItemsDetailed: ActionItemDetailed[] | null = null;
    if (body.actionItemsDetailed !== undefined && body.actionItemsDetailed !== null) {
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
        if (validated.length === 3) actionItemsDetailed = validated;
      }
    }

    let dimensionObservations: Record<string, string> | null = null;
    if (body.dimensionObservations !== undefined && body.dimensionObservations !== null) {
      const raw = body.dimensionObservations;
      if (
        typeof raw !== "object" ||
        Array.isArray(raw) ||
        raw === null
      ) {
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
        if (ok) dimensionObservations = validated;
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 422 });
    }

    // Synthesize actionItemsDetailed from the legacy actionItems array if not provided
    const targetDateForFallback: string | null =
      typeof body.targetDate === "string" && body.targetDate.length > 0 ? body.targetDate : null;

    const finalActionItemsDetailed: ActionItemDetailed[] =
      actionItemsDetailed ??
      (body.actionItems as string[]).map((text: string) => ({
        text,
        owner: "",
        deadline: targetDateForFallback ?? "",
        status: "pending" as const,
      }));

    const row = {
      assessment_id: body.assessmentId,
      vertical_name: body.verticalName,
      region: body.region || null,
      respondent_name: body.respondentName || null,
      focus_dimension: body.focusDimension,
      focus_dimension_score: body.focusDimensionScore,
      current_level: body.currentLevel,
      target_level: body.targetLevel,
      action_items: body.actionItems,
      target_meeting: body.targetMeeting || null,
      target_date: body.targetDate || null,
      chair_name:
        typeof body.chairName === "string" && body.chairName.trim().length > 0
          ? body.chairName.trim()
          : null,
      co_chair_name:
        typeof body.coChairName === "string" && body.coChairName.trim().length > 0
          ? body.coChairName.trim()
          : null,
      focus_reason: typeof body.focusReason === "string" ? body.focusReason : null,
      action_items_detailed: finalActionItemsDetailed,
      dimension_observations: dimensionObservations ?? null,
    };

    const { data, error } = await supabase
      .from("commitments")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// GET — list commitments with filters (admin password required)
export async function GET(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vertical = searchParams.get("vertical");
  const status = searchParams.get("status");
  const targetMeeting = searchParams.get("target_meeting");
  const assessmentId = searchParams.get("assessment_id");

  let query = supabase
    .from("commitments")
    .select("*")
    .order("created_at", { ascending: false });

  if (vertical) query = query.eq("vertical_name", vertical);
  if (status) query = query.eq("status", status);
  if (targetMeeting) query = query.eq("target_meeting", targetMeeting);
  if (assessmentId) query = query.eq("assessment_id", assessmentId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
