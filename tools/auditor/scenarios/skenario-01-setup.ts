import { Page, Route } from "playwright";

import { ScenarioContext } from '../runner';

// import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { page, emitLog, assert } = ctx;
  emitLog("[SKENARIO 1] Memulai E2E Test: Setup Wizard Provisioning...");
  emitLog("  -> Menyetel izin Geolocation ke titik operasional...");
  await page.context().grantPermissions(["geolocation"]);
  await page
    .context()
    .setGeolocation({ latitude: -6.8152, longitude: 107.6186 });
  emitLog("  -> Mengaktifkan Network Interceptor untuk API Provisioning...");
  await page.route("**/api/provision/login", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        regions: [
          {
            id: "REG-JABAR",
            name: "Jawa Barat",
            branches: [
              { id: "BR-LEMBANG", name: "Asstro Lembang", code: "AL" },
            ],
          },
        ],
      }),
    });
  });
  await page.route(
    "**/api/provision/branch-devices/*",
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ devices: [] }),
      });
    },
  );
  await page.route("**/api/provision/device", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        deviceToken: "TKN-ASSTRO-998877",
        branchId: "BR-LEMBANG",
        deviceId: "DEV-KASIR-01",
      }),
    });
  });
  await page.route("**/api/sync/hydrate*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: 1,
        data: {
          staff: [
            {
              id: "STF-01",
              name: "Operator Node",
              pin: "112233",
              isActive: true,
            },
          ],
          financialConfig: { taxRate: 11, serviceRate: 5 },
          categories: [{ id: "CAT-1", name: "Makanan Utama" }],
          products: [
            {
              sku: "PRD-01",
              name: "Nasi Liwet",
              price: 35000,
              categoryId: "CAT-1",
            },
          ],
        },
      }),
    });
  });
  await page.route("**/api/sync/pull*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]), // Jurnal historis kosong untuk fresh install
    });
  });
  emitLog("[STEP 1] Eksekusi Form Otorisasi...");
  await page.fill(
    'input[placeholder="email@asstro.com"]',
    "admin.it@asstro.com",
  );
  await page.fill('input[placeholder="••••••••"]', "supersecret123");
  await page.click('button:has-text("Verifikasi Identitas")');
  emitLog("[STEP 2] Memilih Regional & Cabang...");
  await page.waitForSelector('select:has(option:has-text("Jawa Barat"))');
  const dropdowns = await page.$$("select");
  await dropdowns[0].selectOption({ label: "Jawa Barat" });
  await page.waitForSelector(
    'select:has(option:has-text("[AL] Asstro Lembang"))',
  );
  await dropdowns[1].selectOption({ label: "[AL] Asstro Lembang" });
  await page.click('button:has-text("Lanjut")');
  emitLog("[STEP 3] Mendaftarkan Mesin & Koordinat GPS...");
  await page.waitForSelector('input[placeholder="Contoh: TABLET-KASIR-01"]');
  await page.fill(
    'input[placeholder="Contoh: TABLET-KASIR-01"]',
    "NODE-LEMBANG-01",
  );

  await page.click('button:has-text("Kunci Koordinat Mesin (Wajib)")');
  await page.waitForFunction(() => {
    const latElement = document.body.textContent;
    return latElement && latElement.includes("-6.8152");
  });

  await page.click('button:has-text("Aktifkan Mesin")');
  emitLog("[STEP 4] Menunggu Orchestrator menyelesaikan sinkronisasi...");
  const openPosBtn = await page.waitForSelector(
    'button:has-text("Buka Mesin Kasir")',
    {
      state: "visible",
      timeout: 15000,
    },
  );

  assert(
    openPosBtn !== null,
    "Tombol 'Buka Mesin Kasir' harus muncul setelah terminal sukses.",
  );

  emitLog("[SKENARIO 1] Setup Wizard berhasil dilewati. Siap untuk reload!");
}
