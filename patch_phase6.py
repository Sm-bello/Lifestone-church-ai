import re

with open('data/prepare-embeddings.ts', 'r') as f:
    content = f.read()

old_text = 'if (!shouldSkip(\"Pre-computed embeddings\", EMBEDDINGS_BIN)) {'
new_text = 'if (false) { // Embeddings skipped'

content = content.replace(old_text, new_text)

with open('data/prepare-embeddings.ts', 'w') as f:
    f.write(content)

print('Patched')
