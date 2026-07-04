import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 11] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  const shiftId = `SHIFT-HANDOVER-${Date.now().toString(36).toUpperCase()}`;

  emitLog("[SKENARIO 11] Menjalankan Virtual Aksi: SHIFT_HANDOVER...");

  await injectAction("SHIFT_HANDOVER", {
    shiftId,
    fromCashierId: "CASHIER-1",
    toCashierId: "CASHIER-2",
    handoverCash: 150000,
    handoverAt: new Date().toISOString(),
  });

  emitLog("[SKENARIO 11] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const journal = (await dbChecker.getServerState()).journal;
    return journal.some((e: any) => e.eventType === "SHIFT_HANDOVER" && e.payload?.shiftId === shiftId);
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 11: Handover Shift", post.local, post.server);

  const handoverEvent = post.server.journal.find((e: any) => e.eventType === "SHIFT_HANDOVER" && e.payload?.shiftId === shiftId);
  assert(handoverEvent !== undefined, "Event SHIFT_HANDOVER harus ada di backend journal");
}
