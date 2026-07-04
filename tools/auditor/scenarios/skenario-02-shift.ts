import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 2] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  emitLog("[SKENARIO 2] Menjalankan Virtual Aksi: OPERATOR_AUTHENTICATED...");
  const staff = (pre.local.staffList || []).find((s: any) => s.pin === "112233");
  if (!staff) throw new Error("Staff dengan PIN '112233' tidak ditemukan");

  await injectAction("OPERATOR_AUTHENTICATED", {
    operatorId: staff.id,
    pin: "112233",
    authenticatedAt: new Date().toISOString()
  });

  emitLog("[SKENARIO 2] Menjalankan Virtual Aksi: SHIFT_OPENED...");
  const shiftId = `SHIFT-${Date.now().toString(36).toUpperCase()}`;
  await ctx.page.evaluate((sId) => { localStorage.setItem("ASSTRO_CURRENT_SHIFT_ID", sId); }, shiftId);

  await injectAction("SHIFT_OPENED", {
    operatorId: staff.id,
    initial_cash: 150000,
    shiftId,
    cashierId: staff.id,
    openedAt: new Date().toISOString(),
    startingCash: 150000
  });

  emitLog("[SKENARIO 2] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const shift = await dbChecker.getLatestShift();
    return shift !== null && Number(shift.starting_cash || shift.startingCash) === 150000;
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 2: Login & Buka Shift", post.local, post.server);

  assert(post.server.shifts.length > pre.server.shifts.length || post.server.shifts.length > 0, "Shift harus terbuat di backend");
}