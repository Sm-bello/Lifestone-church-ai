with open('src-tauri/Cargo.toml', 'r') as f:
    c = f.read()

if 'tauri-plugin-shell' not in c:
    c = c.replace('tauri-plugin-fs = "2"', 'tauri-plugin-fs = "2"\ntauri-plugin-shell = "2"')
    with open('src-tauri/Cargo.toml', 'w') as f:
        f.write(c)
    print('Added tauri-plugin-shell')
else:
    print('Already present')
