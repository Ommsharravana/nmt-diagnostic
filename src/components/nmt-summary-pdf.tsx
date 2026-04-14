"use client";

/**
 * NMT Summary Report PDF — builds an off-screen HTML template mirroring the
 * summary dashboard, rasterizes it with html2canvas @ 2x, and emits a
 * multi-page A4 PDF via jsPDF.
 *
 * Usage:
 *   import { downloadNMTSummaryPDF } from "@/components/nmt-summary-pdf";
 *   await downloadNMTSummaryPDF(summaryData);
 *
 * Multi-page pagination: the rendered canvas is sliced into page-sized
 * vertical strips, each added as its own PDF page. This prevents
 * single-long-image overflow and keeps text legible.
 */

/* ============================================================
 * Types
 * ============================================================ */
export interface SummaryData {
  generatedAt: string;
  filters: { dateFrom?: string; dateTo?: string; meeting?: string };
  verticalsReported: number;
  maturityDistribution: {
    level: number;
    name: string;
    count: number;
    verticals: string[];
  }[];
  dimensionHealth: {
    dimension: string;
    strong: number;
    stable: number;
    weak: number;
    critical: number;
    average: number;
  }[];
  topVerticals: { name: string; total: number; level: number; state: string }[];
  bottomVerticals: {
    name: string;
    total: number;
    level: number;
    state: string;
  }[];
  systemicWeaknesses: string[];
  totalCommitments: number;
  commitmentsByDimension: { dimension: string; count: number }[];
  targetMeetings: { meeting: string; count: number }[];
}

/* ============================================================
 * Styling tokens (match app theme)
 * ============================================================ */
const COLORS = {
  navy: "#0c1425",
  navyLight: "#162033",
  navyInk: "#1a1a1a",
  gold: "#c4a35a",
  goldLight: "#dfc088",
  goldSoft: "#f3ead0",
  parchment: "#fafaf8",
  white: "#ffffff",
  border: "#c4a35a",
  borderSoft: "#e2d7b3",
  muted: "#6b6b6b",
  emerald: "#047857",
  blue: "#1d4ed8",
  amber: "#b45309",
  red: "#b91c1c",
};

const FONT_STACK = {
  display: '"Georgia", "Times New Roman", serif',
  body: '"Helvetica Neue", "Helvetica", "Arial", sans-serif',
};

const MATURITY_COLORS: Record<number, string> = {
  1: "#dc2626",
  2: "#ea580c",
  3: "#ca8a04",
  4: "#2563eb",
  5: "#059669",
};

/* ============================================================
 * Helpers
 * ============================================================ */
