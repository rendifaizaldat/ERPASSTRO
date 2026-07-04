import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 5] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  const prod = (pre.local.products || []).find((p: any) => p.sku === "AT-TEST" || p.sku.startsWith("AT-"));
  if (!prod) throw new Error("Produk untuk test order tidak ditemukan");

  const invoiceId = `INV-${Date.now().toString(36).toUpperCase()}`;
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

  emitLog("[SKENARIO 5] Menjalankan Virtual Aksi: PAYMENT_RECEIVED...");

  await injectAction("PAYMENT_RECEIVED", {
    invoiceId,
    orderId,
    method: "CASH",
    amount: prod.price * 2,
    receivedAt: new Date().toISOString(),
  });

  emitLog("[SKENARIO 5] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const journal = (await dbChecker.getServerState()).journal;
    return journal.some((e: any) => e.eventType === "PAYMENT_RECEIVED" && e.payload?.invoiceId === invoiceId);
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 5: Payment", post.local, post.server);

  const paymentEvent = post.server.journal.find((e: any) => e.eventType === "PAYMENT_RECEIVED" && e.payload?.invoiceId === invoiceId);
  assert(paymentEvent !== undefined, "Event PAYMENT_RECEIVED harus ada di backend journal");
}
