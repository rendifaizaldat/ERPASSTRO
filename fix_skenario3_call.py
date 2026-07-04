import re

with open('tools/auditor/runner.ts', 'r') as f:
    content = f.read()

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
      assertDataState,
      emitState
    });"""
content = content.replace(bad_katalog_call, good_katalog_call)
with open('tools/auditor/runner.ts', 'w') as f:
    f.write(content)
