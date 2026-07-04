with open('tools/auditor/runner.ts', 'r') as f:
    content = f.read()

bad = """    const { run: runSetup } = await import("./scenarios/skenario-01-setup");
    await runSetup({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, emitState });"""
good = """    const { run: runSetup } = await import("./scenarios/skenario-01-setup");
    await runSetup({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, emitState, assertDataState });"""

content = content.replace(bad, good)
with open('tools/auditor/runner.ts', 'w') as f:
    f.write(content)
