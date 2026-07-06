const fs = require('fs');
let content = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
content = content.replace(/crates\/(audio|stt|bible|detection|broadcast|api|notes)/g, 'crates/lifestone-');
fs.writeFileSync('src-tauri/Cargo.toml', content);
console.log('Fixed Cargo.toml');
