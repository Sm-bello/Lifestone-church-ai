with open('src-tauri/src/commands/stt.rs', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix: Some -> Ok for Result type
c = c.replace(
    'if let Some(ref p) = resource_path {',
    'if let Ok(ref p) = resource_path {'
)

with open('src-tauri/src/commands/stt.rs', 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed Some -> Ok for Result')
