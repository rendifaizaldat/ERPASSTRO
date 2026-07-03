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
  emitLog("[SKENARIO 2] Login & Shift via injection...");

  const injectOperatorAuth = async (pin: string) => {
    emitLog(`[INJECT] OPERATOR_AUTHENTICATED via PIN '${pin}'...`);
    await page.evaluate(async (pinVal) => {
      const api = (window as any).__AUDITOR__;
      if (!api) throw new Error("Auditor API tidak terekspos");

      const state = await api.projector.getState();
      const staff = (state.staff || []).find(
        (s: any) => s.pin === pinVal && s.isActive !== false,
      );
      if (!staff)
        throw new Error(`Staff dengan PIN '${pinVal}' tidak ditemukan`);

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
  };

  const injectOpenShift = async (pin: string, amount: number) => {
    emitLog(`[INJECT] SHIFT_OPENED dengan modal ${amount}...`);
    await page.evaluate(
      async ({ pinVal, cashVal }) => {
        const api = (window as any).__AUDITOR__;
        if (!api) throw new Error("Auditor API tidak terekspos");

        const state = await api.projector.getState();
        const staff = (state.staff || []).find(
          (s: any) => s.pin === pinVal && s.isActive !== false,
        );
        if (!staff)
          throw new Error(`Staff dengan PIN '${pinVal}' tidak ditemukan`);

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
  };

  await injectOperatorAuth("112233");
  await injectOpenShift("112233", 150000);

  emitLog("[SKENARIO 2] Login & Shift selesai.");
}
