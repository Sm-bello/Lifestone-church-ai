const fs = require('fs');
let content = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');
let lines = content.split('\n');
lines = lines.filter(line => !line.includes('dotenvy'));
content = lines.join('\n');
fs.writeFileSync('src-tauri/src/lib.rs', content);
console.log('Removed dotenvy lines');
