import re

with open('tools/auditor/runner.ts', 'r') as f:
    content = f.read()

# Replace scenario runners execution in runAudit to properly pass the new context API
bad_runner_code_1 = """const injectOperatorAuth = async (pin: string) => {
    emitLog(`[INJECT] OPERATOR_AUTHENTICATED via PIN '${pin}'...`);
    await page!.evaluate(async (pinVal) => {
      const api = (window as any).__AUDITOR__;
      if (!api) throw new Error("Auditor API tidak terekspos");

      // 1. Cek di localStorage (Hasil Hydration Setup Wizard)
      const offlineStaffStr = localStorage.getItem("ASSTRO_OFFLINE_STAFF");
      const offlineStaff = offlineStaffStr ? JSON.parse(offlineStaffStr) : [];
      let staff = offlineStaff.find(
        (s: any) => s.pin === pinVal && s.isActive !== false,
      );

      // 2. Jika tidak ada, fallback cek ke Projector (Ledger State)
      if (!staff) {
        const state = await api.projector.getState();
        staff = (state.staffList || []).find(
          (s: any) => s.pin === pinVal && s.isActive !== false,
        );
      }

      if (!staff)
        throw new Error(
          `Staff dengan PIN '${pinVal}' tidak ditemukan di memori lokal maupun Ledger.`,
        );

      const deviceId =
        localStorage.getItem("ASSTRO_DEVICE_ID") || "UNKNOWN-DEVICE";
      const branchId = localStorage.getItem("ASSTRO_BRANCH_ID") || "";

      await api.ledger.appendEvent("OPERATOR_AUTHENTICATED", {
        operatorId: staff.id,
        pin: pinVal,
        authenticatedAt: new Date().toISOString(),
        deviceId,
        branchId,
      });
    }, pin);
  };"""

content = content.replace(bad_runner_code_1, "")

bad_runner_code_2 = """const injectOpenShift = async (pin: string, amount: number) => {
    emitLog(`[INJECT] SHIFT_OPENED dengan modal ${amount}...`);
    await page!.evaluate(
      async ({ pinVal, cashVal }) => {
        const api = (window as any).__AUDITOR__;
        if (!api) throw new Error("Auditor API tidak terekspos");

        // 1. Cek di localStorage
        const offlineStaffStr = localStorage.getItem("ASSTRO_OFFLINE_STAFF");
        const offlineStaff = offlineStaffStr ? JSON.parse(offlineStaffStr) : [];
        let staff = offlineStaff.find(
          (s: any) => s.pin === pinVal && s.isActive !== false,
        );

        // 2. Fallback cek ke Projector
        if (!staff) {
          const state = await api.projector.getState();
          staff = (state.staffList || []).find(
            (s: any) => s.pin === pinVal && s.isActive !== false,
          );
        }

        if (!staff)
          throw new Error(`Staff dengan PIN '${pinVal}' tidak ditemukan.`);

        const shiftId = `SHIFT-${Date.now().toString(36).toUpperCase()}`;
        const branchId = localStorage.getItem("ASSTRO_BRANCH_ID") || "";
        const deviceId =
          localStorage.getItem("ASSTRO_DEVICE_ID") || "UNKNOWN-DEVICE";

        let businessDate = localStorage.getItem("ASSTRO_BUSINESS_DATE");
        if (!businessDate) {
          const now = new Date();
          const ref =
            now.getHours() < 3
              ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
              : now;
          businessDate = ref.toISOString().slice(0, 10);
          localStorage.setItem("ASSTRO_BUSINESS_DATE", businessDate);
        }

        localStorage.setItem("ASSTRO_CURRENT_SHIFT_ID", shiftId);

        await api.ledger.appendEvent("SHIFT_OPENED", {
          operatorId: staff.id,
          initial_cash: cashVal,
          shiftId,
          branchId,
          deviceId,
          cashierId: staff.id,
          openedAt: new Date().toISOString(),
          startingCash: cashVal,
          businessDate,
        });
      },
      { pinVal: pin, cashVal: amount },
    );
  };"""

content = content.replace(bad_runner_code_2, "")

with open('tools/auditor/runner.ts', 'w') as f:
    f.write(content)
