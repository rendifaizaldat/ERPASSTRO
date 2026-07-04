import re

with open('tools/auditor/runner.ts', 'r') as f:
    content = f.read()

# Remove the old injection helpers
helpers = [
    "injectOperatorAuth",
    "injectOpenShift",
    "injectCategory",
    "injectProduct",
    "injectProductEdit",
    "injectProductArchive",
    "injectCategoryDelete",
    "assertLocalCategory",
    "assertLocalProduct",
    "assertBackendCategory",
    "assertBackendProduct",
    "assertBackendEvent",
    "assertNoOrphans"
]

# Quick regex to strip functions out of runner (they are replaced by injectAction)
for helper in helpers:
    pattern = rf'  const {helper} = async \(.*?\) => \{{.*?\}};\n'
    content = re.sub(pattern, '', content, flags=re.DOTALL)

with open('tools/auditor/runner.ts', 'w') as f:
    f.write(content)
