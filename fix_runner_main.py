import re

with open('tools/auditor/runner.ts', 'r') as f:
    content = f.read()

# the inline implementation for Skenario 2 is still there. We must replace it with the imported call
old_skenario2 = """    // 1. SNAPSHOT PRE-STATE (Sebelum Aksi)
    const preServerShift = (await dbChecker.getLatestShift()) || {};
    const preLocalShift = await page!.evaluate(async () => {
      const shiftId = localStorage.getItem("ASSTRO_CURRENT_SHIFT_ID");
      return shiftId
        ? { id: shiftId, status: "Shift sisa pengujian sebelumnya" }
        : {};
    });

    emitState(
      "PRE",
      "Skenario 2: Login & Buka Shift",
      preLocalShift,
      preServerShift,
    );

    // 2. EKSEKUSI VIRTUAL AKSI
    await injectOperatorAuth("112233");
    await injectOpenShift("112233", 150000); // Modal awal 150.000

    // 3. TUNGGU SINKRONISASI KE BACKEND (Sangat Krusial!)
    emitLog("  -> Menunggu Background Sync mengirim data Shift ke Server...");
    await waitForBackend(async () => {
      const shift = await dbChecker.getLatestShift();
      // Pastikan data tidak null dan modal awalnya sesuai dengan yang kita inject
      return shift !== null && Number(shift.starting_cash) === 150000;
    }, 15000); // Maksimal tunggu 15 detik

    // 4. SNAPSHOT POST-STATE (Sesudah Aksi)
    const postServerShift = (await dbChecker.getLatestShift()) || {};

    const postLocalShift = await page!.evaluate(async () => {
      try {
        const api = (window as any).__AUDITOR__;
        const shiftId = localStorage.getItem("ASSTRO_CURRENT_SHIFT_ID");

        if (!api) return { error: "Auditor API tidak terekspos" };
        if (!shiftId)
          return { error: "Shift ID tidak ditemukan di localStorage" };

        // Membaca langsung dari RxDB Lokal (Skema pos_shifts)
        if (api.rxdb && api.rxdb.shifts) {
          const shiftDoc = await api.rxdb.shifts.findOne(shiftId).exec();
          if (shiftDoc) return shiftDoc.toJSON();
        }

        // Fallback jika rxdb tidak di-ekspos, ambil dari state projector
        const state = await api.projector.getState();
        return (
          state.currentShift || {
            id: shiftId,
            note: "RxDB.shifts belum terekspos di window.__AUDITOR__",
          }
        );
      } catch (err: any) {
        return { error: err.message };
      }
    });

    emitState(
      "POST",
      "Skenario 2: Login & Buka Shift",
      postLocalShift,
      postServerShift,
    );"""

new_skenario2 = """
    const { run: runShift } = await import("./scenarios/skenario-02-shift");
    await runShift({
      page: page!,
      emitLog,
      assert,
      waitForBackend,
      dbChecker,
      getLocalAndServerState,
      injectAction,
      assertDataState,
      emitState
    });
"""
content = content.replace(old_skenario2, new_skenario2)

with open('tools/auditor/runner.ts', 'w') as f:
    f.write(content)
