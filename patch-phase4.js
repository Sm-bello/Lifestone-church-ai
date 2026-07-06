const fs = require('fs');
let c = fs.readFileSync('data/prepare-embeddings.ts', 'utf8');
c = c.replace('if (!shouldSkip("ONNX models", MODEL_ONNX, MODEL_INT8)) {', 'if (false) { // ONNX export skipped');
fs.writeFileSync('data/prepare-embeddings.ts', c);
console.log('Skipped Phase 4');
