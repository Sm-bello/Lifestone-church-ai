import re

with open('src-tauri/src/commands/stt.rs', 'r') as f:
    c = f.read()

# Use regex to replace Mutex<<AppState> with Mutex<<AppState>
c = re.sub(r'Mutex<<AppState>', r'Mutex<<AppState>', c)

with open('src-tauri/src/commands/stt.rs', 'w') as f:
    f.write(c)

print('Fixed stt.rs using regex')
