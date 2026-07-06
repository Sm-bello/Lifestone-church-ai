# Fix state.rs: add whisper_model field to struct
with open('src-tauri/src/state.rs', 'r') as f:
    c = f.read()

old_struct = '''pub struct AppState {
    pub bible_db: Option<BibleDb>,
    pub active_translation_id: i64,
    pub audio_active: Arc<<AtomicBool>,
    pub stt_active: Arc<<AtomicBool>,
    #[expect(dead_code, reason = "reserved for future Deepgram key injection")]
    pub deepgram_api_key: Option<String>,
}'''

new_struct = '''pub struct AppState {
    pub bible_db: Option<BibleDb>,
    pub active_translation_id: i64,
    pub audio_active: Arc<<AtomicBool>,
    pub stt_active: Arc<<AtomicBool>,
    #[expect(dead_code, reason = "reserved for future Deepgram key injection")]
    pub deepgram_api_key: Option<String>,
    /// Whisper model preference: "base.en" (fast) or "large-v3-turbo" (accurate)
    pub whisper_model: String,
}'''

c = c.replace(old_struct, new_struct)

with open('src-tauri/src/state.rs', 'w') as f:
    f.write(c)

print('Fixed state.rs struct')
