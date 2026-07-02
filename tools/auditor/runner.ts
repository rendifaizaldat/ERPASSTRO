import { chromium, Page } from "playwright";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { dbChecker } from "./db-checker";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, "public")));

const APP_URL = "http://localhost:3000";

async function runAudit() {
  let browser = null;
  let page: Page | null = null;
  let context = null;

  const emitLog = (msg: string) => {
    console.log(msg);
    io.emit("log", msg);
  };

  const emitState = (local: any, server: any) => {
    io.emit("stateUpdate", { local, server });
  };

  try {
    emitLog("Mulai inisialisasi Playwright...");
    browser = await chromium.launch({ headless: false, slowMo: 100 }); // slowMo agar pergerakan terlihat

    // [PENTING] Memberikan izin GPS dan Mock Koordinat (Misal: Lembang)
    context = await browser.newContext({
      geolocation: { latitude: -6.8153, longitude: 107.6186 },
      permissions: ["geolocation"],
    });

    page = await context.newPage();

    emitLog(`Membuka aplikasi POS: ${APP_URL}`);
    await page.goto(APP_URL);
    await page.waitForLoadState("networkidle");

    // ==========================================
    // SKENARIO 1: SETUP WIZARD
    // ==========================================
    emitLog("[SKENARIO 1] Memulai Otorisasi Setup Wizard...");

    // Step 1: Login Admin
    await page
      .getByPlaceholder("email@asstro.com")
      .fill("rendifaizal@asstro.com");
    await page.getByPlaceholder("••••••••").fill("admin112233");
    await page.getByRole("button", { name: "Verifikasi Identitas" }).click();

    // Step 2: Pilih Region & Branch (Dari data seed)
    emitLog("[SKENARIO 1] Memilih Wilayah dan Cabang...");
    // Menunggu dropdown muncul
    await page.waitForSelector("select");

    // Pilih Region (Bandung)
    await page.locator("select").nth(0).selectOption({ label: "Bandung" });
    // Pilih Branch (Asstro Lembang)
    await page
      .locator("select")
      .nth(1)
      .selectOption({ label: "[LBG] Asstro Lembang" });
    await page.getByRole("button", { name: "Lanjut" }).click();

    // Step 3: Registrasi Mesin
    emitLog("[SKENARIO 1] Registrasi Mesin POS (Takeover)...");
    await page
      .getByPlaceholder("Contoh: TABLET-KASIR-01")
      .fill("AUTO-TEST-DEVICE-01");
    await page
      .getByRole("button", { name: "Kunci Koordinat Mesin (Wajib)" })
      .click();

    // Tunggu sampai koodinat terkunci (tombol Aktifkan Mesin bisa diklik)
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Aktifkan Mesin" }).click();

    // Step 4: Menunggu Proses Sinkronisasi (Hydrate & Pull)
    emitLog("[CHECKPOINT] Menunggu Recovery & Sinkronisasi selesai...");
    // Menunggu tombol "Buka Mesin Kasir" muncul sebagai tanda sukses
    const openPosBtn = page.getByRole("button", { name: "Buka Mesin Kasir" });
    await openPosBtn.waitFor({ state: "visible", timeout: 60000 }); // Tunggu max 60 detik

    // Klik tombol Buka Mesin Kasir (Akan me-reload halaman ke mode operasional)
    emitLog("[SKENARIO 1] Setup Selesai. Membuka Mesin Kasir...");
    await openPosBtn.click();
    await page.waitForLoadState("networkidle");

    // ==========================================
    // SKENARIO 2: LOGIN KASIR & BUKA SHIFT
    // ==========================================
    emitLog("[SKENARIO 2] Menguji Login PIN...");

    await page
      .getByRole("button", { name: "1", exact: true })
      .first()
      .waitFor({ state: "visible", timeout: 30000 });

    const pin = ["1", "1", "2", "2", "3", "3"];
    for (const num of pin) {
      await page
        .getByRole("button", { name: num, exact: true })
        .first()
        .click();
      await page.waitForTimeout(100);
    }

    emitLog("[SKENARIO 2] Mengisi Modal Buka Shift...");
    await page.getByText("Uang Modal Awal Shift").waitFor({ state: "visible" });

    // Klik input untuk memunculkan numpad virtual
    await page.getByPlaceholder("Contoh: 500000").click();
    await page.getByPlaceholder("Contoh: 500000").fill("150000");

    // [PERBAIKAN]: Simulasikan menekan tombol Enter
    // Cara 1: Simulasi menekan tombol 'Enter' fisik pada keyboard
    await page.keyboard.press("Enter");

    // Cara 2 (Opsional): Jika Numpad virtual Anda memiliki tombol khusus untuk 'Enter' / 'OK' / 'Ceklis',
    // Anda bisa mengganti line di atas dengan:
    // await page.getByRole('button', { name: 'Enter' }).click(); // Sesuaikan 'Enter' dengan teks/label tombolnya

    // Tunggu sebentar agar animasi numpad turun/hilang
    await page.waitForTimeout(500);

    // Klik Buka Shift Sekarang (Numpad sudah tidak menghalangi)
    await page.getByRole("button", { name: "Buka Shift Sekarang" }).click();

    // Tunggu animasi login selesai dan masuk ke dashboard
    await page.waitForTimeout(2000);

    emitLog("[CHECKPOINT] Login & Buka Shift Berhasil!");

    const latestShift = await dbChecker.getLatestTransaction();
    emitState(
      { status: "Local RxDB Ready" },
      { backendStatus: "Shift Opened", data: latestShift },
    );

    // ==========================================
    // [FAIL-FAST] Uji coba pelemparan error
    // ==========================================
    throw new Error("Simulasi Reset (Berhasil Setup & Login)");

    // emitLog('Semua Skenario Hijau. Audit Selesai.');
    // io.emit('auditComplete');
  } catch (error: any) {
    emitLog(`[ERROR] Audit terhenti: ${error.message}`);
    emitLog(`[RECOVERY] Menginisiasi Auto-Reset Database & RxDB...`);

    emitLog("[RECOVERY-DB] Menjalankan perintah pnpm fr...");
    try {
      const backendRoot = path.resolve(__dirname, "../../apps/backend");
      const isWin = process.platform === "win32";

      let pnpmCmd = isWin ? "pnpm.cmd" : "pnpm";
      const localPnpm = path.join(
        path.resolve(__dirname, "../../node_modules/.bin"),
        isWin ? "pnpm.cmd" : "pnpm",
      );
      if (fs.existsSync(localPnpm)) {
        pnpmCmd = `"${localPnpm}"`;
      }

      const command = `${pnpmCmd} run fr`;
      emitLog(`[RECOVERY-DB] Eksekusi: ${command} di ${backendRoot}`);

      execSync(command, {
        cwd: backendRoot,
        stdio: "inherit",
        shell: isWin ? "cmd.exe" : "/bin/sh",
      });

      emitLog(
        "[RECOVERY-DB] Database Server & NATS berhasil di-reset sepenuhnya.",
      );
    } catch (cmdError: any) {
      emitLog(
        `[RECOVERY-DB-GAGAL] Gagal eksekusi perintah reset: ${cmdError.message}`,
      );
    }

    emitLog("[RECOVERY-LOKAL] Membersihkan RxDB dan Storage Klien...");
    if (page && context) {
      await context.clearCookies();

      await page.evaluate(async () => {
        if (window.indexedDB && window.indexedDB.databases) {
          const dbs = await window.indexedDB.databases();
          dbs.forEach((db) => {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          });
        } else {
          window.indexedDB.deleteDatabase("asstro_pos_db");
        }
        localStorage.clear();
        sessionStorage.clear();
      });
      emitLog("[RECOVERY-LOKAL] RxDB dan State Klien berhasil dihancurkan.");
    }

    emitLog("[RECOVERY-SELESAI] Silakan perbaiki bug dan jalankan ulang.");
  } finally {
    if (browser) await browser.close();
    await dbChecker.close();
  }
}

httpServer.listen(3030, () => {
  console.log("🚀 UI Auditor berjalan di http://localhost:3030");

  io.on("connection", (socket) => {
    console.log("Client UI Terhubung. Memulai skenario E2E...");
    runAudit();
  });
});
