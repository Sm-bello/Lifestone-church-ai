const fs = require('fs');
const path = require('path');

const cratesDir = 'src-tauri/crates';
for (const dir of fs.readdirSync(cratesDir)) {
  const cargoPath = path.join(cratesDir, dir, 'Cargo.toml');
  if (!fs.existsSync(cargoPath)) continue;
  
  let content = fs.readFileSync(cargoPath, 'utf8');
  let updated = content;
  
  // Fix package name
  updated = updated.split('name = "rhema-').join('name = "lifestone-');
  
  // Fix path references to sibling crates
  const names = ['audio','stt','bible','detection','broadcast','api','notes'];
  for (const name of names) {
    updated = updated.split('path = "../' + name + '"').join('path = "../lifestone-' + name + '"');
    updated = updated.split("path = '../" + name + "'").join("path = '../lifestone-" + name + "'");
  }
  
  if (updated !== content) {
    fs.writeFileSync(cargoPath, updated);
    console.log('fixed:', cargoPath);
  }
}
console.log('Done.');
