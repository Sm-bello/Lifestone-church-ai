import re

with open('src-tauri/src/commands/stt.rs', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add model parameter to function signature
old_sig = '''pub async fn start_transcription(
    app: AppHandle,
    state: State<'_, Mutex<<AppState>>,
    api_key: String,
    device_id: Option<String>,
    gain: Option<f32>,'''

new_sig = '''pub async fn start_transcription(
    app: AppHandle,
    state: State<'_, Mutex<<AppState>>,
    api_key: String,
    device_id: Option<String>,
    gain: Option<f32>,
    model: Option<String>,'''

c = c.replace(old_sig, new_sig)

# 2. Replace hardcoded model with parameter
old_model = 'let model_filename = "ggml-large-v3-turbo-q8_0.bin";'
new_model = 'let model_filename = model.as_deref().unwrap_or("ggml-large-v3-turbo-q8_0.bin");'

c = c.replace(old_model, new_model)

# 3. Add log line after model_filename
old_log = 'let model_path = {'
new_log = '''log::info!("[STT] Model selected: {model_filename}");
            let model_path = {'''

c = c.replace(old_log, new_log)

with open('src-tauri/src/commands/stt.rs', 'w', encoding='utf-8') as f:
    f.write(c)

print('Patched stt.rs: added model parameter')
