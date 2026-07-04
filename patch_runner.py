import re

with open('tools/auditor/runner.ts', 'r') as f:
    content = f.read()

# Replace ScenarioContext
old_ctx = """interface ScenarioContext {
  page: Page;
  emitLog: (msg: string) => void;
  assert: (condition: boolean, message: string) => void;
  waitForBackend: (
    fn: () => Promise<boolean>,
    timeoutMs?: number,
  ) => Promise<void>;
  dbChecker: typeof dbChecker;
}"""

new_ctx = """export interface ScenarioContext {
  page: Page;
  emitLog: (msg: string) => void;
  assert: (condition: boolean, message: string) => void;
  waitForBackend: (
    fn: () => Promise<boolean>,
    timeoutMs?: number,
  ) => Promise<void>;
  dbChecker: typeof dbChecker;
  getLocalAndServerState: () => Promise<{ local: any, server: any }>;
  injectAction: (eventType: string, payload: any) => Promise<void>;
  emitState: (phase: "PRE" | "POST", label: string, local: any, server: any) => void;
}"""

content = content.replace(old_ctx, new_ctx)

# Add helpers inside runAudit before the injection helpers
injection_helpers_start = "// ==========================================\n  // INJECTION HELPERS (via page.evaluate) - PURE EVENT-DRIVEN\n  // =========================================="

new_helpers = """
  const getLocalAndServerState = async () => {
    const local = await page!.evaluate(async () => {
      const api = (window as any).__AUDITOR__;
      if (!api) return {};
      const state = await api.projector.getState();
      return state;
    });
    const server = await dbChecker.getServerState();
    return { local, server };
  };

  const injectAction = async (eventType: string, payload: any) => {
    emitLog(`[INJECT] ${eventType}...`);
    await page!.evaluate(async ({ type, data }) => {
      const api = (window as any).__AUDITOR__;
      if (!api) throw new Error("Auditor API tidak terekspos");

      const payloadCopy = { ...data };
      if (!payloadCopy.deviceId) payloadCopy.deviceId = localStorage.getItem("ASSTRO_DEVICE_ID") || "UNKNOWN-DEVICE";
      if (!payloadCopy.branchId) payloadCopy.branchId = localStorage.getItem("ASSTRO_BRANCH_ID") || "";
      if (!payloadCopy.businessDate) payloadCopy.businessDate = localStorage.getItem("ASSTRO_BUSINESS_DATE") || new Date().toISOString().slice(0, 10);

      await api.ledger.appendEvent(type, payloadCopy);
    }, { type: eventType, data: payload });
  };
"""

content = content.replace(injection_helpers_start, new_helpers + "\n  " + injection_helpers_start)

# Update the scenario runners calls
setup_call = "await runSetup({ page: page!, emitLog, assert, waitForBackend, dbChecker });"
new_setup_call = "await runSetup({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, emitState });"
content = content.replace(setup_call, new_setup_call)

skenario3_call = "await runkatalog({\n      page: page!,\n      emitLog,\n      assert,\n      waitForBackend,\n      dbChecker,\n    });"
new_skenario3_call = "await runkatalog({\n      page: page!,\n      emitLog,\n      assert,\n      waitForBackend,\n      dbChecker,\n      getLocalAndServerState,\n      injectAction,\n      emitState\n    });"
content = content.replace(skenario3_call, new_skenario3_call)

with open('tools/auditor/runner.ts', 'w') as f:
    f.write(content)
