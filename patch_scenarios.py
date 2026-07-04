import os

scenarios_dir = 'tools/auditor/scenarios'

for filename in os.listdir(scenarios_dir):
    if filename.endswith('.ts'):
        filepath = os.path.join(scenarios_dir, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # Replace local interfaces with imported one
        content = content.replace("interface ScenarioContext {", "import { ScenarioContext } from '../runner';\n\n// interface ScenarioContext {")

        # Skenario 2 refactor
        if filename == 'skenario-02-shift.ts':
            content = """import { ScenarioContext } from '../runner';

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
}"""

        # Skenario 4 refactor
        if filename == 'skenario-04-order.ts':
            content = """import { ScenarioContext } from '../runner';

export async function run(ctx: ScenarioContext) {
  const { assert, emitLog, waitForBackend, getLocalAndServerState, injectAction, emitState, dbChecker } = ctx;

  emitLog("[SKENARIO 4] Mengambil snapshot awal...");
  const pre = await getLocalAndServerState();

  emitLog("[SKENARIO 4] Menjalankan Virtual Aksi: ORDER_PLACED...");

  const prod = (pre.local.products || []).find((p: any) => p.sku === "AT-TEST" || p.sku.startsWith("AT-"));
  if (!prod) throw new Error("Produk untuk test order tidak ditemukan");

  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

  await injectAction("ORDER_PLACED", {
    orderId,
    tableLabel: "MEJA-01",
    items: [
      { sku: prod.sku, name: prod.name, price: prod.price, qty: 2 },
    ],
    placedAt: new Date().toISOString(),
  });

  emitLog("[SKENARIO 4] Menunggu sinkronisasi backend...");
  await waitForBackend(async () => {
    const journal = (await dbChecker.getServerState()).journal;
    return journal.some((e: any) => e.eventType === "ORDER_PLACED" && e.payload?.orderId === orderId);
  });

  const post = await getLocalAndServerState();
  emitState("POST", "Skenario 4: Order Workflow", post.local, post.server);

  const orderEvent = post.server.journal.find((e: any) => e.eventType === "ORDER_PLACED" && e.payload?.orderId === orderId);
  assert(orderEvent !== undefined, "Event ORDER_PLACED harus ada di backend journal");
}"""

        with open(filepath, 'w') as f:
            f.write(content)
