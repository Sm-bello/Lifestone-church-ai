with open('src-tauri/src/state.rs', 'r') as f:
    c = f.read()

# Add whisper_model field to struct
old = '''    #[expect(dead_code, reason = "reserved for future Deepgram key injection")]
    pub deepgram_api_key: Option<String>,
}'''

new = '''    #[expect(dead_code, reason = "reserved for future Deepgram key injection")]
    pub deepgram_api_key: Option<String>,
    /// Whisper model preference: "base.en" (fast) or "large-v3-turbo" (accurate)
    pub whisper_model: String,
}'''

c = c.replace(old, new)

with open('src-tauri/src/state.rs', 'w') as f:
    f.write(c)

print('Fixed state.rs struct')
