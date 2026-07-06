const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');
content = content.replace('build: {', 'watch: {\\n    exclude: [\"src-tauri/target/**\", \".git/**\"],\\n  },\\n  build: {');
fs.writeFileSync('vite.config.ts', content);
console.log('Added watch exclude');
