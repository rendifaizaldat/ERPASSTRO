import re

with open('tools/auditor/runner.ts', 'r') as f:
    content = f.read()

# I patched tools/auditor/runner.ts a couple times and might have duplicate implementations of getLocalAndServerState
dup1 = """const getLocalAndServerState = async () => {"""
cnt = content.count(dup1)
print(f"Count of getLocalAndServerState: {cnt}")
