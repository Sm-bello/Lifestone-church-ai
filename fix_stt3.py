with open('src-tauri/src/commands/stt.rs', 'r') as f:
    c = f.read()

# Fix all instances of << in generic syntax
c = c.replace("Mutex<<AppState>", "Mutex<<AppState>")

with open('src-tauri/src/commands/stt.rs', 'w') as f:
    f.write(c)

print('Fixed Mutex syntax')
