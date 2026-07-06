with open('src-tauri/src/state.rs', 'r') as f:
    c = f.read()

# Fix: add whisper_model field properly
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

old_impl = '''        Self {
            bible_db: None,
            active_translation_id: 1, // Default to first translation (KJV)
            audio_active: Arc::new(AtomicBool::new(false)),
            stt_active: Arc::new(AtomicBool::new(false)),
            deepgram_api_key: None,
        }'''

new_impl = '''        Self {
            bible_db: None,
            active_translation_id: 1, // Default to first translation (KJV)
            audio_active: Arc::new(AtomicBool::new(false)),
            stt_active: Arc::new(AtomicBool::new(false)),
            deepgram_api_key: None,
            whisper_model: "base.en".to_string(),
        }'''

c = c.replace(old_impl, new_impl)

with open('src-tauri/src/state.rs', 'w') as f:
    f.write(c)

print('Fixed state.rs')
