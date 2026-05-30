// packages/projection/src/test-projection-full.ts
import "fake-indexeddb/auto";
import { LedgerEngine } from "../../ledger/src/engine";
import { ProjectionEngine } from "./engine";

async function runFullTest() {
  const ledger = new LedgerEngine();
  const projector = new ProjectionEngine();

  try {
    console.log("=== PHASE 3: FULL PROJECTION TEST ===");
    await ledger.init();

    // 1. APPEND DATA (Simulasi Transaksi & Stok)
    const TOTAL_APPEND = 10000;
    console.log(`\n[1/3] Appending ${TOTAL_APPEND} events...`);

    const startAppend = performance.now();
    for (let i = 0; i < TOTAL_APPEND; i++) {
      // Selang-seling antara Penjualan dan Penyesuaian Stok
      if (i % 2 === 0) {
        await ledger.appendEvent("SALE_CREATED", {
          invoice_id: `INV-${i}`,
          grand_total: 100000,
          items: [{ sku: "PROD-01", qty: 1 }],
        });
      } else {
        await ledger.appendEvent("STOCK_ADJUSTED", {
          sku: "PROD-01",
          delta: 10,
        });
      }
    }
    const endAppend = performance.now();
    console.log(
      `Append SELESAI dalam ${((endAppend - startAppend) / 1000).toFixed(2)}s`,
    );

    // 2. RUN PROJECTION (Membangun State dari Ledger)
    console.log("\n[2/3] Running Projection from Ledger Stream...");

    // Ambil data dari ledger
    const events: any[] = [];
    await ledger.replay((event) => {
      events.push(event);
    });

    const startProj = performance.now();
    await projector.runProjection(events);
    const endProj = performance.now();

    const finalState = projector.getState();
    console.log(
      `Projection SELESAI dalam ${(endProj - startProj).toFixed(2)}ms`,
    );

    // Tampilkan Ringkasan State
    console.log("\n--- FINAL STATE SUMMARY ---");
    console.log(
      `Total Sales Revenue : Rp${finalState.sales.total_revenue.toLocaleString()}`,
    );
    console.log(
      `Total Transactions   : ${finalState.sales.total_transactions}`,
    );
    console.log(
      `Current Stock PROD-01: ${finalState.inventory["PROD-01"]?.stock} units`,
    );

    // 3. IDEMPOTENCY CHECK
    console.log("\n[3/3] Verifying Idempotency (Re-running projection)...");
    const stateBefore = JSON.stringify(finalState);

    await projector.runProjection(events); // Reset & Re-run
    const stateAfter = JSON.stringify(projector.getState());

    if (stateBefore === stateAfter) {
      console.log("✅ IDEMPOTENCY CHECK: PASSED (Hasil identik)");
    } else {
      throw new Error("❌ IDEMPOTENCY CHECK: FAILED (Hasil berbeda)");
    }

    await ledger.close();
    console.log("\n=== ALL PHASE 3 TESTS PASSED ===");
  } catch (err) {
    console.error("\nTEST FAILED");
    console.error(err);
  }
}

runFullTest();
