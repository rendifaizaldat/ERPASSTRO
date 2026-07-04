with open('tools/auditor/runner.ts', 'r') as f:
    content = f.read()

bad_setup_call = "await runSetup({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, emitState });"
good_setup_call = "await runSetup({ page: page!, emitLog, assert, waitForBackend, dbChecker, getLocalAndServerState, injectAction, emitState, assertDataState });"

content = content.replace(bad_setup_call, good_setup_call)

bad_katalog_call = """await runkatalog({
      page: page!,
      emitLog,
      assert,
      waitForBackend,
      dbChecker,
      getLocalAndServerState,
      injectAction,
      emitState
    });"""

good_katalog_call = """await runkatalog({
      page: page!,
      emitLog,
      assert,
      waitForBackend,
      dbChecker,
      getLocalAndServerState,
      injectAction,
      emitState,
      assertDataState
    });"""
content = content.replace(bad_katalog_call, good_katalog_call)

# also fix Skenario 1 type to use the new ScenarioContext
with open('tools/auditor/scenarios/skenario-01-setup.ts', 'r') as f:
    sc_content = f.read()
sc_content = sc_content.replace("""interface ScenarioContext {
  page: Page;
  emitLog: (msg: string) => void;
  assert: (condition: boolean, message: string) => void;
  waitForBackend: (
    fn: () => Promise<boolean>,
    timeoutMs?: number,
  ) => Promise<void>;
  dbChecker: any;
}""", """import { ScenarioContext } from '../runner';""")
with open('tools/auditor/scenarios/skenario-01-setup.ts', 'w') as f:
    f.write(sc_content)
