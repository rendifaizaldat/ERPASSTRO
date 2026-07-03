import { Page } from "playwright";

interface ScenarioContext {
  page: Page;
  emitLog: (msg: string) => void;
  assert: (condition: boolean, message: string) => void;
  waitForBackend: (
    fn: () => Promise<boolean>,
    timeoutMs?: number,
  ) => Promise<void>;
  dbChecker: any;
}

export async function run(ctx: ScenarioContext) {
  const { page, emitLog, assert, waitForBackend, dbChecker } = ctx;

  emitLog("[SKENARIO 3] Katalog via injection...");

  const catName = `AUTOTEST-${Date.now()}`;
  const sku = `AT-${Date.now()}`;
  const prodName = "NASI GORENG AUDIT";
  const prodEditName = "NASI GORENG EDIT";
  const price = 25000;
  const editPrice = 27000;

  const injectCategory = async (name: string) => {
    emitLog(`[INJECT] CATEGORY_ADDED '${name}'...`);
    await page.evaluate(async (catName) => {
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
    await page.evaluate(
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
    await page.evaluate(
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
    await page.evaluate(async (skuVal) => {
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
      await page.evaluate(async (catName) => {
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

  const assertLocalCategory = async (name: string) => {
    let found = false;
    const start = Date.now();

    // Polling maksimal 5 detik
    while (Date.now() - start < 5000) {
      found = await page.evaluate(async (catName) => {
        const api = (window as any).__AUDITOR__;
        if (!api) return false;
        // Memastikan menggunakan getState() sesuai perbaikan sebelumnya
        const state = await api.projector.getState();
        return (state.categories || []).some(
          (c: any) => c.name.toUpperCase() === catName.toUpperCase(),
        );
      }, name);

      if (found) break;
      await new Promise((r) => setTimeout(r, 200)); // Jeda 200ms sebelum cek lagi
    }

    assert(
      found,
      `Kategori '${name}' tidak ada di RxDB lokal setelah menunggu 5 detik`,
    );
  };

  const assertLocalProduct = async (sku: string) => {
    let found = false;
    const start = Date.now();

    // Polling maksimal 5 detik
    while (Date.now() - start < 5000) {
      found = await page.evaluate(async (skuVal) => {
        const api = (window as any).__AUDITOR__;
        if (!api) return false;
        const state = await api.projector.getState();
        return (state.products || []).some(
          (p: any) => p.sku.toUpperCase() === skuVal.toUpperCase(),
        );
      }, sku);

      if (found) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    assert(
      found,
      `Produk '${sku}' tidak ada di RxDB lokal setelah menunggu 5 detik`,
    );
  };

  const assertBackendCategory = async (name: string) => {
    await waitForBackend(
      async () => !!(await dbChecker.getCategoryByName(name)),
    );
    const cat = await dbChecker.getCategoryByName(name);
    assert(!!cat, `Kategori '${name}' tidak ada di backend`);
  };

  const assertBackendProduct = async (sku: string) => {
    await waitForBackend(async () => !!(await dbChecker.getProductBySku(sku)));
    const prod = await dbChecker.getProductBySku(sku);
    assert(!!prod, `Produk '${sku}' tidak ada di backend`);
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
    assert(!!ev, `Event '${eventType}' ${field}='${value}' tidak ditemukan`);
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

  // --- ALUR EKSEKUSI ---

  await injectCategory(catName);
  await assertLocalCategory(catName);
  await assertBackendCategory(catName);
  await assertBackendEvent("CATEGORY_ADDED", "name", catName);

  await injectProduct(sku, prodName, price, catName);
  await assertLocalProduct(sku);
  await assertBackendProduct(sku);
  await assertBackendEvent("PRODUCT_ADDED", "sku", sku);

  await injectProductEdit(sku, prodEditName, editPrice, catName);
  await assertBackendEvent("PRODUCT_EDITED", "sku", sku);

  await injectProductArchive(sku);
  await assertBackendEvent("PRODUCT_ARCHIVED", "sku", sku);

  await injectProduct(sku, prodEditName, editPrice, catName);
  await assertBackendEvent("PRODUCT_ADDED", "sku", sku);

  await injectCategoryDelete(catName, true);
  await assertBackendCategory(catName);

  await injectProductArchive(sku);
  await injectCategoryDelete(catName);
  await assertBackendEvent("CATEGORY_DELETED", "name", catName);

  await assertNoOrphans();

  emitLog("[SKENARIO 3] Katalog selesai. Semua assertion HIJAU.");
}
