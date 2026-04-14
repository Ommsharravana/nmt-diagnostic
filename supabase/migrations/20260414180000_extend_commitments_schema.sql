-- Extend commitments to match Rohan's Action Commitment Sheet (April 2026)
-- Adds: Chair + Co-Chair names, focus rationale, per-action-item structure,
-- per-dimension observations.

ALTER TABLE commitments
  ADD COLUMN IF NOT EXISTS chair_name text,
  ADD COLUMN IF NOT EXISTS co_chair_name text,
  ADD COLUMN IF NOT EXISTS focus_reason text,
  ADD COLUMN IF NOT EXISTS action_items_detailed jsonb,
  ADD COLUMN IF NOT EXISTS dimension_observations jsonb;

-- action_items_detailed shape:
-- [
--   { "text": "...", "owner": "...", "deadline": "2026-07-17",
--     "status": "pending", "notes": "" },
--   ... (exactly 3)
-- ]
--
-- dimension_observations shape:
-- { "0": "Quick observation text", "1": "...", ... (keyed by dim_index) }

COMMENT ON COLUMN commitments.chair_name IS 'Vertical Chair name (jointly takes assessment)';
COMMENT ON COLUMN commitments.co_chair_name IS 'Vertical Co-Chair name';
COMMENT ON COLUMN commitments.focus_reason IS 'Why this dimension? rationale from Action Commitment Sheet';
COMMENT ON COLUMN commitments.action_items_detailed IS 'Per-item structured: {text, owner, deadline, status, notes}[]';
COMMENT ON COLUMN commitments.dimension_observations IS 'Quick observations keyed by dim_index (0-6)';
