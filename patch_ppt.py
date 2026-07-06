import re

with open('src-tauri/src/commands/stt.rs', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the import for PptVersePayload at the top of the file
old_imports = """use crate::events::{
    AudioLevelPayload, TranscriptPayload, EVENT_AUDIO_LEVEL, EVENT_AUDIO_SOURCE_LOST,
    EVENT_AUDIO_SOURCE_RECOVERED, EVENT_TRANSCRIPT_FINAL, EVENT_TRANSCRIPT_PARTIAL,
};"""

new_imports = """use crate::events::{
    AudioLevelPayload, TranscriptPayload, EVENT_AUDIO_LEVEL, EVENT_AUDIO_SOURCE_LOST,
    EVENT_AUDIO_SOURCE_RECOVERED, EVENT_TRANSCRIPT_FINAL, EVENT_TRANSCRIPT_PARTIAL,
};
use crate::commands::broadcast::PptVersePayload;"""

content = content.replace(old_imports, new_imports)

# Add helper function before run_direct_detection
helper = """
/// Auto-push a detected verse to PowerPoint via TCP sidecar.
/// Non-blocking: if sidecar isn't running, logs and continues.
fn try_push_to_ppt(reference: &str, text: &str) {
    use std::io::Write;
    use std::net::TcpStream;
    use std::time::Duration;

    let addr = format!("127.0.0.1:{}", 47832u16);
    let Ok(stream) = TcpStream::connect_timeout(
        &addr.parse().unwrap(),
        Duration::from_millis(500),
    ) else {
        return; // Sidecar not running -- silently skip
    };
    let request = serde_json::json!({
        "action": "update",
        "reference": reference,
        "text": text,
        "context": "",
    });
    let mut stream = stream;
    let _ = stream.set_nonblocking(true);
    let _ = stream.write_all((request.to_string() + "\n").as_bytes());
    // Fire-and-forget: don't wait for response
}

"""

content = content.replace(
    '/// Run direct (regex/pattern) detection only. Instant, no ONNX.',
    helper + '/// Run direct (regex/pattern) detection only. Instant, no ONNX.'
)

# Wire auto-push in run_direct_detection (after the DB-locked emit)
old_direct = """    for r in &results {
        log::info!("[DET-DIRECT] Found: {} ({:.0}%)", r.verse_ref, r.confidence * 100.0);
    }
    drop(app_state);
    let _ = app.emit("verse_detections", &results);"""

new_direct = """    for r in &results {
        log::info!("[DET-DIRECT] Found: {} ({:.0}%)", r.verse_ref, r.confidence * 100.0);
    }
    // Auto-push high-confidence direct detections to PowerPoint
    for r in &results {
        if r.confidence >= 0.90 && !r.verse_text.is_empty() {
            try_push_to_ppt(&r.verse_ref, &r.verse_text);
            log::info!("[PPT-AUTO] Pushed {} to PowerPoint", r.verse_ref);
        }
    }
    drop(app_state);
    let _ = app.emit("verse_detections", &results);"""

content = content.replace(old_direct, new_direct)

# Wire auto-push in run_semantic_detection (after emit)
old_semantic = """    for r in &results {
        log::info!(
            "[DET-SEMANTIC] Found: {} ({:.0}% {}) auto_q={}",
            r.verse_ref, r.confidence * 100.0, r.source, r.auto_queued
        );
    }
    drop(app_state);
    let _ = app.emit("verse_detections", &results);"""

new_semantic = """    for r in &results {
        log::info!(
            "[DET-SEMANTIC] Found: {} ({:.0}% {}) auto_q={}",
            r.verse_ref, r.confidence * 100.0, r.source, r.auto_queued
        );
    }
    // Auto-push high-confidence semantic detections to PowerPoint
    for r in &results {
        if r.confidence >= 0.75 && !r.verse_text.is_empty() {
            try_push_to_ppt(&r.verse_ref, &r.verse_text);
            log::info!("[PPT-AUTO] Pushed {} to PowerPoint (semantic)", r.verse_ref);
        }
    }
    drop(app_state);
    let _ = app.emit("verse_detections", &results);"""

content = content.replace(old_semantic, new_semantic)

with open('src-tauri/src/commands/stt.rs', 'w', encoding='utf-8') as f:
    f.write(content)

print('Wired auto-push to PowerPoint in stt.rs')
