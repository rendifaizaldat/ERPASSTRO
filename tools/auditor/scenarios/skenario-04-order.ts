import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 4] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  emitLog("[SKENARIO 4] Menjalankan Virtual Aksi: ORDER_PLACED...");

  const prod = (pre.local.products || []).find((p: any) => p.sku === "AT-TEST" || p.sku.startsWith("AT-"));
  if (!prod) throw new Error("Produk untuk test order tidak ditemukan");

  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

  await injectAction("ORDER_PLACED", {
    orderId,
    tableLabel: "MEJA-01",
    items: [
      { sku: prod.sku, name: prod.name, price: prod.price, qty: 2 },
    ],
    placedAt: new Date().toISOString(),
  });

  emitLog("[SKENARIO 4] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const journal = (await dbChecker.getServerState()).journal;
    return journal.some((e: any) => e.eventType === "ORDER_PLACED" && e.payload?.orderId === orderId);
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 4: Order Workflow", post.local, post.server);

  const orderEvent = post.server.journal.find((e: any) => e.eventType === "ORDER_PLACED" && e.payload?.orderId === orderId);
  assert(orderEvent !== undefined, "Event ORDER_PLACED harus ada di backend journal");
}