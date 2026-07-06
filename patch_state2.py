with open('src-tauri/src/state.rs', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the orphaned doc comment
content = content.replace('    /// Whisper model preference: "base.en" (fast) or "large-v3-turbo" (accurate)\n', '')

with open('src-tauri/src/state.rs', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Removed orphaned doc comment')
