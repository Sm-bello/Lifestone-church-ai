# Patch 2: Read whisper_model from AppState in start_transcription
with open('src-tauri/src/commands/stt.rs', 'r') as f:
    c = f.read()

old_model = '''            let model_filename = "ggml-base.en.bin";'''

new_model = '''            let model_filename = {
                let app_managed: State<'_, Mutex<<AppState>> = app.state();
                let app_state = app_managed.lock().map_err(|e| e.to_string())?;
                match app_state.whisper_model.as_str() {
                    "large-v3-turbo" => "ggml-large-v3-turbo-q8_0.bin",
                    _ => "ggml-base.en.bin",
                }
            };'''

c = c.replace(old_model, new_model)

with open('src-tauri/src/commands/stt.rs', 'w') as f:
    f.write(c)

print('Patched stt.rs model selection')
