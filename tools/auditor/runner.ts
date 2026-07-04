import { chromium, Page } from "playwright";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { dbChecker } from "./db-checker";

const APP_URL = "http://localhost:3000";

export interface ScenarioContext {
  page: Page;
  emitLog: (msg: string) => void;
  assert: (condition: boolean, message: string) => void;
  waitForBackend: (
    fn: () => Promise<boolean>,
    timeoutMs?: number,
  ) => Promise<void>;
  dbChecker: typeof dbChecker;
  getLocalAndServerState: () => Promise<{ local: any, server: any }>;
  injectAction: (eventType: string, payload: any) => Promise<void>;
  assertDataState: (pre: any, post: any, label: string) => void;
  emitState: (phase: "PRE" | "POST", label: string, local: any, server: any) => void;
}

let isAuditRunning = false;

async function runAudit() {
  let browser: any = null;
  let page: Page | null = null;

  const emitLog = (msg: string) => {
    console.log(msg);
    io.emit("log", msg);
  };

  const emitState = (
    phase: "PRE" | "POST",
    actionLabel: string,
    local: any,
    server: any,
  ) => {
    io.emit("stateUpdate", { phase, label: actionLabel, local, server });
  };

  const getLocalAndServerState = async () => {
    const local = await page!.evaluate(async () => {
      const api = (window as any).__AUDITOR__;
      if (!api) return {};
      const state = await api.projector.getState();
      return state;
    });

    const server = await dbChecker.getServerState();
    return { local, server };
  };

  const injectAction = async (eventType: string, payload: any) => {
    emitLog(`[INJECT] ${eventType}...`);
    await page!.evaluate(async ({ eventTypeVal, payloadVal }) => {
      const api = (window as any).__AUDITOR__;
      if (!api) throw new Error("Auditor API tidak terekspos");

      const payloadCopy = { ...payloadVal };
      if (!payloadCopy.deviceId) {
        payloadCopy.deviceId = localStorage.getItem("ASSTRO_DEVICE_ID") || "UNKNOWN-DEVICE";
      }
      if (!payloadCopy.branchId) {
        payloadCopy.branchId = localStorage.getItem("ASSTRO_BRANCH_ID") || "";
      }
      if (!payloadCopy.businessDate) {
        payloadCopy.businessDate = localStorage.getItem("ASSTRO_BUSINESS_DATE") || new Date().toISOString().slice(0, 10);
      }

      await api.ledger.appendEvent(eventTypeVal, payloadCopy);
    }, { eventTypeVal: eventType, payloadVal: payload });
  };

  const assertDataState = (pre: any, post: any, label: string) => {
    emitLog(`[ASSERT] Membandingkan state untuk ${label}...`);
    emitState("PRE", label, pre.local, pre.server);
    emitState("POST", label, post.local, post.server);

    const serverChanges: string[] = [];
    const localChanges: string[] = [];

    // Helper for deep comparison
    const compareObjects = (preObj: any, postObj: any, prefix: string, changesArr: string[]) => {
      if (!preObj && !postObj) return;
      if (!preObj && postObj) {
         changesArr.push(`[BARU] Data ditambahkan pada ${prefix}`);
         return;
      }
      if (preObj && !postObj) {
         changesArr.push(`[HAPUS] Data dihapus dari ${prefix}`);
         return;
      }

      if (Array.isArray(preObj) && Array.isArray(postObj)) {
         if (postObj.length > preObj.length) {
            changesArr.push(`[INSERT] ${postObj.length - preObj.length} baris ditambahkan ke ${prefix}.`);
         } else if (postObj.length < preObj.length) {
            changesArr.push(`[DELETE] ${preObj.length - postObj.length} baris dihapus dari ${prefix}.`);
         }
      } else if (typeof preObj === 'object' && typeof postObj === 'object') {
         const keys = new Set([...Object.keys(preObj), ...Object.keys(postObj)]);
         for (const key of keys) {
            if (preObj[key] !== postObj[key]) {
               const preVal = typeof preObj[key] === 'object' ? JSON.stringify(preObj[key]) : preObj[key];
               const postVal = typeof postObj[key] === 'object' ? JSON.stringify(postObj[key]) : postObj[key];
               changesArr.push(`[UPDATE] Kolom ${prefix}.${key} berubah dari '${preVal}' menjadi '${postVal}'.`);
            }
         }
      }
    };

    // Compare Server State (Backend)
    if (pre.server && post.server) {
      if (pre.server.shifts && post.server.shifts) compareObjects(pre.server.shifts, post.server.shifts, "PgSQL.shifts", serverChanges);
      if (pre.server.categories && post.server.categories) compareObjects(pre.server.categories, post.server.categories, "PgSQL.categories", serverChanges);
      if (pre.server.products && post.server.products) compareObjects(pre.server.products, post.server.products, "PgSQL.products", serverChanges);
      if (pre.server.journal && post.server.journal) compareObjects(pre.server.journal, post.server.journal, "PgSQL.journal", serverChanges);
    }

    // Compare Local State (RxDB)
    if (pre.local && post.local) {
       compareObjects(pre.local, post.local, "RxDB", localChanges);
    }

    const diff = {
      label,
      localChanges,
      serverChanges,
    };

    io.emit("diffUpdate", diff);
  };

  const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };

  const waitForBackend = async (
    fn: () => Promise<boolean>,
    timeoutMs = 10000,
  ) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await fn()) return;
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error("waitForBackend timeout");
  };


  // ==========================================
  // INJECTION HELPERS (via page.evaluate) - PURE EVENT-DRIVEN
  // ==========================================








  // ==========================================
  // ASSERTION HELPERS
  // ==========================================







  if (isAuditRunning) {
    emitLog("[AUDITOR] Audit sudah berjalan. Skip koneksi baru.");
    return;
  }
  isAuditRunning = true;

  try {
    emitLog("=== Mulai Auditor E2E (Hybrid Mode) ===");
    browser = await chromium.launch({ headless: false, slowMo: 30 });
    const context = await browser.newContext({
      geolocation: { latitude: -6.8153, longitude: 107.6186 },
      permissions: ["geolocation"],
    });
    page = await context.newPage();

    emitLog(`Membuka ${APP_URL}...`);
    await page!.goto(APP_URL);
    await page!.waitForLoadState("networkidle");

    // ==========================================
    // SKENARIO 1: Setup Wizard (UI Mocks & Interaction)
    // ==========================================
    emitLog("[SKENARIO 1] Eksekusi Setup Wizard E2E...");
    const { run: runSetup } = await import("./scenarios/skenario-01-setup");
    await runSetup({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, emitState, assertDataState });

    // Opsional: Klik tombol "Buka Mesin Kasir" jika skenario 1 tidak mengkliknya secara otomatis
    try {
      const openBtn = await page!.$('button:has-text("Buka Mesin Kasir")');
      if (openBtn) {
        await openBtn.click();
        await page!.waitForLoadState("networkidle");
      }
    } catch (e) {}

    // Tunggu __AUDITOR__ tersedia setelah setup selesai dan aplikasi memuat layar Login/Utama
    await page!.waitForFunction(() => (window as any).__AUDITOR__, {
      timeout: 30000,
    });
    emitLog("[CHECK] Auditor API tersedia di window (Post-Setup).");

    // ==========================================
    // SKENARIO 2: Login & Buka Shift (Pure event injection)
    // ==========================================
    emitLog("[SKENARIO 2] Login & Shift via pure event injection...");


    const { run: runShift } = await import("./scenarios/skenario-02-shift");
    await runShift({
      page: page!,
      emitLog,
      assert,
      waitForBackend,
      dbChecker,
      getLocalAndServerState,
      injectAction,
      assertDataState,
      emitState
    });

    // ==========================================
    // SKENARIO 3: Katalog (Pure event injection)
    // ==========================================
    emitLog("[SKENARIO 3] Katalog Produk via injection...");

    const { run: runkatalog } = await import("./scenarios/skenario-03-katalog");
    await runkatalog({
      page: page!,
      emitLog,
      assert,
      waitForBackend,
      dbChecker,
      getLocalAndServerState,
      injectAction,
      assertDataState,
      emitState
    });


    // ==========================================
    // SKENARIO 4: Alur Kerja Pesanan
    // ==========================================
    emitLog("[SKENARIO 4] Memulai Order Workflow...");
    const { run: runOrder } = await import("./scenarios/skenario-04-order");
    await runOrder({
      page: page!,
      emitLog,
      assert,
      waitForBackend,
      dbChecker,
      getLocalAndServerState,
      injectAction,
      assertDataState,
      emitState
    });


    // ==========================================
    // SKENARIO 5-13
    // ==========================================
    emitLog("[SKENARIO 5] Memulai Payment Workflow...");
    const { run: runPayment } = await import("./scenarios/skenario-05-payment");
    await runPayment({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, assertDataState, emitState });

    emitLog("[SKENARIO 6] Memulai Reservation Workflow...");
    const { run: runReservation } = await import("./scenarios/skenario-06-reservasi");
    await runReservation({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, assertDataState, emitState });

    emitLog("[SKENARIO 7] Memulai Void Workflow...");
    const { run: runVoid } = await import("./scenarios/skenario-07-void");
    await runVoid({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, assertDataState, emitState });

    emitLog("[SKENARIO 8] Memulai Table Movement Workflow...");
    const { run: runTable } = await import("./scenarios/skenario-08-table");
    await runTable({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, assertDataState, emitState });

    emitLog("[SKENARIO 9] Memulai Refund Workflow...");
    const { run: runRefund } = await import("./scenarios/skenario-09-refund");
    await runRefund({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, assertDataState, emitState });

    emitLog("[SKENARIO 10] Memulai Settings Workflow...");
    const { run: runSettings } = await import("./scenarios/skenario-10-settings");
    await runSettings({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, assertDataState, emitState });

    emitLog("[SKENARIO 11] Memulai Handover Workflow...");
    const { run: runHandover } = await import("./scenarios/skenario-11-handover");
    await runHandover({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, assertDataState, emitState });

    emitLog("[SKENARIO 12] Memulai Recovery Workflow...");
    const { run: runRecovery } = await import("./scenarios/skenario-12-recovery");
    await runRecovery({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, assertDataState, emitState });

    emitLog("[SKENARIO 13] Memulai EOD Workflow...");
    const { run: runEod } = await import("./scenarios/skenario-13-eod");
    await runEod({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, assertDataState, emitState });

    emitLog("=== AUDIT SELESAI SUKSES ===");

    io.emit("auditComplete");
  } catch (err: any) {
    emitLog(`[ERROR] ${err.message}`);
    emitLog("[RECOVERY] Reset database...");
    try {
      const backendRoot = path.resolve(__dirname, "../../apps/backend");
      const isWin = process.platform === "win32";
      let pnpmCmd = isWin ? "pnpm.cmd" : "pnpm";
      const localPnpm = path.join(
        path.resolve(__dirname, "../../node_modules/.bin"),
        isWin ? "pnpm.cmd" : "pnpm",
      );
      if (fs.existsSync(localPnpm)) pnpmCmd = `"${localPnpm}"`;
      execSync(`${pnpmCmd} run fr`, {
        cwd: backendRoot,
        stdio: "inherit",
        shell: isWin ? "cmd.exe" : "/bin/sh",
      });
      emitLog("[RECOVERY] Database reset.");
    } catch (e: any) {
      emitLog(`[RECOVERY GAGAL] ${e.message}`);
    }
    if (page) {
      await page.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      });
    }
  } finally {
    isAuditRunning = false;
    if (browser) await browser.close();
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, "public")));

httpServer.listen(3030, () => {
  console.log("Auditor UI: http://localhost:3030");
  io.on("connection", () => {
    console.log("Client connected. Starting audit...");
    runAudit();
  });
});
