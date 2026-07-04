import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 10] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  emitLog("[SKENARIO 10] Menjalankan Virtual Aksi: SETTINGS_UPDATED...");

  await injectAction("SETTINGS_UPDATED", {
    taxRate: 11,
    serviceRate: 5,
    updatedAt: new Date().toISOString(),
  });

  emitLog("[SKENARIO 10] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const journal = (await dbChecker.getServerState()).journal;
    return journal.some((e: any) => e.eventType === "SETTINGS_UPDATED" && e.payload?.taxRate === 11);
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 10: Pengaturan", post.local, post.server);

  const settingsEvent = post.server.journal.find((e: any) => e.eventType === "SETTINGS_UPDATED" && e.payload?.taxRate === 11);
  assert(settingsEvent !== undefined, "Event SETTINGS_UPDATED harus ada di backend journal");
}
