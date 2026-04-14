-- CRUD tables for admin management
-- Seed data inserted after creation

CREATE TABLE dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dim_index smallint NOT NULL UNIQUE CHECK (dim_index BETWEEN 0 AND 20),
  name text NOT NULL,
  short_name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE questions (
  id text PRIMARY KEY,
  dimension_index smallint NOT NULL,
  question_number smallint NOT NULL,
  text text NOT NULL,
  selected boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vertical_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('project', 'stakeholder', 'initiative', 'other', 'custom')),
  sort_order int NOT NULL DEFAULT 100,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE region_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS with public read + public insert/update
-- (admin password validation happens at API level)
ALTER TABLE dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read dimensions" ON dimensions FOR SELECT USING (true);
CREATE POLICY "public write dimensions" ON dimensions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "public write questions" ON questions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read vertical_overrides" ON vertical_overrides FOR SELECT USING (true);
CREATE POLICY "public write vertical_overrides" ON vertical_overrides FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read region_overrides" ON region_overrides FOR SELECT USING (true);
CREATE POLICY "public write region_overrides" ON region_overrides FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_questions_dim ON questions (dimension_index, question_number);
CREATE INDEX idx_questions_selected ON questions (dimension_index) WHERE selected = true;

-- Seed dimensions
INSERT INTO dimensions (dim_index, name, short_name, sort_order) VALUES
  (0, 'Strategic Clarity & Direction', 'Strategy', 0),
  (1, 'Chapter Penetration & Adoption', 'Penetration', 1),
  (2, 'Execution & Standardisation', 'Execution', 2),
  (3, 'Regional Alignment & Effectiveness', 'Regional', 3),
  (4, 'Impact Measurement & Data Discipline', 'Impact', 4),
  (5, 'Brand Strength & Visibility', 'Brand', 5),
  (6, 'Continuity & Sustainability', 'Continuity', 6);

-- Seed questions (all 51 from the Excel)
INSERT INTO questions (id, dimension_index, question_number, text, selected, sort_order) VALUES
  -- Dimension 0: Strategic Clarity & Direction
  ('d0_q0', 0, 1, 'Our vertical has a clearly articulated annual theme aligned with Yi''s national vision.', true, 0),
  ('d0_q1', 0, 2, 'We have defined 2–3 measurable outcomes that define success for this year.', true, 1),
  ('d0_q2', 0, 3, 'Every RM clearly understands our national priorities.', true, 2),
  ('d0_q3', 0, 4, 'Chapters receive structured guidance instead of ad-hoc instructions.', true, 3),
  ('d0_q4', 0, 5, 'We can clearly articulate how our vertical will look stronger by year-end.', true, 4),
  ('d0_q5', 0, 6, 'If asked "Why does this vertical exist?", we can answer in one sharp sentence.', false, 5),
  ('d0_q6', 0, 7, 'Our vertical has a clear differentiation from other verticals (no overlap confusion).', false, 6),
  -- Dimension 1: Chapter Penetration & Adoption
  ('d1_q0', 1, 1, 'Majority of chapters are actively executing our vertical.', true, 0),
  ('d1_q1', 1, 2, 'Activity is spread across regions, not concentrated.', true, 1),
  ('d1_q2', 1, 3, 'We track active vs inactive chapters.', true, 2),
  ('d1_q3', 1, 4, 'We have a strategy to activate low-performing chapters.', true, 3),
  ('d1_q4', 1, 5, 'Chapter leadership perceives our vertical as relevant.', true, 4),
  ('d1_q5', 1, 6, 'We understand why some chapters avoid our vertical.', false, 5),
  ('d1_q6', 1, 7, 'Our vertical is seen as "must-have" rather than optional.', false, 6),
  ('d1_q7', 1, 8, 'We have regional champions driving momentum beyond national push.', false, 7),
  -- Dimension 2: Execution & Standardisation
  ('d2_q0', 2, 1, 'We have SOPs/playbooks/templates.', true, 0),
  ('d2_q1', 2, 2, 'Execution quality is consistent across regions.', true, 1),
  ('d2_q2', 2, 3, 'Chapters don''t reinvent the model each time.', true, 2),
  ('d2_q3', 2, 4, 'Best practices are shared systematically.', true, 3),
  ('d2_q4', 2, 5, 'A new team can execute using our resources.', true, 4),
  ('d2_q5', 2, 6, 'Our vertical has at least one "flagship replicable model."', false, 5),
  ('d2_q6', 2, 7, 'We audit execution quality, not just quantity.', false, 6),
  ('d2_q7', 2, 8, 'There is clarity between experimentation and standard programs.', false, 7),
  -- Dimension 3: Regional Alignment & Effectiveness
  ('d3_q0', 3, 1, 'RMs conduct regular structured interactions.', true, 0),
  ('d3_q1', 3, 2, 'RMs are proactive in guidance and escalation.', true, 1),
  ('d3_q2', 3, 3, 'We review RM performance periodically.', true, 2),
  ('d3_q3', 3, 4, 'Role clarity exists between National, Region, Chapter.', true, 3),
  ('d3_q4', 3, 5, 'Communication flow is efficient.', true, 4),
  ('d3_q5', 3, 6, 'We know which region is strongest and weakest in our vertical — and why.', false, 5),
  ('d3_q6', 3, 7, 'Our regional structure adds value beyond forwarding messages.', false, 6),
  -- Dimension 4: Impact Measurement & Data Discipline
  ('d4_q0', 4, 1, 'We track quantifiable metrics beyond event count.', true, 0),
  ('d4_q1', 4, 2, 'Chapters report data in structured format.', true, 1),
  ('d4_q2', 4, 3, 'We review performance data before planning.', true, 2),
  ('d4_q3', 4, 4, 'We can present clear impact numbers at GC/National.', true, 3),
  ('d4_q4', 4, 5, 'Data influences strategy decisions.', true, 4),
  ('d4_q5', 4, 6, 'We measure outcomes, not just outputs.', false, 5),
  ('d4_q6', 4, 7, 'Our data tells a story of transformation, not activity.', false, 6),
  ('d4_q7', 4, 8, 'We have defined one "North Star Metric" for this vertical.', false, 7),
  -- Dimension 5: Brand Strength & Visibility
  ('d5_q0', 5, 1, 'Our vertical has a recognizable national identity.', true, 0),
  ('d5_q1', 5, 2, 'We collaborate effectively with Branding vertical.', true, 1),
  ('d5_q2', 5, 3, 'Our vertical is visible in national communication.', true, 2),
  ('d5_q3', 5, 4, 'Members associate it with meaningful work.', true, 3),
  ('d5_q4', 5, 5, 'Our vertical has at least one nationally recognisable campaign.', true, 4),
  ('d5_q5', 5, 6, 'We actively document and archive impact stories.', false, 5),
  ('d5_q6', 5, 7, 'Our work is visible beyond Yi (external ecosystem visibility).', false, 6),
  -- Dimension 6: Continuity & Sustainability
  ('d6_q0', 6, 1, 'Proper documentation exists for handover.', true, 0),
  ('d6_q1', 6, 2, 'Institutional memory is maintained.', true, 1),
  ('d6_q2', 6, 3, 'Past knowledge is used in planning.', true, 2),
  ('d6_q3', 6, 4, 'Knowledge is system-driven, not personality-driven.', true, 3),
  ('d6_q4', 6, 5, 'We are building assets (documents, models, partnerships) that outlast us.', true, 4),
  ('d6_q5', 6, 6, 'This year''s team will leave the vertical stronger than they found it.', false, 5);
