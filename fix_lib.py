with open('src-tauri/src/lib.rs', 'r') as f:
    c = f.read()

if 'tauri_plugin_shell' not in c:
    c = c.replace('.plugin(tauri_plugin_store::init())', '.plugin(tauri_plugin_store::init())\n        .plugin(tauri_plugin_shell::init())')
    with open('src-tauri/src/lib.rs', 'w') as f:
        f.write(c)
    print('Added shell plugin init')
else:
    print('Already present')
