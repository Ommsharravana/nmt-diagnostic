CREATE TABLE assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_name text NOT NULL,
  region text,
  respondent_name text,
  total_score integer NOT NULL,
  max_score integer NOT NULL DEFAULT 175,
  percentage real NOT NULL,
  maturity_level smallint NOT NULL CHECK (maturity_level BETWEEN 1 AND 5),
  maturity_state text NOT NULL,
  dimension_scores jsonb NOT NULL,
  full_result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert" ON assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read" ON assessments FOR SELECT USING (true);

CREATE INDEX idx_assessments_vertical ON assessments (vertical_name);
CREATE INDEX idx_assessments_region ON assessments (region);
CREATE INDEX idx_assessments_maturity ON assessments (maturity_level);
CREATE INDEX idx_assessments_created ON assessments (created_at DESC);
