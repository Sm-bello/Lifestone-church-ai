const fs = require('fs');
let c = fs.readFileSync('data/prepare-embeddings.ts', 'utf8');
c = c.replace('if (!shouldSkip("Pre-computed embeddings", EMBEDDINGS_BIN)) {', 'if (false) { // Embeddings skipped');
fs.writeFileSync('data/prepare-embeddings.ts', c);
console.log('Skipped Phase 6');
