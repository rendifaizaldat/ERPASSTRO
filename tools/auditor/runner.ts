// tools/auditor/runner.ts
import { chromium, Page } from "playwright";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import ts from "typescript";
import { DiagnosticEngine } from "./diagnostic-engine";

const APP_URL = "http://localhost:3000";

let isAuditRunning = false;

async function runAudit(io: Server) {
  let browser: any = null;
  let page: Page | null = null;
  const engine = new DiagnosticEngine(io);

  const emitLog = (msg: string) => {
    console.log(msg);
    io.emit("log", msg);
  };

  if (isAuditRunning) {
    emitLog("[AUDITOR] Audit sudah berjalan. Skip koneksi baru.");
    return;
  }
  isAuditRunning = true;

  try {
    emitLog("=== Memulai Auditor (Evidence Engine Mode) ===");
    browser = await chromium.launch({ headless: false, slowMo: 0 }); // headless: false is required for manual testing
    const context = await browser.newContext({
      geolocation: { latitude: -6.8153, longitude: 107.6186 },
      permissions: ["geolocation"],
    });

    // Binding for Evidence Collector
    await context.exposeBinding("sendAuditorEvent", async ({ page }, eventType, payload) => {
       if (eventType === "interaction_start") {
           await engine.onInteractionStart(payload.interactionId, payload.element, payload.timestamp);
       } else if (eventType === "interaction_complete") {
           await engine.onInteractionComplete(payload.interactionId, payload.evidence);
       }
    });

    // Inject Evidence Collector Script
    const collectorScriptPath = path.resolve(__dirname, "./evidence-collector.ts");

    // Read the file and strip the 'export' keyword from the function
    let collectorCode = fs.readFileSync(collectorScriptPath, 'utf8');
    collectorCode = collectorCode.replace('export function injectEvidenceCollector()', 'function injectEvidenceCollector()');
    collectorCode += '\n\ninjectEvidenceCollector();'; // auto-execute

    // Transpile TS to JS on the fly so the browser understands it
    const jsCode = ts.transpileModule(collectorCode, {
      compilerOptions: { target: ts.ScriptTarget.ES2020 }
    }).outputText;

    await context.addInitScript({ content: jsCode });

    page = await context.newPage();

    emitLog(`Membuka ${APP_URL}... Silakan lakukan pengujian manual.`);
    await page.goto(APP_URL);

    // We do NOT close the browser automatically anymore.
    // The auditor stays open and observes user actions.

    // Wait until browser is closed by the user
    page.on("close", () => {
        emitLog("Browser ditutup. Auditor selesai.");
        isAuditRunning = false;
    });

  } catch (err: any) {
    emitLog(`[ERROR] ${err.message}`);
    isAuditRunning = false;
    if (browser) await browser.close();
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, "public")));

httpServer.listen(3030, () => {
  console.log("Auditor UI Dashboard: http://localhost:3030");
  io.on("connection", (socket) => {
    console.log("Client connected to Dashboard. Starting Evidence Engine...");
    runAudit(io);

    socket.on("disconnect", () => {
       console.log("Dashboard disconnected.");
    });
  });
});
