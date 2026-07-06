with open('src-tauri/crates/lifestone-stt/src/whisper.rs', 'r', encoding='utf-8') as f:
    c = f.read()

# Add transcription timing log after the inference
old_text = '''                log::debug!(
                    "[Whisper] Transcribed {:.1}s audio in {:?}",
                    audio_f32.len() as f32 / 16_000.0,
                    start.elapsed()
                );'''

new_text = '''                let elapsed = start.elapsed();
                let audio_secs = audio_f32.len() as f32 / 16_000.0;
                log::info!(
                    "[STT] Transcribed {:.1}s audio in {:?}, text: \"{}\"",
                    audio_secs, elapsed, text
                );'''

c = c.replace(old_text, new_text)

with open('src-tauri/crates/lifestone-stt/src/whisper.rs', 'w', encoding='utf-8') as f:
    f.write(c)

print('Added transcription timing log')
