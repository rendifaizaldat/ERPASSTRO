// tools/auditor/runner.ts
import { chromium, Page } from "playwright";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import ts from "typescript";
import { spawn } from "child_process";
import { DiagnosticEngine } from "./diagnostic-engine";

const APP_URL = "http://localhost:3000";
let isAuditRunning = false;
let globalPage: Page | null = null; 
let apiTraces: any[] = []; 

async function runFullReset(io: Server) {
  const emitLog = (msg: string) => {
    console.log(msg);
    io.emit("log", msg);
  };
  emitLog("[AUDITOR] Menjalankan full reset karena browser ditutup...");
  const backendDir = path.resolve(__dirname, "../../apps/backend");
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const child = spawn(command, ["run", "fr"], {
    cwd: backendDir,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  child.on("close", (code) => {
    emitLog(code === 0 ? "[AUDITOR] Full reset selesai." : `[AUDITOR] Full reset gagal (exit ${code}).`);
  });
}

async function runAudit(io: Server) {
  if (isAuditRunning) return;
  isAuditRunning = true;
  const engine = new DiagnosticEngine(io);
  const emitLog = (msg: string) => { console.log(msg); io.emit("log", msg); };

  try {
    emitLog("=== Memulai Auditor Engine (Mode: Live E2E Sniffer) ===");
    const browser = await chromium.launch({ headless: false, slowMo: 0 });
    const context = await browser.newContext({
      geolocation: { latitude: -6.8153, longitude: 107.6186 },
      permissions: ["geolocation"],
    });

    await context.exposeBinding("sendAuditorEvent", async ({ page }, eventType: string, payload: any) => {
      if (eventType === "app_ready") await engine.onAppReady(payload.baselineState);
      else if (eventType === "interaction_start") {
        await engine.onInteractionStart(payload.interactionId, payload.element, payload.timestamp);
        // Force log ke UI agar tidak kosong
        io.emit("interaction_start", { meta: payload.element }); 
      }
      else if (eventType === "interaction_complete") await engine.onInteractionComplete(payload.interactionId, payload.evidence);
      else if (eventType === "api_trace") {
        apiTraces.push(payload);
        io.emit("api_traces_update", { traces: apiTraces }); // Realtime update ke UI
        let endpoint = payload.url;
        try { endpoint = new URL(payload.url).pathname; } catch(e) {}
        io.emit("log", `[NETWORK] ${payload.method} ${endpoint} -> Status HTTP: ${payload.status}`);
      }
    });

    const collectorScriptPath = path.resolve(__dirname, "./evidence-collector.ts");
    let collectorCode = fs.readFileSync(collectorScriptPath, "utf8").replace("export function injectEvidenceCollector()", "function injectEvidenceCollector()");
    collectorCode += "\n\ninjectEvidenceCollector();";
    const jsCode = ts.transpileModule(collectorCode, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    await context.addInitScript({ content: jsCode });
    
    // =========================================================================
    // THE DYNO SENSOR: Mencegat Fetch API langsung dari dalam otak PWA!
    // =========================================================================
    await context.addInitScript({
      content: `
        const origFetch = window.fetch;
        window.fetch = async function(...args) {
          const reqUrl = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
          
          if (reqUrl.includes('/api/')) {
            let reqBody = null;
            if (args[1] && args[1].body && typeof args[1].body === 'string') {
               try { reqBody = JSON.parse(args[1].body); } catch(e) { reqBody = { raw: args[1].body }; }
            }
            
            try {
              const response = await origFetch.apply(this, args);
              const clone = response.clone();
              let resBody = null;
              try {
                const text = await clone.text();
                try { resBody = JSON.parse(text); } catch(e) { resBody = { raw: text }; }
              } catch(e) {}
              
              // Kirim Bukti ke Terminal Dashboard Real-time
              window.sendAuditorEvent("api_trace", {
                 timestamp: Date.now(),
                 method: args[1]?.method || 'GET',
                 url: reqUrl,
                 requestPayload: reqBody,
                 responsePayload: resBody,
                 status: response.status
              });
              return response;
            } catch(err) {
              window.sendAuditorEvent("api_trace", {
                 timestamp: Date.now(),
                 method: args[1]?.method || 'GET',
                 url: reqUrl,
                 requestPayload: reqBody,
                 responsePayload: { error: err.message },
                 status: 0
              });
              throw err;
            }
          }
          return origFetch.apply(this, args);
        };
      `
    });

    // Blocker berbasis Session Storage (Kebal Refresh)
    await context.addInitScript({
      content: `
        window.addEventListener('DOMContentLoaded', () => {
          const isUnlocked = sessionStorage.getItem('AUDITOR_UNLOCKED') === 'true';
          const scenarioMsg = sessionStorage.getItem('AUDITOR_MSG') || 'Pilih skenario di Dashboard Auditor dan klik "Mulai" untuk membuka akses.';
          const isSuccess = sessionStorage.getItem('AUDITOR_SUCCESS') === 'true';
          
          const blocker = document.createElement('div');
          blocker.id = 'auditor-blocker';
          blocker.style.cssText = \`position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.95);z-index:9999999;display:\${isUnlocked ? 'none' : 'flex'};flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;text-align:center;backdrop-filter:blur(10px);transition:all 0.3s;\`;
          blocker.innerHTML = \`<h1 style="font-size:2rem;font-weight:900;margin-bottom:10px;text-transform:uppercase;color:\${isSuccess ? '#10b981' : '#ea580c'}">\${isSuccess ? 'SKENARIO SELESAI' : 'SIAGA PENGUJIAN'}</h1><p style="color:#94a3b8;font-weight:600;">\${scenarioMsg}</p>\`;
          document.body.appendChild(blocker);
        });
      `
    });

    globalPage = await context.newPage();
    emitLog(`Membuka ${APP_URL}... (Terblokir hingga skenario dipilih)`);
    await globalPage.goto(APP_URL);

    globalPage.on("close", () => {
      emitLog("Browser ditutup.");
      isAuditRunning = false;
      globalPage = null;
      void runFullReset(io);
    });

  } catch (err: any) {
    emitLog(`[ERROR] ${err.message}`);
    isAuditRunning = false;
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

httpServer.listen(3030, () => {
  console.log("Auditor UI Dashboard: http://localhost:3030");
  io.on("connection", (socket) => {
    runAudit(io);

    socket.on("start_scenario", async (payload) => {
      apiTraces = []; // Bersihkan cache dyno lama
      if (globalPage) {
        await globalPage.evaluate(() => {
          sessionStorage.setItem('AUDITOR_UNLOCKED', 'true');
          sessionStorage.removeItem('AUDITOR_SUCCESS');
          const el = document.getElementById('auditor-blocker');
          if (el) el.style.display = 'none';
        });
        io.emit("log", `[SKENARIO DIBUKA] Memulai pengujian: ${payload.scenario}`);
        io.emit("api_traces_update", { traces: [] }); // Reset tabel dashboard
      }
    });

    socket.on("evaluate_scenario", async (reqPayload) => {
      const { scenario } = reqPayload;
      if (globalPage) {
        await globalPage.evaluate((scen) => {
          sessionStorage.removeItem('AUDITOR_UNLOCKED');
          sessionStorage.setItem('AUDITOR_SUCCESS', 'true');
          sessionStorage.setItem('AUDITOR_MSG', `Skenario ${scen} selesai diuji. Silakan periksa dashboard.`);
          let el = document.getElementById('auditor-blocker');
          if (el) {
            el.style.display = 'flex';
            el.innerHTML = `<h1 style="font-size:2rem;font-weight:900;margin-bottom:10px;text-transform:uppercase;color:#10b981">SKENARIO SELESAI</h1><p style="color:#94a3b8;font-weight:600;">Data telah ditangkap.</p>`;
          }
        }, scenario);
      }
      io.emit("scenario_evaluated", { status: "OK", scenario });
      io.emit("log", `[EVALUASI] Skenario ${scenario} dihentikan dan dicatat.`);
    });
  });
});