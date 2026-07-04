import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 6] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  const reservationId = `RES-${Date.now().toString(36).toUpperCase()}`;

  emitLog("[SKENARIO 6] Menjalankan Virtual Aksi: RESERVATION_CREATED...");

  await injectAction("RESERVATION_CREATED", {
    reservationId,
    customerName: "Auditor Guest",
    tableLabel: "VIP-1",
    date: new Date().toISOString(),
    status: "CONFIRMED",
    deposit: 50000,
  });

  emitLog("[SKENARIO 6] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const journal = (await dbChecker.getServerState()).journal;
    return journal.some((e: any) => e.eventType === "RESERVATION_CREATED" && e.payload?.reservationId === reservationId);
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 6: Reservasi", post.local, post.server);

  const resEvent = post.server.journal.find((e: any) => e.eventType === "RESERVATION_CREATED" && e.payload?.reservationId === reservationId);
  assert(resEvent !== undefined, "Event RESERVATION_CREATED harus ada di backend journal");
}
