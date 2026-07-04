import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 12] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  emitLog("[SKENARIO 12] Menjalankan Virtual Aksi: LOCAL_DATA_PURGED...");

  await injectAction("LOCAL_DATA_PURGED", {
    purgedAt: new Date().toISOString(),
    reason: "Setup Wizard Recovery"
  });

  emitLog("[SKENARIO 12] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const journal = (await dbChecker.getServerState()).journal;
    return journal.some((e: any) => e.eventType === "LOCAL_DATA_PURGED");
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 12: Recovery", post.local, post.server);

  const recoveryEvent = post.server.journal.find((e: any) => e.eventType === "LOCAL_DATA_PURGED");
  assert(recoveryEvent !== undefined, "Event LOCAL_DATA_PURGED harus ada di backend journal");
}
