"use client";

/**
 * Action Commitment Sheet PDF — exported function that dynamically creates an
 * off-screen HTML template matching Rohan's paper Action Commitment Sheet,
 * rasterizes it with html2canvas, and emits a single-page A4 PDF via jsPDF.
 *
 * Usage:
 *   import { downloadActionCommitmentSheet } from "@/components/action-commitment-sheet-pdf";
 *   await downloadActionCommitmentSheet(results, commitment);
 *
 * If `commitment` is undefined, the sheet renders with blank action-item rows
 * (matches the paper form intent — print blank and fill by hand).
 */

import type { OverallResult } from "@/lib/types";

export interface CommitmentData {
  focus_dimension?: string;
  focus_reason?: string;
  action_items_detailed?: Array<{
    text: string;
    owner: string;
    deadline: string;
    status?: string;
  }>;
  dimension_observations?: Record<string, string>;
  target_meeting?: string;
}

/* ===== Styling tokens (match app theme) ===== */
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
};

const FONT_STACK = {
  display: '"Georgia", "Times New Roman", serif',
  body: '"Helvetica Neue", "Helvetica", "Arial", sans-serif',
};

/* ===== Helpers ===== */
function sanitize(s: string): string {
  return (s || "untitled")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function todayYmd(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDisplayDate(input?: string): string {
  if (!input) return "—";
  const ymd = /^\d{4}-\d{2}-\d{2}$/.test(input) ? input : null;
  if (!ymd) return input;
  const [yy, mm, dd] = ymd.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${String(dd).padStart(2, "0")} ${months[mm - 1]} ${yy}`;
}

function escapeHtml(raw: string): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ===== HTML template builder ===== */
function buildSheetHtml(
  results: OverallResult,
  commitment?: CommitmentData,
): string {
  const focusDim = commitment?.focus_dimension ?? "";
  const focusReason = commitment?.focus_reason ?? "";
  const targetMeeting = commitment?.target_meeting ?? "";
  const dateStr = formatDisplayDate(todayYmd());

  // Build dimension rows
  const dimRows = results.dimensions
    .map((d, idx) => {
      const obs =
        commitment?.dimension_observations?.[String(idx)] ??
        commitment?.dimension_observations?.[String(d.dimension.index)] ??
        "";
      return `
        <tr>
          <td class="dim-name">${escapeHtml(`${idx + 1}. ${d.dimension.name}`)}</td>
          <td class="dim-score">${d.score}</td>
          <td class="dim-health health-${d.health.toLowerCase()}">${escapeHtml(d.health)}</td>
          <td class="dim-obs">${escapeHtml(obs)}</td>
        </tr>
      `;
    })
    .join("");

  // Build action commitment rows (3 fixed rows, blank if no data)
  const rawActions = commitment?.action_items_detailed ?? [];
  const actions = [0, 1, 2].map((i) => rawActions[i]);
  const actionRows = actions
    .map((a, i) => {
      const text = a?.text ? escapeHtml(a.text) : "&nbsp;";
      const owner = a?.owner ? escapeHtml(a.owner) : "&nbsp;";
      const deadline = a?.deadline ? escapeHtml(formatDisplayDate(a.deadline)) : "&nbsp;";
      const status = a?.status ? escapeHtml(a.status) : "&nbsp;";
      return `
        <tr>
          <td class="act-num">${i + 1}</td>
          <td class="act-text">${text}</td>
          <td class="act-owner">${owner}</td>
          <td class="act-deadline">${deadline}</td>
          <td class="act-status">${status}</td>
        </tr>
      `;
    })
    .join("");

  const chair = results.chairName?.trim() || "—";
  const coChair = results.coChairName?.trim() || "—";
  const vertical = results.verticalName || "—";
  const total = typeof results.totalScore === "number" ? results.totalScore : "—";
  const maturity = results.maturity
    ? `L${results.maturity.level} — ${results.maturity.state}`
    : "—";

  return `
<div id="yi-commitment-sheet" style="
  width: 794px;
  min-height: 1123px;
  background: ${COLORS.white};
  color: ${COLORS.navyInk};
  font-family: ${FONT_STACK.body};
  padding: 32px 36px;
  box-sizing: border-box;
  font-size: 12px;
  line-height: 1.4;
">
  <style>
    #yi-commitment-sheet * { box-sizing: border-box; }
    #yi-commitment-sheet .band {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: ${COLORS.navy};
      color: ${COLORS.white};
      padding: 12px 20px;
      border-radius: 4px;
    }
    #yi-commitment-sheet .band .logo {
      font-family: ${FONT_STACK.display};
      font-size: 13px;
      letter-spacing: 0.08em;
      color: ${COLORS.goldLight};
      flex: 1;
    }
    #yi-commitment-sheet .band .logo.left { text-align: left; }
    #yi-commitment-sheet .band .logo.center { text-align: center; color: ${COLORS.white}; font-weight: bold; }
    #yi-commitment-sheet .band .logo.right { text-align: right; font-size: 11px; }
    #yi-commitment-sheet .gold-line {
      height: 3px;
      background: linear-gradient(to right, ${COLORS.gold}, ${COLORS.goldLight}, ${COLORS.gold});
      margin: 0 0 18px 0;
      border-radius: 2px;
    }
    #yi-commitment-sheet .title-block {
      text-align: center;
      margin: 6px 0 18px 0;
    }
    #yi-commitment-sheet .title-main {
      font-family: ${FONT_STACK.display};
      font-size: 26px;
      color: ${COLORS.navy};
      letter-spacing: 0.08em;
      font-weight: bold;
      margin: 0;
    }
    #yi-commitment-sheet .title-sub {
      font-family: ${FONT_STACK.display};
      font-size: 16px;
      color: ${COLORS.gold};
      font-style: italic;
      margin-top: 2px;
    }
    #yi-commitment-sheet .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1.5px solid ${COLORS.border};
      border-radius: 3px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    #yi-commitment-sheet .meta-cell {
      padding: 9px 12px;
      border-right: 1px solid ${COLORS.borderSoft};
      border-bottom: 1px solid ${COLORS.borderSoft};
      background: ${COLORS.white};
    }
    #yi-commitment-sheet .meta-cell:nth-child(2n) { border-right: none; }
    #yi-commitment-sheet .meta-cell.last-row { border-bottom: none; }
    #yi-commitment-sheet .meta-label {
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: ${COLORS.navy};
      font-weight: bold;
      margin-bottom: 2px;
    }
    #yi-commitment-sheet .meta-value {
      font-size: 13px;
      color: ${COLORS.navyInk};
      font-weight: 600;
    }
    #yi-commitment-sheet .section-heading {
      font-family: ${FONT_STACK.display};
      font-size: 14px;
      color: ${COLORS.navy};
      font-weight: bold;
      margin: 14px 0 6px 0;
      padding-bottom: 4px;
      border-bottom: 1.5px solid ${COLORS.gold};
      letter-spacing: 0.03em;
    }
    #yi-commitment-sheet table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    #yi-commitment-sheet .dim-table th,
    #yi-commitment-sheet .dim-table td {
      border: 1px solid ${COLORS.borderSoft};
      padding: 7px 9px;
      text-align: left;
      vertical-align: middle;
    }
    #yi-commitment-sheet .dim-table th {
      background: ${COLORS.navy};
      color: ${COLORS.white};
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: bold;
      border-color: ${COLORS.navy};
    }
    #yi-commitment-sheet .dim-table .dim-name { width: 38%; font-weight: 600; color: ${COLORS.navy}; }
    #yi-commitment-sheet .dim-table .dim-score { width: 10%; text-align: center; font-weight: bold; color: ${COLORS.navy}; }
    #yi-commitment-sheet .dim-table .dim-health { width: 14%; text-align: center; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
    #yi-commitment-sheet .dim-table .dim-obs { width: 38%; color: ${COLORS.navyInk}; }
    #yi-commitment-sheet .health-strong { color: #047857; }
    #yi-commitment-sheet .health-stable { color: #1d4ed8; }
    #yi-commitment-sheet .health-weak { color: #b45309; }
    #yi-commitment-sheet .health-critical { color: #b91c1c; }
    #yi-commitment-sheet .health-key {
      font-size: 9.5px;
      color: ${COLORS.muted};
      margin-top: 5px;
      font-style: italic;
    }
    #yi-commitment-sheet .focus-block {
      border: 1.5px solid ${COLORS.border};
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    #yi-commitment-sheet .focus-row {
      display: grid;
      grid-template-columns: 180px 1fr;
      border-bottom: 1px solid ${COLORS.borderSoft};
    }
    #yi-commitment-sheet .focus-row:last-child { border-bottom: none; }
    #yi-commitment-sheet .focus-label {
      background: ${COLORS.goldSoft};
      padding: 9px 12px;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${COLORS.navy};
      font-weight: bold;
      border-right: 1px solid ${COLORS.borderSoft};
    }
    #yi-commitment-sheet .focus-value {
      padding: 9px 12px;
      font-size: 12px;
      color: ${COLORS.navyInk};
      min-height: 32px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    #yi-commitment-sheet .focus-value.why { min-height: 54px; }
    #yi-commitment-sheet .action-table th,
    #yi-commitment-sheet .action-table td {
      border: 1px solid ${COLORS.borderSoft};
      padding: 8px 10px;
      vertical-align: top;
      text-align: left;
    }
    #yi-commitment-sheet .action-table th {
      background: ${COLORS.navy};
      color: ${COLORS.white};
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: bold;
      border-color: ${COLORS.navy};
    }
    #yi-commitment-sheet .action-table .act-num { width: 6%; text-align: center; font-weight: bold; color: ${COLORS.navy}; background: ${COLORS.goldSoft}; font-size: 13px; }
    #yi-commitment-sheet .action-table .act-text { width: 44%; min-height: 44px; }
    #yi-commitment-sheet .action-table .act-owner { width: 16%; }
    #yi-commitment-sheet .action-table .act-deadline { width: 16%; }
    #yi-commitment-sheet .action-table .act-status { width: 18%; color: ${COLORS.muted}; font-style: italic; font-size: 10px; }
    #yi-commitment-sheet .action-table tbody tr { min-height: 44px; }
    #yi-commitment-sheet .action-table tbody td { height: 44px; }
    #yi-commitment-sheet .footer {
      margin-top: 16px;
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
    <div class="logo left">Yi · Young Indians<br/><span style="font-size:9px;letter-spacing:0.22em;color:${COLORS.white};opacity:0.75">WE CAN · WE WILL</span></div>
    <div class="logo center">ONE BHARAT<br/><span style="font-size:10px;letter-spacing:0.18em;font-weight:normal;color:${COLORS.goldLight}">| SPIRIT |</span></div>
    <div class="logo right">CII<br/><span style="font-size:9px;letter-spacing:0.1em;color:${COLORS.white};opacity:0.75">Confederation of Indian Industry</span></div>
  </div>
  <div class="gold-line"></div>

  <!-- ===== Title ===== -->
  <div class="title-block">
    <div class="title-main">YOUNG INDIANS</div>
    <div class="title-sub">Vertical Action Commitment Sheet</div>
  </div>

  <!-- ===== Metadata grid ===== -->
  <div class="meta-grid">
    <div class="meta-cell">
      <div class="meta-label">Vertical Name</div>
      <div class="meta-value">${escapeHtml(vertical)}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Date</div>
      <div class="meta-value">${escapeHtml(dateStr)}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Chair</div>
      <div class="meta-value">${escapeHtml(chair)}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Co-Chair</div>
      <div class="meta-value">${escapeHtml(coChair)}</div>
    </div>
    <div class="meta-cell last-row">
      <div class="meta-label">Total Score (out of 175)</div>
      <div class="meta-value">${escapeHtml(String(total))}</div>
    </div>
    <div class="meta-cell last-row">
      <div class="meta-label">Maturity Level</div>
      <div class="meta-value">${escapeHtml(maturity)}</div>
    </div>
  </div>

  <!-- ===== Dimension Scores ===== -->
  <div class="section-heading">Dimension Scores</div>
  <table class="dim-table">
    <thead>
      <tr>
        <th>Dimension</th>
        <th style="text-align:center">/25</th>
        <th style="text-align:center">Health</th>
        <th>Quick Observation</th>
      </tr>
    </thead>
    <tbody>
      ${dimRows}
    </tbody>
  </table>
  <div class="health-key">Health key: Strong (21–25) · Stable (17–20) · Weak (13–16) · Critical (5–12)</div>

  <!-- ===== Focus Dimension ===== -->
  <div class="section-heading">Focus Dimension</div>
  <div class="focus-block">
    <div class="focus-row">
      <div class="focus-label">Dimension chosen</div>
      <div class="focus-value">${escapeHtml(focusDim) || "&nbsp;"}</div>
    </div>
    <div class="focus-row">
      <div class="focus-label">Why this dimension?</div>
      <div class="focus-value why">${escapeHtml(focusReason) || "&nbsp;"}</div>
    </div>
  </div>

  <!-- ===== Action Commitments ===== -->
  <div class="section-heading">Action Commitments</div>
  <table class="action-table">
    <thead>
      <tr>
        <th style="text-align:center">#</th>
        <th>Action item (be specific)</th>
        <th>Owner</th>
        <th>Deadline</th>
        <th>Next NMT status</th>
      </tr>
    </thead>
    <tbody>
      ${actionRows}
    </tbody>
  </table>

  ${
    targetMeeting
      ? `<div style="margin-top:10px;font-size:11px;color:${COLORS.navy}"><strong style="letter-spacing:0.1em;text-transform:uppercase;font-size:10px">Target Meeting:</strong> ${escapeHtml(targetMeeting)}</div>`
      : ""
  }

  <!-- ===== Footer ===== -->
  <div class="footer">Yi NMT · Vertical Health Diagnostic · April 2026</div>
</div>
  `;
}

/* ===== Main exported function ===== */
export async function downloadActionCommitmentSheet(
  results: OverallResult,
  commitment?: CommitmentData,
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("downloadActionCommitmentSheet must run in the browser");
  }

  // Create off-screen container
  const container = document.createElement("div");
  container.setAttribute("data-testid", "commitment-sheet-container");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.zIndex = "-1";
  container.style.width = "794px";
  container.style.background = COLORS.white;
  container.innerHTML = buildSheetHtml(results, commitment);
  document.body.appendChild(container);

  try {
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;

    const sheetEl = container.querySelector(
      "#yi-commitment-sheet",
    ) as HTMLElement | null;
    if (!sheetEl) {
      throw new Error("Commitment sheet element not found");
    }

    // Small paint delay to ensure inline styles apply
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const canvas = await html2canvas(sheetEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
      // Fits on one page
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    } else {
      // Paginate (rare — template sized to fit A4)
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    const filename = `Yi-ActionCommitment-${sanitize(results.verticalName)}-${todayYmd()}.pdf`;
    pdf.save(filename);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/* ===== Default export for convenience ===== */
export default downloadActionCommitmentSheet;
