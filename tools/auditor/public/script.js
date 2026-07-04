const socket = io();

const statusDot = document.getElementById("statusDot");
const sysLogs = document.getElementById("sysLogs");
const reportsContainer = document.getElementById("reportsContainer");

socket.on("connect", () => {
  statusDot.classList.remove("disconnected");
  addLog("Connected to Auditor Server.");
});

socket.on("disconnect", () => {
  statusDot.classList.add("disconnected");
  addLog("Disconnected from Auditor Server.");
});

socket.on("log", (msg) => {
  addLog(msg);
});

socket.on("interaction_start", (data) => {
  addLog(`[ACTION] User clicked: <${data.meta.tagName}> "${data.meta.text}"`);
});

socket.on("diagnosis_report", ({ report, diffReport }) => {
  renderReport(report, diffReport);
});

function addLog(msg) {
  const div = document.createElement("div");
  div.className = "log-entry";
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  sysLogs.appendChild(div);
  sysLogs.scrollTop = sysLogs.scrollHeight;
}

function renderReport(report, diff) {
  const card = document.createElement("div");
  card.className = "report-card";

  let badgeClass = "success";
  if (report.isError) badgeClass = "error";
  else if (report.score > 0 && report.score < 3) badgeClass = "warning";

  const getEvidenceHtml = (label, val) => `
    <div class="evidence-item">
      <div class="evidence-value ${val > 0 ? 'active' : ''}">${val}</div>
      <div class="evidence-label">${label}</div>
    </div>
  `;

  let diffHtml = '';
  if (diff && diff.hasChanges) {
    diffHtml = `
      <div class="diff-container">
        <div class="diff-title">State Comparator Changes (Pre vs Post)</div>
        ${diff.changes.map(c => {
          let cType = "UPDATE";
          if (c.includes("[INSERT]") || c.includes("[NEW]")) cType = "INSERT";
          if (c.includes("[DELETE]") || c.includes("[REMOVED]")) cType = "DELETE";
          return `<div class="diff-item ${cType}">${c}</div>`;
        }).join('')}
      </div>
    `;
  }

  card.innerHTML = `
    <div class="report-header">
      <div>
        <div class="report-title">Interaction on &lt;${report.element.tagName}&gt;</div>
        <div class="report-meta">Text: "${report.element.text}" | Class: ${report.element.className || '-'}</div>
      </div>
      <div class="badge ${badgeClass}">Score: ${report.score}/6</div>
    </div>

    <div class="evidence-grid">
      ${getEvidenceHtml('DOM', report.evidenceSummary.dom)}
      ${getEvidenceHtml('Network', report.evidenceSummary.network)}
      ${getEvidenceHtml('Storage', report.evidenceSummary.storage)}
      ${getEvidenceHtml('Ledger', report.evidenceSummary.ledger)}
      ${getEvidenceHtml('Toast', report.evidenceSummary.toast)}
      ${getEvidenceHtml('URL', report.evidenceSummary.url)}
    </div>

    <div class="diagnosis-box">
      <div class="diff-title">Diagnostic Engine Verdict</div>
      <div class="diagnosis-text ${report.isError ? 'error' : ''}">
        ${report.diagnosis}
      </div>
      <div style="font-size: 0.75rem; color: #94a3b8;">Confidence: ${report.confidence}</div>
    </div>

    ${diffHtml}
  `;

  reportsContainer.prepend(card); // Add to top
}
