// tools/auditor/public/script.js
const socket = io();
const statusDot = document.getElementById("statusDot");
const sysLogs = document.getElementById("sysLogs");
const reportsContainer = document.getElementById("reportsContainer");
const scenarioSelector = document.getElementById("scenarioSelector");

const startBtn = document.getElementById("startBtn");
const evalBtn = document.getElementById("evalBtn");
const scenarioStatusBadge = document.getElementById("scenarioStatusBadge");

const reqContent = document.getElementById("localRawContent");
const resContent = document.getElementById("serverRawContent");

let currentScenario = "NONE";

socket.on("connect", () => {
  statusDot.style.background = "var(--success)";
  statusDot.style.boxShadow = "0 0 8px var(--success)";
  addLog("Connected to Auditor Server.", "log-success");
});

socket.on("disconnect", () => {
  statusDot.style.background = "var(--error)";
  statusDot.style.boxShadow = "0 0 8px var(--error)";
  addLog("Disconnected from Auditor Server.", "log-error");
});

scenarioSelector.addEventListener("change", (e) => {
  currentScenario = e.target.value;
  startBtn.disabled = currentScenario === "NONE";
  evalBtn.disabled = true;
  scenarioStatusBadge.style.display = "none";
  reqContent.innerHTML = `<div class="log-info">Menunggu eksekusi skenario...</div>`;
  resContent.innerHTML = `<div class="log-info">Menunggu eksekusi skenario...</div>`;
});

startBtn.addEventListener("click", () => {
  socket.emit("start_scenario", { scenario: currentScenario });
  startBtn.disabled = true;
  evalBtn.disabled = false;
  scenarioStatusBadge.style.display = "none";
  reqContent.innerHTML = `<div class="log-info">Merekam data API dikirim secara real-time...</div>`;
  resContent.innerHTML = `<div class="log-info">Merekam data API diterima secara real-time...</div>`;
  addLog(`[SKENARIO] Membuka gembok aplikasi untuk skenario: ${currentScenario}`);
});

evalBtn.addEventListener("click", () => {
  socket.emit("evaluate_scenario", { scenario: currentScenario });
  evalBtn.disabled = true;
  addLog(`[EVALUASI] Skenario selesai. Data telah ditangkap.`);
});

socket.on("scenario_evaluated", (payload) => {
  if (payload.status === "OK") {
    scenarioStatusBadge.textContent = `${payload.scenario} - SUCCESS (OK)`;
    scenarioStatusBadge.style.display = "flex";
  }
});

// =========================================================================
// RENDER REAL-TIME API TRACES
// =========================================================================
socket.on("api_traces_update", (data) => {
  const traces = data.traces || [];
  if (traces.length === 0) {
    reqContent.innerHTML = `<div class="log-warn">Menunggu data API terkirim...</div>`;
    resContent.innerHTML = `<div class="log-warn">Menunggu balasan API...</div>`;
    return;
  }

  let reqHtml = "";
  let resHtml = "";

  // Balik array agar request yang paling baru (terakhir diklik) muncul paling atas
  [...traces].reverse().forEach((trace) => {
    let endpoint = trace.url;
    try { endpoint = new URL(trace.url).pathname; } catch(e) {}
    const title = `[${trace.method}] ${endpoint}`;

    reqHtml += renderFieldTable(title, trace.requestPayload);
    resHtml += renderFieldTable(title, trace.responsePayload, trace.status);
  });

  reqContent.innerHTML = reqHtml;
  resContent.innerHTML = resHtml;
});

// =========================================================================
// ENGINE PERATA JSON (Flatten Object)
// Meratakan nested JSON menjadi "payload.shiftId"
// =========================================================================
function flattenObj(obj, parent = '', res = {}) {
  for (let key in obj) {
      let propName = parent ? parent + '.' + key : key;
      if (typeof obj[key] == 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          flattenObj(obj[key], propName, res);
      } else {
          res[propName] = obj[key];
      }
  }
  return res;
}

// =========================================================================
// RENDER TABEL (FIELD | VALUE)
// =========================================================================
function renderFieldTable(title, jsonObj, status = null) {
  if (!jsonObj) return `<div class="table-wrapper"><h4>${title}</h4><div class="log-info">Tidak ada payload (KOSONG).</div></div>`;
  
  let statusBadge = status ? `<span style="float:right; color: ${status >= 400 ? 'var(--error)' : 'var(--success)'}">HTTP ${status}</span>` : "";
  let html = `<div class="table-wrapper"><h4>${title} ${statusBadge}</h4>`;

  // Ubah ke bentuk array agar seragam diproses (bisa jadi balasan API adalah array of objects)
  let arr = Array.isArray(jsonObj) ? jsonObj : [jsonObj];
  
  if (arr.length === 0) return html + `<div class="log-info">Array Kosong []</div></div>`;

  arr.forEach((item) => {
      let flat = flattenObj(item);
      
      html += `<table class="data-table" style="margin-bottom: 10px;">`;
      html += `<thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>`;
      
      for(let key in flat) {
          let val = flat[key];
          // Tangani Array di dalam Object (misal list items)
          if (Array.isArray(val)) {
            val = `[ Array of ${val.length} object(s) ]`;
          } else if (typeof val === 'object') {
            val = JSON.stringify(val); 
          }
          
          html += `<tr>
                    <td style="font-weight:bold; color: #94a3b8;">${key}</td>
                    <td style="color: #e2e8f0;">${val !== null && val !== undefined ? val : '<em style="color:#64748b">null</em>'}</td>
                   </tr>`;
      }
      html += `</tbody></table>`;
  });
  
  html += `</div>`;
  return html;
}

socket.on("log", (msg) => addLog(msg));
socket.on("interaction_start", (data) => {
  if(data && data.meta) addLog(`[ACTION] Clicked: <${data.meta.tagName}> "${data.meta.text}"`);
});
socket.on("diagnosis_report", ({ report }) => renderReport(report));

function addLog(msg, type = "") {
  const emptyState = sysLogs.querySelector(".log-info");
  if (emptyState && emptyState.textContent.includes("Menunggu aktivitas")) emptyState.remove();
  const div = document.createElement("div");
  div.className = `log-line ${type}`;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  sysLogs.appendChild(div);
  sysLogs.scrollTop = sysLogs.scrollHeight;
}

function renderReport(report) {
  if (!report) return;
  const emptyState = reportsContainer.querySelector(".log-info");
  if (emptyState && emptyState.textContent.includes("akan muncul di sini")) emptyState.remove();
  const div = document.createElement("div");
  div.className = "log-line";
  div.style.marginBottom = "1rem";
  let colorClass = report.isError ? "log-error" : report.score > 0 && report.score < 3 ? "log-warn" : "log-success";
  
  let html = `<strong class="${colorClass}">Verdict: ${report.diagnosis}</strong><br/>`;
  html += `<span style="font-size: 0.75rem; color: #94a3b8;">Score: ${report.score}/6 | DOM:${report.evidenceSummary.dom} Net:${report.evidenceSummary.network} Ledger:${report.evidenceSummary.ledger}</span><br/>`;
  
  div.innerHTML = html;
  reportsContainer.appendChild(div);
  reportsContainer.scrollTop = reportsContainer.scrollHeight;
}