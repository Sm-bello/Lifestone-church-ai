with open('src-tauri/src/commands/stt.rs', 'r') as f:
    c = f.read()

# Fix the Mutex syntax
c = c.replace("Mutex<<AppState>", "Mutex<<AppState>")

with open('src-tauri/src/commands/stt.rs', 'w') as f:
    f.write(c)

print('Fixed stt.rs Mutex syntax')