function todayYmd(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDateDisplay(): string {
  return new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(raw: string | number | undefined | null): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function scoreToHealth(score: number): "Strong" | "Stable" | "Weak" | "Critical" {
  if (score >= 21) return "Strong";
  if (score >= 17) return "Stable";
  if (score >= 13) return "Weak";
  return "Critical";
}

function healthColor(h: "Strong" | "Stable" | "Weak" | "Critical"): string {
  if (h === "Strong") return COLORS.emerald;
  if (h === "Stable") return COLORS.blue;
  if (h === "Weak") return COLORS.amber;
  return COLORS.red;
}

/* ============================================================
 * HTML template builder
 * ============================================================ */
function buildSummaryHtml(data: SummaryData): string {
  const totalDist = data.maturityDistribution.reduce((s, m) => s + m.count, 0);

  // ---- Maturity distribution cards ----
  const maturityCards = data.maturityDistribution
    .map((m) => {
      const color = MATURITY_COLORS[m.level] || COLORS.navy;
      return `
        <div class="maturity-card" style="border-color:${color}40">
          <div class="m-label" style="color:${color}">L${m.level} · ${escapeHtml(
            m.name,
          )}</div>
          <div class="m-count" style="color:${color}">${m.count}</div>
          <div class="m-sub">${m.count === 1 ? "vertical" : "verticals"}</div>
        </div>
      `;
    })
    .join("");

  // ---- Stacked distribution bar ----
  const stackedBar =
    totalDist > 0
      ? data.maturityDistribution
          .filter((m) => m.count > 0)
          .map((m) => {
            const pct = (m.count / totalDist) * 100;
            return `<div style="width:${pct}%;background:${
              MATURITY_COLORS[m.level]
            };color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;height:100%;">${
              pct >= 8 ? `${Math.round(pct)}%` : ""
            }</div>`;
          })
          .join("")
      : "";

  // ---- Dimension health table ----
  const dimensionRows = data.dimensionHealth
    .map((d) => {
      const total = d.strong + d.stable + d.weak + d.critical;
      const isSystemic = total > 0 && (d.weak + d.critical) / total >= 0.5;
      const rowBg = isSystemic ? "#fef2f2" : COLORS.white;
      return `
        <tr style="background:${rowBg}">
          <td class="dim-name">
            ${escapeHtml(d.dimension)}
            ${
              isSystemic
                ? `<span style="margin-left:6px;color:${COLORS.red};font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Systemic</span>`
                : ""
            }
          </td>
          <td class="dim-num" style="color:${COLORS.emerald}">${d.strong}</td>
          <td class="dim-num" style="color:${COLORS.blue}">${d.stable}</td>
          <td class="dim-num" style="color:${COLORS.amber}">${d.weak}</td>
          <td class="dim-num" style="color:${COLORS.red}">${d.critical}</td>
          <td class="dim-num" style="text-align:right;font-weight:700;color:${
            COLORS.navy
          }">${d.average.toFixed(1)}</td>
        </tr>
      `;
    })
    .join("");

  // ---- Average scores bar chart (CSS bars) ----
  const sortedByAvg = [...data.dimensionHealth].sort(
    (a, b) => a.average - b.average,
  );
  const avgBars = sortedByAvg
    .map((d) => {
      const pct = Math.min((d.average / 25) * 100, 100);
      const color = healthColor(scoreToHealth(d.average));
      return `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(d.dimension)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="bar-value">${d.average.toFixed(1)}<span class="bar-max">/25</span></div>
        </div>
      `;
    })
    .join("");

  // ---- Top / Bottom verticals ----
  const topRows =
    data.topVerticals.length > 0
      ? data.topVerticals
          .map((v, i) => {
            const color = MATURITY_COLORS[v.level] || COLORS.navy;
            return `
              <tr>
                <td class="rank">${i + 1}.</td>
                <td class="v-name">${escapeHtml(v.name)}</td>
                <td class="v-total">${v.total}<span class="v-max">/175</span></td>
                <td class="v-level" style="color:${color}">L${v.level} · ${escapeHtml(
                  v.state,
                )}</td>
              </tr>`;
          })
          .join("")
      : `<tr><td colspan="4" style="color:${COLORS.muted};font-style:italic;padding:8px">No data yet</td></tr>`;

  const bottomRows =
    data.bottomVerticals.length > 0
      ? data.bottomVerticals
          .map((v, i) => {
            const color = MATURITY_COLORS[v.level] || COLORS.navy;
            return `
              <tr>
                <td class="rank">${i + 1}.</td>
                <td class="v-name">${escapeHtml(v.name)}</td>
                <td class="v-total">${v.total}<span class="v-max">/175</span></td>
                <td class="v-level" style="color:${color}">L${v.level} · ${escapeHtml(
                  v.state,
                )}</td>
              </tr>`;
          })
          .join("")
      : `<tr><td colspan="4" style="color:${COLORS.muted};font-style:italic;padding:8px">No data yet</td></tr>`;

  // ---- Commitments by dimension bars ----
  const maxCount = Math.max(1, ...data.commitmentsByDimension.map((d) => d.count));
  const commitmentBars =
    data.commitmentsByDimension.length > 0
      ? data.commitmentsByDimension
          .map((d) => {
            const pct = (d.count / maxCount) * 100;
            return `
              <div class="bar-row">
                <div class="bar-label">${escapeHtml(d.dimension)}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${pct}%;background:${COLORS.gold}"></div>
                </div>
                <div class="bar-value">${d.count}</div>
              </div>
            `;
          })
          .join("")
      : `<div style="color:${COLORS.muted};font-style:italic;padding:8px">No commitments captured yet</div>`;

  // ---- Target meetings list ----
  const meetingRows =
    data.targetMeetings.length > 0
      ? data.targetMeetings
          .map(
            (m) => `
              <li class="meeting-row">
                <span>${escapeHtml(m.meeting)}</span>
                <span style="color:${COLORS.muted}">${m.count} commitment${
                  m.count !== 1 ? "s" : ""
                }</span>
              </li>`,
          )
          .join("")
      : `<li style="color:${COLORS.muted};font-style:italic;padding:8px">No meetings assigned yet</li>`;

  // ---- Patterns & Recommendations ----
  const systemicBlock =
    data.systemicWeaknesses.length > 0
      ? `
          <p class="pattern-block" style="border-left-color:${COLORS.red}">
            <strong>National infrastructure gap.</strong>
            ${data.systemicWeaknesses.length} dimension${
              data.systemicWeaknesses.length !== 1 ? "s" : ""
            }
            (<strong>${data.systemicWeaknesses.map(escapeHtml).join(", ")}</strong>)
            show weak or critical health across a majority of reporting verticals.
            When 10+ verticals score weak on the same dimension, that's a national
            infrastructure problem, not a vertical problem — address it centrally.
          </p>
        `
      : `
          <p class="pattern-block" style="border-left-color:${COLORS.emerald}">
            <strong>No single dimension is systemically weak</strong> across
            reporting verticals. Dimension gaps are vertical-specific.
          </p>
        `;

  const topFocus = data.commitmentsByDimension.slice(0, 3);
  const focusBlock =
    topFocus.length > 0
      ? `
          <p class="pattern-block" style="border-left-color:${COLORS.gold}">
            <strong>Most-selected focus dimensions:</strong>
            ${topFocus.map((d) => `${escapeHtml(d.dimension)} (${d.count})`).join(", ")}.
            Verticals have self-identified where they want support — consider a
            national-level session on the top pick.
          </p>
        `
      : "";

  // ---- Header metadata ----
  const todayStr = formatDateDisplay();
  const filterLine: string[] = [];
  if (data.filters.dateFrom) filterLine.push(`From ${escapeHtml(data.filters.dateFrom)}`);
  if (data.filters.dateTo) filterLine.push(`To ${escapeHtml(data.filters.dateTo)}`);
  if (data.filters.meeting) filterLine.push(`Meeting: ${escapeHtml(data.filters.meeting)}`);
  const filterStr = filterLine.length > 0 ? ` · ${filterLine.join(" · ")}` : "";

  return `
<div id="nmt-summary-sheet" style="
  width: 794px;
  background: ${COLORS.white};
  color: ${COLORS.navyInk};
  font-family: ${FONT_STACK.body};
  padding: 32px 36px;
  box-sizing: border-box;
  font-size: 12px;
  line-height: 1.45;
">
  <style>
    #nmt-summary-sheet * { box-sizing: border-box; }
    #nmt-summary-sheet .band {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: ${COLORS.navy};
      color: ${COLORS.white};
      padding: 12px 20px;
      border-radius: 4px;
    }
    #nmt-summary-sheet .band .logo {
      font-family: ${FONT_STACK.display};
      font-size: 13px;
      letter-spacing: 0.08em;
      color: ${COLORS.goldLight};
      flex: 1;
    }
    #nmt-summary-sheet .band .logo.left { text-align: left; }
    #nmt-summary-sheet .band .logo.center { text-align: center; color: ${COLORS.white}; font-weight: bold; }
    #nmt-summary-sheet .band .logo.right { text-align: right; font-size: 11px; }
    #nmt-summary-sheet .gold-line {
      height: 3px;
      background: linear-gradient(to right, ${COLORS.gold}, ${COLORS.goldLight}, ${COLORS.gold});
      margin: 0 0 18px 0;
      border-radius: 2px;
    }
    #nmt-summary-sheet .title-block {
      text-align: center;
      margin: 6px 0 18px 0;
    }
    #nmt-summary-sheet .title-main {
      font-family: ${FONT_STACK.display};
      font-size: 26px;
      color: ${COLORS.navy};
      letter-spacing: 0.06em;
      font-weight: bold;
      margin: 0;
    }
    #nmt-summary-sheet .title-sub {
      font-family: ${FONT_STACK.display};
      font-size: 15px;
      color: ${COLORS.gold};
      font-style: italic;
      margin-top: 2px;
    }
    #nmt-summary-sheet .title-meta {
      font-size: 11px;
      color: ${COLORS.muted};
      margin-top: 6px;
      letter-spacing: 0.02em;
    }
    #nmt-summary-sheet .section-heading {
      font-family: ${FONT_STACK.display};
      font-size: 16px;
      color: ${COLORS.navy};
      font-weight: bold;
      margin: 20px 0 10px 0;
      padding-bottom: 5px;
      border-bottom: 1.5px solid ${COLORS.gold};
      letter-spacing: 0.02em;
      page-break-after: avoid;
    }
    #nmt-summary-sheet .maturity-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    #nmt-summary-sheet .maturity-card {
      border: 1.5px solid ${COLORS.borderSoft};
      border-radius: 4px;
      padding: 10px 8px;
      background: ${COLORS.white};
      text-align: center;
    }
    #nmt-summary-sheet .m-label {
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 2px;
    }
    #nmt-summary-sheet .m-count {
      font-family: ${FONT_STACK.display};
      font-size: 30px;
      font-weight: bold;
      line-height: 1;
    }
    #nmt-summary-sheet .m-sub {
      font-size: 9px;
      color: ${COLORS.muted};
      margin-top: 2px;
    }
    #nmt-summary-sheet .stacked-bar {
      display: flex;
      height: 22px;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid ${COLORS.borderSoft};
      margin: 8px 0 4px 0;
    }
    #nmt-summary-sheet .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${COLORS.muted};
      margin-bottom: 6px;
    }
    #nmt-summary-sheet .legend-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 2px;
      vertical-align: middle;
      margin-right: 4px;
    }
    #nmt-summary-sheet table.dim-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 6px;
    }
    #nmt-summary-sheet .dim-table th,
    #nmt-summary-sheet .dim-table td {
      border: 1px solid ${COLORS.borderSoft};
      padding: 7px 9px;
      text-align: left;
    }
    #nmt-summary-sheet .dim-table th {
      background: ${COLORS.navy};
      color: ${COLORS.white};
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: bold;
      border-color: ${COLORS.navy};
    }
    #nmt-summary-sheet .dim-table .dim-name { width: 28%; font-weight: 600; color: ${COLORS.navy}; }
    #nmt-summary-sheet .dim-table .dim-num { text-align: center; font-weight: 600; tabular-nums: tabular-nums; }
    #nmt-summary-sheet .systemic-note {
      font-size: 11px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: ${COLORS.red};
      padding: 8px 10px;
      border-radius: 3px;
      margin-top: 4px;
    }
    #nmt-summary-sheet .bar-chart { display: flex; flex-direction: column; gap: 6px; }
    #nmt-summary-sheet .bar-row {
      display: grid;
      grid-template-columns: 170px 1fr 60px;
      align-items: center;
      gap: 10px;
      font-size: 11px;
    }
    #nmt-summary-sheet .bar-label {
      color: ${COLORS.navy};
      font-weight: 600;
      text-align: right;
    }
    #nmt-summary-sheet .bar-track {
      height: 14px;
      background: #f3f3f0;
      border-radius: 3px;
      overflow: hidden;
    }
    #nmt-summary-sheet .bar-fill {
      height: 100%;
      border-radius: 3px 0 0 3px;
    }
    #nmt-summary-sheet .bar-value {
      font-weight: 700;
      color: ${COLORS.navy};
      font-size: 11px;
    }
    #nmt-summary-sheet .bar-max {
      color: ${COLORS.muted};
      font-weight: 400;
      font-size: 9px;
      margin-left: 1px;
    }
    #nmt-summary-sheet .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    #nmt-summary-sheet .rank-box {
      border: 1.5px solid ${COLORS.borderSoft};
      border-radius: 4px;
      padding: 10px 12px;
    }
    #nmt-summary-sheet .rank-box h4 {
      margin: 0 0 6px 0;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 700;
    }
    #nmt-summary-sheet .rank-table { width: 100%; font-size: 11px; border-collapse: collapse; }
    #nmt-summary-sheet .rank-table td { padding: 4px 2px; vertical-align: middle; }
    #nmt-summary-sheet .rank-table .rank { color: ${COLORS.muted}; width: 18px; }
    #nmt-summary-sheet .rank-table .v-name { font-weight: 600; color: ${COLORS.navy}; }
    #nmt-summary-sheet .rank-table .v-total { text-align: right; color: ${COLORS.navyInk}; white-space: nowrap; }
    #nmt-summary-sheet .rank-table .v-max { color: ${COLORS.muted}; font-size: 9px; }
    #nmt-summary-sheet .rank-table .v-level { text-align: right; font-style: italic; font-size: 10px; white-space: nowrap; }
    #nmt-summary-sheet .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    #nmt-summary-sheet .kpi-card {
      border: 1.5px solid ${COLORS.borderSoft};
      border-radius: 4px;
      padding: 10px 12px;
    }
    #nmt-summary-sheet .kpi-label {
      font-size: 9px;
      color: ${COLORS.muted};
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 2px;
    }
    #nmt-summary-sheet .kpi-value {
      font-family: ${FONT_STACK.display};
      font-size: 26px;
      color: ${COLORS.navy};
      font-weight: bold;
      line-height: 1;
    }
    #nmt-summary-sheet .meetings-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    #nmt-summary-sheet .meeting-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 8px;
      border-bottom: 1px solid ${COLORS.borderSoft};
      font-size: 11px;
    }
    #nmt-summary-sheet .meeting-row:last-child { border-bottom: none; }
    #nmt-summary-sheet .pattern-block {
      border-left: 4px solid ${COLORS.gold};
      padding: 8px 12px;
      margin: 6px 0;
      font-size: 11px;
      background: ${COLORS.parchment};
      border-radius: 0 3px 3px 0;
    }
    #nmt-summary-sheet .pattern-block strong {
      color: ${COLORS.navy};
    }
    #nmt-summary-sheet .footer {
      margin-top: 20px;
      padding: 10px 16px;
      background: ${COLORS.navy};
      color: ${COLORS.goldLight};
      border-radius: 3px;
      text-align: center;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
  </style>

  <!-- ===== Header band ===== -->
  <div class="band">
    <div class="logo left">
      Yi · Young Indians<br/>
      <span style="font-size:9px;letter-spacing:0.22em;color:${COLORS.white};opacity:0.75">WE CAN · WE WILL</span>
    </div>
    <div class="logo center">NMT SUMMARY<br/>
      <span style="font-size:10px;letter-spacing:0.18em;font-weight:normal;color:${COLORS.goldLight}">| NATIONAL REPORT |</span>
    </div>
    <div class="logo right">CII<br/>
      <span style="font-size:9px;letter-spacing:0.1em;color:${COLORS.white};opacity:0.75">Confederation of Indian Industry</span>
    </div>
  </div>
  <div class="gold-line"></div>

  <!-- ===== Title ===== -->
  <div class="title-block">
    <div class="title-main">NMT Vertical Diagnostic</div>
    <div class="title-sub">Summary Report</div>
    <div class="title-meta">
      As of ${escapeHtml(todayStr)} · <strong>${
        data.verticalsReported
      }</strong> verticals reported${filterStr}
    </div>
  </div>

  <!-- ===== Maturity Distribution ===== -->
  <div class="section-heading">Overall Maturity Distribution</div>
  <div class="maturity-grid">${maturityCards}</div>
  ${
    totalDist > 0
      ? `<div class="stacked-bar">${stackedBar}</div>
         <div class="legend">
           ${data.maturityDistribution
             .map(
               (m) =>
                 `<span><span class="legend-dot" style="background:${
                   MATURITY_COLORS[m.level]
                 }"></span>L${m.level} ${escapeHtml(m.name)}</span>`,
             )
             .join("")}
         </div>`
      : ""
  }

  <!-- ===== Dimension Health ===== -->
  <div class="section-heading">Dimension Health Across Verticals</div>
  <table class="dim-table">
    <thead>
      <tr>
        <th>Dimension</th>
        <th style="text-align:center">Strong</th>
        <th style="text-align:center">Stable</th>
        <th style="text-align:center">Weak</th>
        <th style="text-align:center">Critical</th>
        <th style="text-align:right">Avg / 25</th>
      </tr>
    </thead>
    <tbody>${dimensionRows}</tbody>
  </table>
  ${
    data.systemicWeaknesses.length > 0
      ? `<div class="systemic-note">
          <strong>${data.systemicWeaknesses.length} dimension${
            data.systemicWeaknesses.length !== 1 ? "s are" : " is"
          } systemically weak:</strong> ${data.systemicWeaknesses
            .map(escapeHtml)
            .join(", ")}.
        </div>`
      : `<div style="font-size:11px;color:${COLORS.muted};font-style:italic;margin-top:4px">
          No systemic weakness detected — fewer than 50% of verticals are
          weak/critical on any single dimension.
        </div>`
  }

  <!-- ===== Average Scores by Dimension ===== -->
  <div class="section-heading">Average Scores by Dimension</div>
  <div class="bar-chart">${avgBars}</div>
  <div style="font-size:9px;color:${COLORS.muted};letter-spacing:0.08em;text-transform:uppercase;margin-top:6px">
    Sorted weakest first · Color matches health threshold
  </div>

  <!-- ===== Verticals at a glance ===== -->
  <div class="section-heading">Verticals at a Glance</div>
  <div class="two-col">
    <div class="rank-box">
      <h4 style="color:${COLORS.emerald}">Top 3 by total score</h4>
      <table class="rank-table"><tbody>${topRows}</tbody></table>
    </div>
    <div class="rank-box">
      <h4 style="color:${COLORS.red}">Bottom 3 by total score</h4>
      <table class="rank-table"><tbody>${bottomRows}</tbody></table>
    </div>
  </div>
  <div style="font-size:10px;color:${COLORS.muted};font-style:italic;margin-top:4px">
    Shown for orientation, not ranking — every vertical's journey is unique.
  </div>

  <!-- ===== Aggregate Action Commitments ===== -->
  <div class="section-heading">Aggregate Action Commitments</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total commitments</div>
      <div class="kpi-value">${data.totalCommitments}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Focus dimensions</div>
      <div class="kpi-value">${data.commitmentsByDimension.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Target meetings</div>
      <div class="kpi-value">${data.targetMeetings.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Verticals reported</div>
      <div class="kpi-value">${data.verticalsReported}</div>
    </div>
  </div>

  <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${
    COLORS.navy
  };font-weight:700;margin:8px 0 6px 0">Commitments by focus dimension</div>
  <div class="bar-chart">${commitmentBars}</div>

  <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${
    COLORS.navy
  };font-weight:700;margin:14px 0 6px 0">Target meetings</div>
  <ul class="meetings-list" style="border:1px solid ${
    COLORS.borderSoft
  };border-radius:3px">${meetingRows}</ul>

  <!-- ===== Patterns & Recommendations ===== -->
  <div class="section-heading">Patterns &amp; Recommendations</div>
  ${systemicBlock}
  ${focusBlock}

  <!-- ===== Footer ===== -->
  <div class="footer">Yi NMT · Vertical Health Diagnostic · Generated ${escapeHtml(
    new Date(data.generatedAt).toLocaleString("en-IN"),
  )}</div>
</div>
  `;
}

