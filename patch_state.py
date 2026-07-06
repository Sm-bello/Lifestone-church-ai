with open('src-tauri/src/state.rs', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the whisper_model field and its initialization
content = content.replace('    pub whisper_model: String,\n', '')
content = content.replace('            whisper_model: "ggml-large-v3-turbo-q8_0.bin".to_string(),\n', '')

with open('src-tauri/src/state.rs', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Removed dead whisper_model field')
