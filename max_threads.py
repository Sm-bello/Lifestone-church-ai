with open('src-tauri/src/commands/stt.rs', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    'let n_threads = i32::try_from(parallelism / 2).unwrap_or(2).max(1);',
    'let n_threads = i32::try_from(parallelism).unwrap_or(4).max(1);'
)

with open('src-tauri/src/commands/stt.rs', 'w', encoding='utf-8') as f:
    f.write(c)

print('Maxed out CPU threads')
