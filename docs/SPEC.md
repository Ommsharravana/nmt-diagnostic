# NMT Vertical Diagnostic Test — Specification

## 1. Overview

A web app for Yi (Young Indians) National Management Team to assess the maturity of any vertical (MASOOM, Health, Climate Change, etc.) across 7 dimensions. A vertical leader answers 35 questions (5 per dimension, scored 1-5), and gets instant visual results showing dimension health, overall maturity level, and actionable recommendations.

**Target users:** Yi National vertical chairs, co-chairs, and regional managers
**Access:** Public URL, no login required
**Device:** Mobile-first (most Yi leaders use phones)

---

## 2. User Flow

```
Landing Page → Enter Vertical Name → Answer 35 Questions (7 sections × 5) → View Results
```

1. **Landing page** — Title, brief description, "Start Diagnostic" button
2. **Info capture** — Vertical name, respondent name (optional), chapter/region (optional)
3. **Question flow** — One dimension at a time, progress bar, 5 questions per dimension with 1-5 rating
4. **Results dashboard** — Radar chart, dimension breakdown, maturity level, recommendations, export option

---

## 3. Question Bank & Selection

The Excel contains 51 questions across 7 dimensions. For v1, the first 5 questions from each dimension are used (matching the Sample sheet). The full question bank is stored in the app so questions can be swapped later.

### Selected Questions (35 total)

**Dimension 1: Strategic Clarity & Direction**
1. Our vertical has a clearly articulated annual theme aligned with Yi's national vision.
2. We have defined 2–3 measurable outcomes that define success for this year.
3. Every RM clearly understands our national priorities.
4. Chapters receive structured guidance instead of ad-hoc instructions.
5. We can clearly articulate how our vertical will look stronger by year-end.

**Dimension 2: Chapter Penetration & Adoption**
1. Majority of chapters are actively executing our vertical.
2. Activity is spread across regions, not concentrated.
3. We track active vs inactive chapters.
4. We have a strategy to activate low-performing chapters.
5. Chapter leadership perceives our vertical as relevant.

**Dimension 3: Execution & Standardisation**
1. We have SOPs/playbooks/templates.
2. Execution quality is consistent across regions.
3. Chapters don't reinvent the model each time.
4. Best practices are shared systematically.
5. A new team can execute using our resources.

**Dimension 4: Regional Alignment & Effectiveness**
1. RMs conduct regular structured interactions.
2. RMs are proactive in guidance and escalation.
3. We review RM performance periodically.
4. Role clarity exists between National, Region, Chapter.
5. Communication flow is efficient.

**Dimension 5: Impact Measurement & Data Discipline**
1. We track quantifiable metrics beyond event count.
2. Chapters report data in structured format.
3. We review performance data before planning.
4. We can present clear impact numbers at GC/National.
5. Data influences strategy decisions.

**Dimension 6: Brand Strength & Visibility**
1. Our vertical has a recognizable national identity.
2. We collaborate effectively with Branding vertical.
3. Our vertical is visible in national communication.
4. Members associate it with meaningful work.
5. Our vertical has at least one nationally recognisable campaign.

**Dimension 7: Continuity & Sustainability**
1. Proper documentation exists for handover.
2. Institutional memory is maintained.
3. Past knowledge is used in planning.
4. Knowledge is system-driven, not personality-driven.
5. We are building assets (documents, models, partnerships) that outlast us.

---

## 4. Scoring Logic

### Per Dimension (5 questions × max 5 = 25)

| Score Range | Health Status | Color |
|-------------|--------------|-------|
| 21–25 | Strong | Green |
| 17–20 | Stable | Blue |
| 13–16 | Weak | Orange |
| 5–12 | Critical | Red |

### Overall Maturity (35 questions × max 5 = 175)

| Level | Score | % | State | Symptoms |
|-------|-------|---|-------|----------|
| 1 | 35-87 | <49% | Structurally Fragile | Reactive, weak systems, poor penetration, no measurable impact |
| 2 | 88-111 | 50-64% | Emerging | Some clarity, inconsistent adoption, systems partially built |
| 3 | 112-139 | 65-79% | Growing | Clear direction, moderate adoption, beginning impact measurement |
| 4 | 140-157 | 80-89% | Established | Strong structure, good penetration, measurable outcomes, documentation present |
| 5 | 158-175 | 90%+ | Flagship | Institutionalised systems, recognisable identity, strong data, leadership continuity |

### Weakest Areas Identification
- Sort dimensions by score ascending
- Top 2 weakest become "Priority Areas to Address"
- Generate specific recommendations based on dimension + score

---

## 5. Results Dashboard

### Visual Elements
1. **Radar/Spider Chart** — 7-axis chart showing all dimension scores (0-25 scale)
2. **Maturity Level Badge** — Large visual showing Level 1-5 with name and percentage
3. **Dimension Cards** — 7 cards showing score, health status, color indicator
4. **Priority Areas** — Top 2-3 weakest dimensions with actionable suggestions
5. **Score Breakdown Table** — All 35 answers listed by dimension

