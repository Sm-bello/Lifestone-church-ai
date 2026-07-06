import re

with open('src-tauri/src/commands/stt.rs', 'r') as f:
    c = f.read()

# Remove unused PptVersePayload import
c = re.sub(r'use crate::commands::broadcast::PptVersePayload;\n', '', c)

# Add #[allow(dead_code)] to set_whisper_model since it's called from frontend via Tauri
c = c.replace(
    '/// Set the Whisper model preference (base.en or large-v3-turbo).\n/// Takes effect on next transcription start.\n#[tauri::command]',
    '/// Set the Whisper model preference (base.en or large-v3-turbo).\n/// Takes effect on next transcription start.\n#[allow(dead_code)]\n#[tauri::command]'
)

with open('src-tauri/src/commands/stt.rs', 'w') as f:
    f.write(c)

print('Cleaned warnings')
