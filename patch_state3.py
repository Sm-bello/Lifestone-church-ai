with open('src-tauri/src/state.rs', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the whisper_model initialization line
content = content.replace('            whisper_model: "base.en".to_string(),\n', '')

with open('src-tauri/src/state.rs', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Removed whisper_model initialization')
