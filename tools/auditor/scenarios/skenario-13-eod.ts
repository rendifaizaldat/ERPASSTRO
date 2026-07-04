import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 13] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  const businessDate = new Date().toISOString().slice(0, 10);

  emitLog("[SKENARIO 13] Menjalankan Virtual Aksi: EOD_COMPLETED...");

  await injectAction("EOD_COMPLETED", {
    businessDate,
    completedAt: new Date().toISOString(),
    completedBy: "AUDITOR",
    summary: { totalSales: 50000, totalTransactions: 2 }
  });

  emitLog("[SKENARIO 13] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const journal = (await dbChecker.getServerState()).journal;
    return journal.some((e: any) => e.eventType === "EOD_COMPLETED" && e.payload?.businessDate === businessDate);
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 13: EOD", post.local, post.server);

  const eodEvent = post.server.journal.find((e: any) => e.eventType === "EOD_COMPLETED" && e.payload?.businessDate === businessDate);
  assert(eodEvent !== undefined, "Event EOD_COMPLETED harus ada di backend journal");
}