/* ============================================================
 * Main exported function — multi-page PDF
 * ============================================================ */
export async function downloadNMTSummaryPDF(data: SummaryData): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("downloadNMTSummaryPDF must run in the browser");
  }

  // Off-screen container
  const container = document.createElement("div");
  container.setAttribute("data-testid", "nmt-summary-container");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.zIndex = "-1";
  container.style.width = "794px";
  container.style.background = COLORS.white;
  container.innerHTML = buildSummaryHtml(data);
  document.body.appendChild(container);

  try {
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;

    const sheetEl = container.querySelector(
      "#nmt-summary-sheet",
    ) as HTMLElement | null;
    if (!sheetEl) {
      throw new Error("NMT summary element not found");
    }

    // Ensure paint
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const canvas = await html2canvas(sheetEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidthMm = 210;
    const pageHeightMm = 297;

    // Convert the A4 page height into canvas pixels
    // (canvas.width corresponds to pageWidthMm)
    const pxPerMm = canvas.width / pageWidthMm;
    const pageHeightPx = Math.floor(pageHeightMm * pxPerMm);

    let renderedHeight = 0;
    let pageIndex = 0;

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight);

      // Create a per-page canvas containing just the current slice
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        renderedHeight,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      );

      const imgData = pageCanvas.toDataURL("image/png");
      const imgHeightMm = (sliceHeight / pxPerMm);

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, imgHeightMm);

      renderedHeight += sliceHeight;
      pageIndex += 1;
    }

    const filename = `NMT-Summary-${todayYmd()}.pdf`;
    pdf.save(filename);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

export default downloadNMTSummaryPDF;