### Export Options
- **PDF download** — Full results report
- **Share link** — Copy results as image/text
- **Screenshot-friendly** — Results page designed to screenshot well

---

## 6. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router) | Fast, SSR, easy Vercel deploy |
| Styling | Tailwind CSS + shadcn/ui | Beautiful, consistent, mobile-first |
| Charts | Recharts | Radar chart, lightweight |
| State | React state (no backend) | All client-side, no data persistence needed |
| Deploy | Vercel | One-click, fast CDN |
| PDF | html2canvas + jspdf | Client-side PDF generation |

**No database needed** — This is a stateless assessment tool. Each session is independent.

---

## 7. Pages & Components

| Route | Purpose |
|-------|---------|
| `/` | Landing page with hero + "Start Diagnostic" CTA |
| `/test` | Multi-step assessment form (7 sections) |
| `/results` | Results dashboard with charts and recommendations |

---

## 8. Non-Goals (v1)

- No user accounts or login
- No saving/comparing past results
- No admin panel to swap questions
- No multi-language support
- No team/aggregate view

---

# Implementation Plan

## Phase 1: Project Scaffold + Data Layer

### Task 1.1: Initialize Next.js project
- `npx create-next-app@latest nmt-diagnostic` with TypeScript, Tailwind, App Router
- Add shadcn/ui, recharts, html2canvas, jspdf dependencies
- Set up project structure

### Task 1.2: Define data types and question bank
- Create `lib/types.ts` — Dimension, Question, Answer, DimensionResult, OverallResult types
- Create `lib/questions.ts` — Full question bank (51 questions) + selected 35
- Create `lib/scoring.ts` — Scoring logic (dimension health, maturity level, recommendations)
- Create `lib/recommendations.ts` — Recommendation text per dimension per health status

### Task 1.3: Verify scoring logic
- Write quick test: feed sample data from Excel → verify output matches (Total: 115, 65.7%, Growing)

## Phase 2: Landing Page + Test Flow

### Task 2.1: Landing page
- Hero with Yi branding colors (blue/gold)
- Title: "NMT Vertical Diagnostic Test"
- Subtitle explaining purpose
- "Start Diagnostic" button → `/test`

### Task 2.2: Test info capture
- First step of `/test` — Vertical name (required), respondent name (optional), region (optional)
- Clean form with shadcn/ui inputs

### Task 2.3: Question flow UI
- Step-by-step: 7 dimensions shown one at a time
- Progress bar showing dimension X of 7
- 5 questions per step with 1-5 radio/slider rating
- "Next" / "Back" navigation
- Can't proceed without answering all 5 in current dimension
- Final step: "Submit & View Results"

## Phase 3: Results Dashboard

### Task 3.1: Radar chart
- 7-axis spider chart using Recharts
- Show actual scores vs max (25) per dimension
- Color-coded fill based on maturity level

### Task 3.2: Maturity level display
- Large badge showing Level (1-5), name, percentage
- Symptom description
- Color-coded (red → green gradient)

### Task 3.3: Dimension breakdown cards
- 7 cards in a grid
- Each shows: dimension name, score/25, health status, color bar
- Sorted by score (weakest first) with "Priority" badge on bottom 2

### Task 3.4: Recommendations section
- Priority areas with specific actionable suggestions
- Based on weakest dimensions and their specific scores

### Task 3.5: Score detail table
- Expandable section showing all 35 questions with individual scores
- Grouped by dimension

## Phase 4: Export + Polish

### Task 4.1: PDF export
- "Download Report" button
- Generates PDF with: vertical name, date, radar chart, all scores, recommendations
- Uses html2canvas + jspdf

### Task 4.2: Share functionality
- "Copy Results" button — copies text summary to clipboard
- Share-friendly meta tags (OG image, title, description)

### Task 4.3: Mobile polish
- Test on mobile viewport
- Ensure touch-friendly rating inputs
- Responsive radar chart
- Smooth transitions between dimensions

### Task 4.4: Final polish
- Loading states, animations
- Yi branding consistency
- Favicon, page titles
- Error boundaries

## Phase 5: Deploy + Verify

### Task 5.1: Deploy to Vercel
- Connect to GitHub repo
- Deploy and verify live URL
- Test full flow on mobile

### Task 5.2: Fresh-eyes review
- Run /fresh-eyes on the codebase
- Fix any P0/P1 issues
- Document any P2/P3 for future

---

## Verification Commands

```bash
# Build check
cd /Users/omm/PROJECTS/nmt-diagnostic && npm run build

# Dev server
npm run dev

# Scoring logic test
node -e "const {calculateResults} = require('./lib/scoring'); ..."
```

## Sample Data Verification

From the Excel Sample sheet, the expected output for the sample data is:
- Total Score: 115 / 175
- Percentage: 65.7%
- Maturity Level: Level 3 — Growing
- Dimension scores: Strategic Clarity 14, Chapter Penetration 15, Execution 12, Regional Alignment 17, Impact Measurement 21, Brand Visibility 18, Continuity 18
- Weakest: Execution (12), Strategic Clarity (14)
