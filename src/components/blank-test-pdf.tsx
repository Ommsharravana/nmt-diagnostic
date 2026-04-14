"use client";

/**
 * Blank Test PDF — printable paper version of the NMT Vertical Diagnostic.
 *
 * Generates a multi-page A4 PDF containing all 35 active questions (the
 * selected 5-per-dimension set from `@/lib/questions`). Used as a backup
 * if tech fails at the NMT meeting — print it, hand it out, collect by hand,
 * tally manually using the scoring guide on the final page.
 *
 * Usage:
 *   import { downloadBlankTestPDF } from "@/components/blank-test-pdf";
 *   await downloadBlankTestPDF();
 *
 * Playbook reference: §6 "Paper backup — QR code printed or URL shortened".
 */

import { getTestQuestions } from "@/lib/questions";

/* ===== Styling tokens (match app theme + action-commitment-sheet-pdf) ===== */
const COLORS = {
  navy: "#0c1425",
  navyInk: "#1a1a1a",
  gold: "#c4a35a",
  goldLight: "#dfc088",
  goldSoft: "#f3ead0",
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
function todayYmd(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function escapeHtml(raw: string): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ===== Shared <style> block (included once in first page) ===== */
function sharedStyles(): string {
  return `
    .yi-blank * { box-sizing: border-box; }
    .yi-blank {
      width: 794px;
      min-height: 1123px;
      background: ${COLORS.white};
      color: ${COLORS.navyInk};
      font-family: ${FONT_STACK.body};
      padding: 32px 36px;
      font-size: 12px;
      line-height: 1.4;
    }
    .yi-blank .band {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: ${COLORS.navy};
      color: ${COLORS.white};
      padding: 12px 20px;
      border-radius: 4px;
    }
    .yi-blank .band .logo {
      font-family: ${FONT_STACK.display};
      font-size: 13px;
      letter-spacing: 0.08em;
      color: ${COLORS.goldLight};
      flex: 1;
    }
    .yi-blank .band .logo.left { text-align: left; }
    .yi-blank .band .logo.center {
      text-align: center; color: ${COLORS.white}; font-weight: bold;
    }
    .yi-blank .band .logo.right { text-align: right; font-size: 11px; }
    .yi-blank .gold-line {
      height: 3px;
      background: linear-gradient(to right, ${COLORS.gold}, ${COLORS.goldLight}, ${COLORS.gold});
      margin: 0 0 18px 0;
      border-radius: 2px;
    }
    .yi-blank .title-block {
      text-align: center;
      margin: 6px 0 18px 0;
    }
    .yi-blank .title-main {
      font-family: ${FONT_STACK.display};
      font-size: 26px;
      color: ${COLORS.navy};
      letter-spacing: 0.08em;
      font-weight: bold;
      margin: 0;
    }
    .yi-blank .title-sub {
      font-family: ${FONT_STACK.display};
      font-size: 15px;
      color: ${COLORS.gold};
      font-style: italic;
      margin-top: 2px;
    }
    .yi-blank .instructions {
      background: ${COLORS.goldSoft};
      border-left: 4px solid ${COLORS.gold};
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${COLORS.navyInk};
      line-height: 1.5;
    }
    .yi-blank .instructions strong {
      color: ${COLORS.navy};
      letter-spacing: 0.02em;
    }
    .yi-blank .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1.5px solid ${COLORS.border};
      border-radius: 3px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .yi-blank .info-cell {
      padding: 10px 12px;
      border-right: 1px solid ${COLORS.borderSoft};
      border-bottom: 1px solid ${COLORS.borderSoft};
      background: ${COLORS.white};
    }
    .yi-blank .info-cell:nth-child(2n) { border-right: none; }
    .yi-blank .info-cell.last-row { border-bottom: none; }
    .yi-blank .info-label {
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: ${COLORS.navy};
      font-weight: bold;
      margin-bottom: 4px;
    }
    .yi-blank .info-blank {
      border-bottom: 1.5px solid ${COLORS.navyInk};
      height: 22px;
    }
    .yi-blank .section-heading {
      font-family: ${FONT_STACK.display};
      font-size: 15px;
      color: ${COLORS.navy};
      font-weight: bold;
      margin: 14px 0 8px 0;
      padding: 6px 12px;
      background: ${COLORS.navy};
      color: ${COLORS.white};
      border-radius: 3px;
      letter-spacing: 0.03em;
    }
    .yi-blank .section-heading .dim-num {
      color: ${COLORS.goldLight};
      font-style: italic;
      margin-right: 8px;
    }
    .yi-blank .scale-legend {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: ${COLORS.muted};
      padding: 4px 12px;
      background: ${COLORS.goldSoft};
      border-radius: 2px;
      margin-bottom: 8px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .yi-blank .q-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 9px 10px;
      border-bottom: 1px solid ${COLORS.borderSoft};
    }
    .yi-blank .q-row:last-child { border-bottom: none; }
    .yi-blank .q-num {
      flex: 0 0 26px;
      font-family: ${FONT_STACK.display};
      font-weight: bold;
      color: ${COLORS.gold};
      font-size: 14px;
      text-align: right;
    }
    .yi-blank .q-text {
      flex: 1;
      font-size: 11.5px;
      color: ${COLORS.navyInk};
      line-height: 1.4;
    }
    .yi-blank .q-circles {
      flex: 0 0 auto;
      display: flex;
      gap: 6px;
      padding-left: 8px;
    }
    .yi-blank .q-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: 1.5px solid ${COLORS.navy};
      border-radius: 50%;
      font-size: 10px;
      color: ${COLORS.navy};
      font-weight: bold;
      background: ${COLORS.white};
    }
    .yi-blank .dim-score-line {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 8px 12px;
      background: ${COLORS.goldSoft};
      font-size: 11px;
      color: ${COLORS.navy};
      font-weight: bold;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-top: 4px;
      border-radius: 2px;
    }
    .yi-blank .dim-score-blank {
      display: inline-block;
      width: 60px;
      border-bottom: 1.5px solid ${COLORS.navyInk};
      height: 18px;
    }
    .yi-blank .dim-score-max {
      color: ${COLORS.muted};
      font-weight: normal;
      font-style: italic;
    }
    .yi-blank .guide-block {
      border: 1.5px solid ${COLORS.border};
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .yi-blank .guide-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .yi-blank .guide-table th,
    .yi-blank .guide-table td {
      border: 1px solid ${COLORS.borderSoft};
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    .yi-blank .guide-table th {
      background: ${COLORS.navy};
      color: ${COLORS.white};
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: bold;
      border-color: ${COLORS.navy};
    }
    .yi-blank .guide-table .lvl-level {
      width: 10%;
      font-family: ${FONT_STACK.display};
      font-weight: bold;
      color: ${COLORS.gold};
      text-align: center;
      font-size: 14px;
    }
    .yi-blank .guide-table .lvl-state {
      width: 22%;
      font-weight: bold;
      color: ${COLORS.navy};
    }
    .yi-blank .guide-table .lvl-range {
      width: 20%;
      text-align: center;
      color: ${COLORS.navyInk};
      font-weight: 600;
    }
    .yi-blank .guide-table .lvl-symptoms {
      width: 48%;
      font-size: 10.5px;
      color: ${COLORS.muted};
    }
    .yi-blank .health-table th {
      background: ${COLORS.navy};
      color: ${COLORS.white};
    }
    .yi-blank .health-table .h-status {
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 10px;
    }
    .yi-blank .health-strong { color: #047857; }
    .yi-blank .health-stable { color: #1d4ed8; }
    .yi-blank .health-weak { color: #b45309; }
    .yi-blank .health-critical { color: #b91c1c; }
    .yi-blank .footer {
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
    .yi-blank .page-tag {
      text-align: right;
      font-size: 9px;
      color: ${COLORS.muted};
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-top: 10px;
    }
  `;
}

/* ===== Header band (reused per page) ===== */
function headerBand(): string {
  return `
  <div class="band">
    <div class="logo left">Yi · Young Indians<br/><span style="font-size:9px;letter-spacing:0.22em;color:${COLORS.white};opacity:0.75">WE CAN · WE WILL</span></div>
    <div class="logo center">ONE BHARAT<br/><span style="font-size:10px;letter-spacing:0.18em;font-weight:normal;color:${COLORS.goldLight}">| SPIRIT |</span></div>
    <div class="logo right">CII<br/><span style="font-size:9px;letter-spacing:0.1em;color:${COLORS.white};opacity:0.75">Confederation of Indian Industry</span></div>
  </div>
  <div class="gold-line"></div>
  `;
}

/* ===== Page 1: header + info block + first dimensions ===== */
function buildFirstPage(): string {
  return `
  ${headerBand()}

  <div class="title-block">
    <div class="title-main">NMT VERTICAL DIAGNOSTIC</div>
    <div class="title-sub">Paper Assessment · Backup Form</div>
  </div>

  <div class="instructions">
    <strong>Instructions:</strong> Rate each statement from <strong>1 (Strongly Disagree)</strong>
    to <strong>5 (Strongly Agree)</strong>. Circle one number per statement. Answer honestly —
    this is an internal diagnostic, not an audit. <strong>Chair + Co-Chair complete jointly</strong>.
    After finishing, total each dimension in the score box, then sum all seven dimensions
    and check the scoring guide on the final page.
  </div>

  <div class="info-grid">
    <div class="info-cell">
      <div class="info-label">Vertical Name</div>
      <div class="info-blank"></div>
    </div>
    <div class="info-cell">
      <div class="info-label">Date</div>
      <div class="info-blank"></div>
    </div>
    <div class="info-cell">
      <div class="info-label">Chair</div>
      <div class="info-blank"></div>
    </div>
    <div class="info-cell">
      <div class="info-label">Co-Chair</div>
      <div class="info-blank"></div>
    </div>
    <div class="info-cell last-row">
      <div class="info-label">Region</div>
      <div class="info-blank"></div>
    </div>
    <div class="info-cell last-row">
      <div class="info-label">Total Score (out of 175)</div>
      <div class="info-blank"></div>
    </div>
  </div>
  `;
}

/* ===== Dimension block (questions + scale legend + score tally) ===== */
function buildDimensionBlock(
  dimIdx: number,
  dimName: string,
  questions: { text: string }[],
): string {
  const qRows = questions
    .map(
      (q, i) => `
    <div class="q-row">
      <div class="q-num">${i + 1}.</div>
      <div class="q-text">${escapeHtml(q.text)}</div>
      <div class="q-circles">
        <span class="q-circle">1</span>
        <span class="q-circle">2</span>
        <span class="q-circle">3</span>
        <span class="q-circle">4</span>
        <span class="q-circle">5</span>
      </div>
    </div>
  `,
    )
    .join("");

  return `
  <div class="section-heading">
    <span class="dim-num">Dimension ${dimIdx + 1}</span>${escapeHtml(dimName)}
  </div>
  <div class="scale-legend">
    <span>1 · Strongly Disagree</span>
    <span>2 · Disagree</span>
    <span>3 · Neutral</span>
    <span>4 · Agree</span>
    <span>5 · Strongly Agree</span>
  </div>
  <div style="border:1px solid ${COLORS.borderSoft};border-radius:3px;overflow:hidden">
    ${qRows}
  </div>
  <div class="dim-score-line">
    Dimension Score <span class="dim-score-blank"></span>
    <span class="dim-score-max">/ 25</span>
  </div>
  `;
}

/* ===== Scoring guide (final page) ===== */
function buildScoringGuide(): string {
  return `
  ${headerBand()}

  <div class="title-block">
    <div class="title-main">SCORING GUIDE</div>
    <div class="title-sub">Maturity Levels · Dimension Health Thresholds</div>
  </div>

  <div class="instructions">
    <strong>How to score:</strong> For each dimension, add the five circled numbers
    (each between 1–5). The dimension score is out of 25. Add all seven dimension
    scores for the <strong>Total Score (out of 175)</strong>. Then read off the
    maturity level below.
  </div>

  <div class="section-heading">Maturity Levels</div>
  <div class="guide-block">
    <table class="guide-table">
      <thead>
        <tr>
          <th style="text-align:center">Level</th>
          <th>State</th>
          <th style="text-align:center">Score Range</th>
          <th>Typical Symptoms</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="lvl-level">L1</td>
          <td class="lvl-state">Structurally Fragile</td>
          <td class="lvl-range">35 – 87<br/><span class="lvl-symptoms">(&lt; 49%)</span></td>
          <td class="lvl-symptoms">Reactive vertical · Weak systems · Poor penetration · No measurable impact</td>
        </tr>
        <tr>
          <td class="lvl-level">L2</td>
          <td class="lvl-state">Emerging</td>
          <td class="lvl-range">88 – 111<br/><span class="lvl-symptoms">(50% – 64%)</span></td>
          <td class="lvl-symptoms">Some clarity · Inconsistent adoption · Systems partially built</td>
        </tr>
        <tr>
          <td class="lvl-level">L3</td>
          <td class="lvl-state">Growing</td>
          <td class="lvl-range">112 – 139<br/><span class="lvl-symptoms">(65% – 79%)</span></td>
          <td class="lvl-symptoms">Clear direction · Moderate national adoption · Beginning of impact measurement</td>
        </tr>
        <tr>
          <td class="lvl-level">L4</td>
          <td class="lvl-state">Established</td>
          <td class="lvl-range">140 – 157<br/><span class="lvl-symptoms">(80% – 89%)</span></td>
          <td class="lvl-symptoms">Strong structure · Good penetration · Measurable outcomes · Documentation present</td>
        </tr>
        <tr>
          <td class="lvl-level">L5</td>
          <td class="lvl-state">Flagship</td>
          <td class="lvl-range">158 – 175<br/><span class="lvl-symptoms">(90%+)</span></td>
          <td class="lvl-symptoms">Institutionalised systems · Recognisable national identity · Strong data discipline · Leadership continuity</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section-heading">Dimension Health Thresholds</div>
  <div class="guide-block">
    <table class="guide-table health-table">
      <thead>
        <tr>
          <th style="text-align:center">Status</th>
          <th style="text-align:center">Score (out of 25)</th>
          <th>Meaning</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="h-status health-strong" style="text-align:center">Strong</td>
          <td style="text-align:center;font-weight:bold">21 – 25</td>
          <td class="lvl-symptoms">Institutionalised — continue and protect what&rsquo;s working.</td>
        </tr>
        <tr>
          <td class="h-status health-stable" style="text-align:center">Stable</td>
          <td style="text-align:center;font-weight:bold">17 – 20</td>
          <td class="lvl-symptoms">Mostly functional with small gaps — tighten one or two practices.</td>
        </tr>
        <tr>
          <td class="h-status health-weak" style="text-align:center">Weak</td>
          <td style="text-align:center;font-weight:bold">13 – 16</td>
          <td class="lvl-symptoms">Inconsistent — needs structured intervention this quarter.</td>
        </tr>
        <tr>
          <td class="h-status health-critical" style="text-align:center">Critical</td>
          <td style="text-align:center;font-weight:bold">5 – 12</td>
          <td class="lvl-symptoms">Broken — this is where the vertical is losing momentum; prioritise here.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">Yi NMT · Vertical Health Diagnostic · Paper Backup</div>
  `;
}

/* ===== Render a single page element into PDF ===== */
async function renderPageToPdf(
  pdf: import("jspdf").jsPDF,
  html: string,
  html2canvas: typeof import("html2canvas").default,
  isFirstPage: boolean,
): Promise<void> {
  const container = document.createElement("div");
  container.setAttribute("data-testid", "blank-test-page");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.zIndex = "-1";
  container.style.width = "794px";
  container.style.background = COLORS.white;
  container.innerHTML = `
    <style>${sharedStyles()}</style>
    <div class="yi-blank">${html}</div>
  `;
  document.body.appendChild(container);

  try {
    const pageEl = container.querySelector(".yi-blank") as HTMLElement | null;
    if (!pageEl) throw new Error("Blank-test page element not found");

    // Let styles settle
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL("image/png");
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (!isFirstPage) pdf.addPage();

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    } else {
      // Rare: content overflows single A4. Paginate downward.
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
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/* ===== Main exported function ===== */
export async function downloadBlankTestPDF(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("downloadBlankTestPDF must run in the browser");
  }

  const html2canvas = (await import("html2canvas")).default;
  const jsPDFCtor = (await import("jspdf")).default;

  const pdf = new jsPDFCtor({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const dimensions = getTestQuestions();

  // Page 1: header + info block + first two dimensions (keeps page density reasonable)
  const firstPageDimensions = dimensions.slice(0, 2);
  const firstPageHtml =
    buildFirstPage() +
    firstPageDimensions
      .map((d) => buildDimensionBlock(d.index, d.name, d.questions))
      .join("") +
    `<div class="page-tag">Page 1 of 4</div>`;

  await renderPageToPdf(pdf, firstPageHtml, html2canvas, true);

  // Page 2: dimensions 3 + 4
  const page2Dimensions = dimensions.slice(2, 4);
  const page2Html =
    headerBand() +
    page2Dimensions
      .map((d) => buildDimensionBlock(d.index, d.name, d.questions))
      .join("") +
    `<div class="page-tag">Page 2 of 4</div>`;

  await renderPageToPdf(pdf, page2Html, html2canvas, false);

  // Page 3: dimensions 5 + 6 + 7
  const page3Dimensions = dimensions.slice(4);
  const page3Html =
    headerBand() +
    page3Dimensions
      .map((d) => buildDimensionBlock(d.index, d.name, d.questions))
      .join("") +
    `<div class="page-tag">Page 3 of 4</div>`;

  await renderPageToPdf(pdf, page3Html, html2canvas, false);

  // Page 4: scoring guide
  const guideHtml = buildScoringGuide() + `<div class="page-tag">Page 4 of 4</div>`;
  await renderPageToPdf(pdf, guideHtml, html2canvas, false);

  const filename = `NMT-Paper-Assessment-${todayYmd()}.pdf`;
  pdf.save(filename);
}

/* ===== Default export for convenience ===== */
export default downloadBlankTestPDF;
