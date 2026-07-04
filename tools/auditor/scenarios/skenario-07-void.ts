import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 7] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  const orderId = `ORD-VOID-${Date.now().toString(36).toUpperCase()}`;

  emitLog("[SKENARIO 7] Menjalankan Virtual Aksi: ITEM_VOIDED...");

  await injectAction("ITEM_VOIDED", {
    orderId,
    sku: "AT-TEST",
    qty: 1,
    reason: "Test Void",
    voidedAt: new Date().toISOString(),
    voidedBy: "AUDITOR"
  });

  emitLog("[SKENARIO 7] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const journal = (await dbChecker.getServerState()).journal;
    return journal.some((e: any) => e.eventType === "ITEM_VOIDED" && e.payload?.orderId === orderId);
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 7: Void Item", post.local, post.server);

  const voidEvent = post.server.journal.find((e: any) => e.eventType === "ITEM_VOIDED" && e.payload?.orderId === orderId);
  assert(voidEvent !== undefined, "Event ITEM_VOIDED harus ada di backend journal");
}
