const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');
content = content.replace('strictPort: true,', 'strictPort: true,\n    host: "127.0.0.1",');
fs.writeFileSync('vite.config.ts', content);
console.log('Fixed vite.config.ts');
