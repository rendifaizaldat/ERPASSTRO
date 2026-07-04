with open('tools/auditor/runner.ts', 'r') as f:
    content = f.read()

# I patched tools/auditor/runner.ts a couple times and might have duplicate implementations of getLocalAndServerState
dup_block = """
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

content = content.replace(dup_block, "", 1)
with open('tools/auditor/runner.ts', 'w') as f:
    f.write(content)
