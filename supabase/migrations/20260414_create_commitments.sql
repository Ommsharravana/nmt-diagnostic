CREATE TABLE commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  vertical_name text NOT NULL,
  region text,
  respondent_name text,
  focus_dimension text NOT NULL,
  focus_dimension_score integer NOT NULL,
  current_level smallint NOT NULL CHECK (current_level BETWEEN 1 AND 5),
  target_level smallint NOT NULL CHECK (target_level BETWEEN 1 AND 5),
  action_items text[] NOT NULL,
  target_meeting text,
  target_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'missed', 'partial')),
  completion_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert commitments" ON commitments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read commitments" ON commitments FOR SELECT USING (true);
CREATE POLICY "Anyone can update commitments" ON commitments FOR UPDATE USING (true);

CREATE INDEX idx_commitments_vertical ON commitments (vertical_name);
CREATE INDEX idx_commitments_status ON commitments (status);
CREATE INDEX idx_commitments_target_meeting ON commitments (target_meeting);
CREATE INDEX idx_commitments_assessment ON commitments (assessment_id);
CREATE INDEX idx_commitments_created ON commitments (created_at DESC);
