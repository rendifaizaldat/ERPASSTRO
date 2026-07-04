import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 8] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  const orderId = `ORD-TABLE-${Date.now().toString(36).toUpperCase()}`;

  emitLog("[SKENARIO 8] Menjalankan Virtual Aksi: TABLE_MOVED...");

  await injectAction("TABLE_MOVED", {
    orderId,
    fromTable: "MEJA-01",
    toTable: "MEJA-02",
    movedAt: new Date().toISOString(),
  });

  emitLog("[SKENARIO 8] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const journal = (await dbChecker.getServerState()).journal;
    return journal.some((e: any) => e.eventType === "TABLE_MOVED" && e.payload?.orderId === orderId);
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 8: Pindah Meja", post.local, post.server);

  const tableEvent = post.server.journal.find((e: any) => e.eventType === "TABLE_MOVED" && e.payload?.orderId === orderId);
  assert(tableEvent !== undefined, "Event TABLE_MOVED harus ada di backend journal");
}
