import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  const catName = `AUTOTEST-${Date.now()}`;
  const sku = `AT-${Date.now()}`;
  const prodName = "NASI GORENG AUDIT";
  const prodEditName = "NASI GORENG EDIT";
  const price = 25000;
  const editPrice = 27000;

  emitLog("[SKENARIO 3] Mengambil snapshot awal (Katalog)...");
  const pre = await getLocalAndServerState();

  emitLog("[SKENARIO 3] Aksi: CATEGORY_ADDED...");
  const catId = "CAT-" + Date.now().toString(36).toUpperCase();
  await injectAction("CATEGORY_ADDED", {
    id: catId,
    name: catName,
    created_by: "AUDITOR",
  });

  await waitForBackend(async () => {
    const s = await dbChecker.getServerState();
    return s.journal.some((e: any) => e.eventType === "CATEGORY_ADDED" && e.payload?.name === catName);
  });

  let postCat = await getLocalAndServerState();
  emitState("POST", "Tambah Kategori", postCat.local, postCat.server);

  const backendCatEvent = postCat.server.journal.find((e: any) => e.eventType === "CATEGORY_ADDED" && e.payload?.name === catName);
  assert(backendCatEvent !== undefined, "Event CATEGORY_ADDED harus ada di backend");

  emitLog("[SKENARIO 3] Aksi: PRODUCT_ADDED...");
  await injectAction("PRODUCT_ADDED", {
    sku: sku,
    name: prodName,
    price: price,
    categoryId: catId,
    created_by: "AUDITOR",
  });

  await waitForBackend(async () => {
    const s = await dbChecker.getServerState();
    return s.journal.some((e: any) => e.eventType === "PRODUCT_ADDED" && e.payload?.sku === sku);
  });

  let postProd = await getLocalAndServerState();
  emitState("POST", "Tambah Produk", postProd.local, postProd.server);
  assert(postProd.server.journal.some((e: any) => e.eventType === "PRODUCT_ADDED" && e.payload?.sku === sku), "Event PRODUCT_ADDED harus ada di backend");

  emitLog("[SKENARIO 3] Aksi: PRODUCT_EDITED...");
  await injectAction("PRODUCT_EDITED", {
    sku: sku,
    name: prodEditName,
    price: editPrice,
    categoryId: catId,
    updated_by: "AUDITOR",
  });

  await waitForBackend(async () => {
    const s = await dbChecker.getServerState();
    return s.journal.some((e: any) => e.eventType === "PRODUCT_EDITED" && e.payload?.sku === sku);
  });

  emitLog("[SKENARIO 3] Aksi: PRODUCT_ARCHIVED...");
  await injectAction("PRODUCT_ARCHIVED", {
    sku: sku,
    archived_by: "AUDITOR",
  });

  await waitForBackend(async () => {
    const s = await dbChecker.getServerState();
    return s.journal.some((e: any) => e.eventType === "PRODUCT_ARCHIVED" && e.payload?.sku === sku);
  });

  let postArchive = await getLocalAndServerState();
  emitState("POST", "Arsip Produk", postArchive.local, postArchive.server);

  emitLog("[SKENARIO 3] Aksi: CATEGORY_DELETED...");
  await injectAction("CATEGORY_DELETED", {
    id: catId,
    name: catName,
    deleted_by: "AUDITOR",
  });

  await waitForBackend(async () => {
    const s = await dbChecker.getServerState();
    return s.journal.some((e: any) => e.eventType === "CATEGORY_DELETED" && e.payload?.id === catId);
  });

  let postFinal = await getLocalAndServerState();
  emitState("POST", "Hapus Kategori (Setelah Arsip)", postFinal.local, postFinal.server);
  assert(postFinal.server.journal.some((e: any) => e.eventType === "CATEGORY_DELETED" && e.payload?.id === catId), "Event CATEGORY_DELETED harus ada di backend");

  emitLog("[SKENARIO 3] Katalog selesai.");
}
