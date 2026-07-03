import { Page } from "playwright";

interface ScenarioContext {
  page: Page;
  emitLog: (msg: string) => void;
  assert: (condition: boolean, message: string) => void;
  waitForBackend: (
    fn: () => Promise<boolean>,
    timeoutMs?: number,
  ) => Promise<void>;
  dbChecker: any;
}

export async function run(ctx: ScenarioContext) {
  const { page, emitLog } = ctx;
  emitLog("[SKENARIO 4] Order workflow via injection...");

  const injectOrder = async (tableLabel: string, sku: string, qty: number) => {
    emitLog(
      `[INJECT] ORDER_PLACED table ${tableLabel} sku ${sku} qty ${qty}...`,
    );
    await page.evaluate(
      async ({ table, skuVal, qtyVal }) => {
        const api = (window as any).__AUDITOR__;
        if (!api) throw new Error("Auditor API tidak terekspos");
        const state = await api.projector.getState();
        const prod = (state.products || []).find(
          (p: any) => p.sku.toUpperCase() === skuVal.toUpperCase(),
        );
        if (!prod) throw new Error(`Produk ${skuVal} tidak ditemukan`);
        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
        await api.ledger.appendEvent("ORDER_PLACED", {
          orderId,
          tableLabel: table,
          items: [
            { sku: prod.sku, name: prod.name, price: prod.price, qty: qtyVal },
          ],
          placedAt: new Date().toISOString(),
        });
      },
      { table: tableLabel, skuVal: sku, qtyVal: qty },
    );
  };

  await injectOrder("MEJA-01", "AT-TEST", 2);
  emitLog("[SKENARIO 4] Order workflow selesai.");
}
