import re

with open('tools/auditor/runner.ts', 'r') as f:
    content = f.read()

skenario4_call = """
    // ==========================================
    // SKENARIO 4: Alur Kerja Pesanan
    // ==========================================
    emitLog("[SKENARIO 4] Memulai Order Workflow...");
    const { run: runOrder } = await import("./scenarios/skenario-04-order");
    await runOrder({
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

# append to end before audit complete
pattern = r'emitLog\("=== AUDIT SELESAI SUKSES ==="\);'
content = re.sub(pattern, skenario4_call.replace('\\', '\\\\') + '\n    emitLog("=== AUDIT SELESAI SUKSES ===");', content)

with open('tools/auditor/runner.ts', 'w') as f:
    f.write(content)
