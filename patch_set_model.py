# Add set_whisper_model command to stt.rs
with open('src-tauri/src/commands/stt.rs', 'r') as f:
    c = f.read()

# Find the end of the file (after the last function) and append
append_cmd = """

/// Set the Whisper model preference (base.en or large-v3-turbo).
/// Takes effect on next transcription start.
#[tauri::command]
pub fn set_whisper_model(
    state: State<'_, Mutex<AppState>>,
    model: String,
) -> Result<(), String> {
    let mut app_state = state.lock().map_err(|e| e.to_string())?;
    match model.as_str() {
        "base.en" | "large-v3-turbo" => {
            app_state.whisper_model = model.clone();
            log::info!("[STT] Whisper model set to: {}", model);
            Ok(())
        }
        _ => Err("Invalid model. Use 'base.en' or 'large-v3-turbo'".into()),
    }
}
"""

# Append before the last closing brace or at end
if 'pub fn set_whisper_model' not in c:
    c = c.rstrip() + "\n" + append_cmd + "\n"

with open('src-tauri/src/commands/stt.rs', 'w') as f:
    f.write(c)

print('Added set_whisper_model command')
