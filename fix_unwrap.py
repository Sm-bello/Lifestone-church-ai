with open('src-tauri/src/commands/stt.rs', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix unwrap_or_else on Result to use |_| or replace with unwrap_or
c = c.replace(
    'resource_path.unwrap_or_else(|| {',
    'resource_path.unwrap_or_else(|_| {'
)

with open('src-tauri/src/commands/stt.rs', 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed unwrap_or_else closures')
