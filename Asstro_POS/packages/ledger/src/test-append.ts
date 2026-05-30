// IndexedDB polyfill untuk Node.js
import "fake-indexeddb/auto";
import { LedgerEngine } from "./engine";

async function runTest() {
  const engine = new LedgerEngine();

  try {
    console.log("\n=== INIT LEDGER ENGINE ===");
    await engine.init();

    // =========================================================
    // CHECK EXISTING DATA
    // =========================================================

    const lastEvent = await engine.getLastEvent();

    console.log(
      "Last Event:",
      lastEvent
        ? `SEQ=${lastEvent.seq} HASH=${lastEvent.hash.substring(0, 8)}...`
        : "EMPTY LEDGER",
    );

    // =========================================================
    // APPEND TEST
    // =========================================================

    const TOTAL_APPEND = 10000;
    console.log(`\n=== APPEND ${TOTAL_APPEND} EVENTS ===`);

    const appendStart = performance.now();

    for (let i = 0; i < TOTAL_APPEND; i++) {
      await engine.appendEvent(
        "TEST_EVENT",
        {
          iteration: i,
          value: Math.random(),
          timestamp: Date.now(),
        },
        {
          operator_id: "tester-01",
          branch_id: "branch-01",
        },
      );

      if ((i + 1) % 2000 === 0) {
        console.log(`Appended ${i + 1} events`);
      }
    }

    const appendEnd = performance.now();
    console.log(
      `Append completed in ${((appendEnd - appendStart) / 1000).toFixed(2)}s`,
    );

    // =========================================================
    // REPLAY & INTEGRITY VALIDATION
    // =========================================================

    console.log("\n=== REPLAY VALIDATION ===");

    let replayCount = 0;
    let previousSeq = 0;
    let previousHash = "0";

    const replayStart = performance.now();

    // Tambahkan log awal untuk memastikan fungsi terpanggil
    console.log("Querying database, please wait...");

    await engine.replay(async (event) => {
      replayCount++;

      // -----------------------------------------
      // LOG PROGRESS (Gunakan angka lebih kecil agar terlihat bergerak)
      // -----------------------------------------
      if (replayCount % 500 === 0) {
        const elapsed = ((performance.now() - replayStart) / 1000).toFixed(2);
        console.log(`Verifying: ${replayCount}/10000 events... [${elapsed}s]`);
      }

      // VALIDATE SEQUENCE ORDER
      if (event.seq !== previousSeq + 1) {
        throw new Error(`INVALID SEQUENCE at #${replayCount}`);
      }

      // VALIDATE HASH CHAIN
      if (event.prev_hash !== previousHash) {
        throw new Error(`BROKEN HASH CHAIN at seq=${event.seq}`);
      }

      previousSeq = event.seq;
      previousHash = event.hash;
    });

    const replayEnd = performance.now();

    console.log(
      `Replay verified: ${replayCount} events in ${((replayEnd - replayStart) / 1000).toFixed(2)}s`,
    );

    // =========================================================
    // INTEGRITY CHECK (USING ENGINE METHOD)
    // =========================================================
    console.log("\n=== ENGINE INTEGRITY CHECK ===");
    const integrity = await engine.validateIntegrity();
    console.log(`Integrity Valid: ${integrity.valid ? "YES ✅" : "NO ❌"}`);
    console.log(`Checked Events: ${integrity.checked}`);

    // =========================================================
    // CLOSE ENGINE
    // =========================================================

    console.log("\n=== CLOSING ENGINE ===");
    await engine.close();
    console.log("Engine closed successfully.");

    // =========================================================
    // REOPEN TEST (PERSISTENCE VALIDATION)
    // =========================================================
    // Catatan: fake-indexeddb/auto menghapus data di memori saat proses Node berakhir.
    // Reopen dalam satu execution loop tetap bisa membaca data yang tersimpan di "in-memory" DB.

    console.log("\n=== REOPEN / PERSISTENCE TEST ===");

    const reopenedEngine = new LedgerEngine();
    await reopenedEngine.init();

    const reopenedLastEvent = await reopenedEngine.getLastEvent();

    if (!reopenedLastEvent) {
      throw new Error("Persistence test failed: ledger is empty after reopen");
    }

    console.log(
      `Persistence OK
Recovered Last Seq: ${reopenedLastEvent.seq}
Recovered Last Hash: ${reopenedLastEvent.hash.substring(0, 8)}...`,
    );

    await reopenedEngine.close();

    console.log("\n=== ALL TEST PASSED ===");
  } catch (err) {
    console.error("\nTEST FAILED\n");
    console.error(err);
  }
}

runTest();
