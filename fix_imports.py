with open('src-tauri/src/commands/stt.rs', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace all rhema_* imports with lifestone_*
c = c.replace('rhema_audio', 'lifestone_audio')
c = c.replace('rhema_stt', 'lifestone_stt')
c = c.replace('rhema_detection', 'lifestone_detection')

with open('src-tauri/src/commands/stt.rs', 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed imports: rhema -> lifestone')
