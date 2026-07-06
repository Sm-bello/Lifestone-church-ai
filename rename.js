const fs = require('fs');
const path = require('path');
const skipDirs = new Set(['.git', 'node_modules', 'target', 'build', '.venv', 'models', 'embeddings', 'sdk']);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    const ext = path.extname(entry.name);
    const textExts = new Set(['.ts', '.tsx', '.js', '.json', '.toml', '.rs', '.md', '.html', '.css', '.sql', '.py', '.env', '.conf', '.template', '.ps1', '.svg', '.yml', '.yaml']);
    if (!textExts.has(ext) && ext !== '') continue;
    try {
      let content = fs.readFileSync(full, 'utf8');
      let updated = content
        .replace(/lifestone-stt/g, 'lifestone-stt')
        .replace(/lifestone-bible/g, 'lifestone-bible')
        .replace(/lifestone-audio/g, 'lifestone-audio')
        .replace(/lifestone-detection/g, 'lifestone-detection')
        .replace(/lifestone-broadcast/g, 'lifestone-broadcast')
        .replace(/lifestone-api/g, 'lifestone-api')
        .replace(/lifestone-notes/g, 'lifestone-notes')
        .replace(/lifestone-context/g, 'lifestone-context')
        .replace(/"lifestone"/g, '"lifestone"')
        .replace(/name = "lifestone"/g, 'name = "lifestone"')
        .replace(/Lifestone/g, 'Lifestone')
        .replace(/rhema\.db/g, 'lifestone.db')
        .replace(/colig-base\/rhema/g, 'colig-base/lifestone')
        .replace(/com\.rhema/g, 'com.lifestone')
        .replace(/lifestone-app/g, 'lifestone-app')
        .replace(/openbezal\/rhema/g, 'openbezal/rhema')
        .replace(/rhema\.svg/g, 'lifestone.svg')
        .replace(/lifestone-mark/g, 'lifestone-mark');
      if (updated !== content) {
        fs.writeFileSync(full, updated, 'utf8');
        console.log('renamed:', full);
      }
    } catch(e) {}
  }
}
walk('.');
console.log('Done.');
