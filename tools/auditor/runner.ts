import { chromium, Page } from "playwright";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { dbChecker } from "./db-checker";

const APP_URL = "http://localhost:3000";

interface ScenarioContext {
  page: Page;
  emitLog: (msg: string) => void;
  assert: (condition: boolean, message: string) => void;
  waitForBackend: (
    fn: () => Promise<boolean>,
    timeoutMs?: number,
  ) => Promise<void>;
  dbChecker: typeof dbChecker;
}

let isAuditRunning = false;

async function runAudit() {
  let browser: any = null;
  let page: Page | null = null;

  const emitLog = (msg: string) => {
    console.log(msg);
    io.emit("log", msg);
  };

  const emitState = (local: any, server: any) => {
    io.emit("stateUpdate", { local, server });
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

  const injectOperatorAuth = async (pin: string) => {
    emitLog(`[INJECT] OPERATOR_AUTHENTICATED via PIN '${pin}'...`);
    await page!.evaluate(async (pinVal) => {
      const api = (window as any).__AUDITOR__;
      if (!api) throw new Error("Auditor API tidak terekspos");

      // 1. Cek di localStorage (Hasil Hydration Setup Wizard)
      const offlineStaffStr = localStorage.getItem("ASSTRO_OFFLINE_STAFF");
      const offlineStaff = offlineStaffStr ? JSON.parse(offlineStaffStr) : [];
      let staff = offlineStaff.find(
        (s: any) => s.pin === pinVal && s.isActive !== false,
      );

      // 2. Jika tidak ada, fallback cek ke Projector (Ledger State)
      if (!staff) {
        const state = await api.projector.getState();
        staff = (state.staffList || []).find(
          (s: any) => s.pin === pinVal && s.isActive !== false,
        );
      }

      if (!staff)
        throw new Error(
          `Staff dengan PIN '${pinVal}' tidak ditemukan di memori lokal maupun Ledger.`,
        );

      const deviceId =
        localStorage.getItem("ASSTRO_DEVICE_ID") || "UNKNOWN-DEVICE";
      const branchId = localStorage.getItem("ASSTRO_BRANCH_ID") || "";

      await api.ledger.appendEvent("OPERATOR_AUTHENTICATED", {
        operatorId: staff.id,
        pin: pinVal,
        authenticatedAt: new Date().toISOString(),
        deviceId,
        branchId,
      });
    }, pin);
  };

  const injectOpenShift = async (pin: string, amount: number) => {
    emitLog(`[INJECT] SHIFT_OPENED dengan modal ${amount}...`);
    await page!.evaluate(
      async ({ pinVal, cashVal }) => {
        const api = (window as any).__AUDITOR__;
        if (!api) throw new Error("Auditor API tidak terekspos");

        // 1. Cek di localStorage
        const offlineStaffStr = localStorage.getItem("ASSTRO_OFFLINE_STAFF");
        const offlineStaff = offlineStaffStr ? JSON.parse(offlineStaffStr) : [];
        let staff = offlineStaff.find(
          (s: any) => s.pin === pinVal && s.isActive !== false,
        );

        // 2. Fallback cek ke Projector
        if (!staff) {
          const state = await api.projector.getState();
          staff = (state.staffList || []).find(
            (s: any) => s.pin === pinVal && s.isActive !== false,
          );
        }

        if (!staff)
          throw new Error(`Staff dengan PIN '${pinVal}' tidak ditemukan.`);

        const shiftId = `SHIFT-${Date.now().toString(36).toUpperCase()}`;
        const branchId = localStorage.getItem("ASSTRO_BRANCH_ID") || "";
        const deviceId =
          localStorage.getItem("ASSTRO_DEVICE_ID") || "UNKNOWN-DEVICE";

        let businessDate = localStorage.getItem("ASSTRO_BUSINESS_DATE");
        if (!businessDate) {
          const now = new Date();
          const ref =
            now.getHours() < 3
              ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
              : now;
          businessDate = ref.toISOString().slice(0, 10);
          localStorage.setItem("ASSTRO_BUSINESS_DATE", businessDate);
        }

        localStorage.setItem("ASSTRO_CURRENT_SHIFT_ID", shiftId);

        await api.ledger.appendEvent("SHIFT_OPENED", {
          operatorId: staff.id,
          initial_cash: cashVal,
          shiftId,
          branchId,
          deviceId,
          cashierId: staff.id,
          openedAt: new Date().toISOString(),
          startingCash: cashVal,
          businessDate,
        });
      },
      { pinVal: pin, cashVal: amount },
    );
  };

  const injectCategory = async (name: string) => {
    emitLog(`[INJECT] CATEGORY_ADDED '${name}'...`);
    await page!.evaluate(async (catName) => {
      const api = (window as any).__AUDITOR__;
      if (!api) throw new Error("Auditor API tidak terekspos");
      const id = "CAT-" + Date.now().toString(36).toUpperCase();
      await api.ledger.appendEvent("CATEGORY_ADDED", {
        id,
        name: catName.trim().toUpperCase(),
        created_by: "AUDITOR",
      });
    }, name);
  };

  const injectProduct = async (
    sku: string,
    name: string,
    price: number,
    categoryName: string,
  ) => {
    emitLog(`[INJECT] PRODUCT_ADDED '${sku}'...`);
    await page!.evaluate(
      async ({ skuVal, nameVal, priceVal, catName }) => {
        const api = (window as any).__AUDITOR__;
        if (!api) throw new Error("Auditor API tidak terekspos");
        const state = await api.projector.getState();
        const cat = (state.categories || []).find(
          (c: any) => c.name.toUpperCase() === catName.toUpperCase(),
        );
        if (!cat) throw new Error(`Kategori '${catName}' tidak ditemukan`);
        await api.ledger.appendEvent("PRODUCT_ADDED", {
          sku: skuVal.trim().toUpperCase(),
          name: nameVal.trim().toUpperCase(),
          price: priceVal,
          categoryId: cat.id,
          created_by: "AUDITOR",
        });
      },
      { skuVal: sku, nameVal: name, priceVal: price, catName: categoryName },
    );
  };

  const injectProductEdit = async (
    sku: string,
    newName: string,
    newPrice: number,
    categoryName: string,
  ) => {
    emitLog(`[INJECT] PRODUCT_EDITED '${sku}'...`);
    await page!.evaluate(
      async ({ skuVal, nameVal, priceVal, catName }) => {
        const api = (window as any).__AUDITOR__;
        if (!api) throw new Error("Auditor API tidak terekspos");
        const state = await api.projector.getState();
        const cat = (state.categories || []).find(
          (c: any) => c.name.toUpperCase() === catName.toUpperCase(),
        );
        if (!cat) throw new Error(`Kategori '${catName}' tidak ditemukan`);
        await api.ledger.appendEvent("PRODUCT_EDITED", {
          sku: skuVal.trim().toUpperCase(),
          name: nameVal.trim().toUpperCase(),
          price: priceVal,
          categoryId: cat.id,
          updated_by: "AUDITOR",
        });
      },
      {
        skuVal: sku,
        nameVal: newName,
        priceVal: newPrice,
        catName: categoryName,
      },
    );
  };

  const injectProductArchive = async (sku: string) => {
    emitLog(`[INJECT] PRODUCT_ARCHIVED '${sku}'...`);
    await page!.evaluate(async (skuVal) => {
      const api = (window as any).__AUDITOR__;
      if (!api) throw new Error("Auditor API tidak terekspos");
      await api.ledger.appendEvent("PRODUCT_ARCHIVED", {
        sku: skuVal.trim().toUpperCase(),
        archived_by: "AUDITOR",
      });
    }, sku);
  };

  const injectCategoryDelete = async (name: string, expectBlocked = false) => {
    emitLog(`[INJECT] CATEGORY_DELETED '${name}'...`);
    try {
      await page!.evaluate(async (catName) => {
        const api = (window as any).__AUDITOR__;
        if (!api) throw new Error("Auditor API tidak terekspos");
        const state = await api.projector.getState();
        const cat = (state.categories || []).find(
          (c: any) => c.name.toUpperCase() === catName.toUpperCase(),
        );
        if (!cat) throw new Error(`Kategori '${catName}' tidak ditemukan`);
        await api.ledger.appendEvent("CATEGORY_DELETED", {
          id: cat.id,
          name: cat.name,
          deleted_by: "AUDITOR",
        });
      }, name);
      if (expectBlocked) throw new Error("Seharusnya diblokir");
    } catch (err: any) {
      if (expectBlocked && err.message.includes("masih digunakan")) {
        emitLog(`[INJECT] Delete blocked as expected.`);
        return;
      }
      throw err;
    }
  };

  // ==========================================
  // ASSERTION HELPERS
  // ==========================================

  const assertLocalCategory = async (name: string) => {
    const found = await page!.evaluate(async (catName) => {
      const api = (window as any).__AUDITOR__;
      if (!api) return false;
      const state = await api.projector.getState();
      return (state.categories || []).some(
        (c: any) => c.name.toUpperCase() === catName.toUpperCase(),
      );
    }, name);
    assert(found, `Kategori '${name}' tidak ada di RxDB lokal`);
  };

  const assertLocalProduct = async (sku: string) => {
    const found = await page!.evaluate(async (skuVal) => {
      const api = (window as any).__AUDITOR__;
      if (!api) return false;
      const state = await api.projector.getState();
      return (state.products || []).some(
        (p: any) => p.sku.toUpperCase() === skuVal.toUpperCase(),
      );
    }, sku);
    assert(found, `Produk '${sku}' tidak ada di RxDB lokal`);
  };

  const assertBackendCategory = async (name: string) => {
    await waitForBackend(
      async () => !!(await dbChecker.getCategoryByName(name)),
    );
    const cat = await dbChecker.getCategoryByName(name);
    assert(cat, `Kategori '${name}' tidak ada di backend`);
  };

  const assertBackendProduct = async (sku: string) => {
    await waitForBackend(async () => !!(await dbChecker.getProductBySku(sku)));
    const prod = await dbChecker.getProductBySku(sku);
    assert(prod, `Produk '${sku}' tidak ada di backend`);
  };

  const assertBackendEvent = async (
    eventType: string,
    field: string,
    value: string,
  ) => {
    await waitForBackend(
      async () =>
        !!(await dbChecker.getEventByTypeAndPayloadField(
          eventType,
          field,
          value,
        )),
    );
    const ev = await dbChecker.getEventByTypeAndPayloadField(
      eventType,
      field,
      value,
    );
    assert(ev, `Event '${eventType}' ${field}='${value}' tidak ditemukan`);
  };

  const assertNoOrphans = async () => {
    await waitForBackend(
      async () => (await dbChecker.getOrphanProducts()).length === 0,
    );
    const orphans = await dbChecker.getOrphanProducts();
    assert(
      orphans.length === 0,
      `Ditemukan ${orphans.length} produk yatim piatu`,
    );
  };

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
    await runSetup({ page: page!, emitLog, assert, waitForBackend, dbChecker });

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
    await injectOperatorAuth("112233");
    await injectOpenShift("112233", 150000);

    const latestShift = await dbChecker.getLatestShift();
    emitState(
      { status: "Shift Active" },
      { backendStatus: "Shift Opened", data: latestShift },
    );

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
    });

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
