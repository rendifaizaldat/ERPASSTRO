import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 9] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  const invoiceId = `INV-REFUND-${Date.now().toString(36).toUpperCase()}`;

  emitLog("[SKENARIO 9] Menjalankan Virtual Aksi: REFUND_ISSUED...");

  await injectAction("REFUND_ISSUED", {
    invoiceId,
    amount: 25000,
    reason: "Test Refund",
    refundedAt: new Date().toISOString(),
    refundedBy: "AUDITOR"
  });

  emitLog("[SKENARIO 9] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const journal = (await dbChecker.getServerState()).journal;
    return journal.some((e: any) => e.eventType === "REFUND_ISSUED" && e.payload?.invoiceId === invoiceId);
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 9: Refund", post.local, post.server);

  const refundEvent = post.server.journal.find((e: any) => e.eventType === "REFUND_ISSUED" && e.payload?.invoiceId === invoiceId);
  assert(refundEvent !== undefined, "Event REFUND_ISSUED harus ada di backend journal");
}
