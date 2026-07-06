with open('src-tauri/src/lib.rs', 'r') as f:
    c = f.read()

old_cmds = '''            commands::stt::start_transcription,
            commands::stt::stop_transcription,
            commands::stt::get_transcription_status,'''

new_cmds = '''            commands::stt::start_transcription,
            commands::stt::stop_transcription,
            commands::stt::get_transcription_status,
            commands::stt::set_whisper_model,'''

c = c.replace(old_cmds, new_cmds)

with open('src-tauri/src/lib.rs', 'w') as f:
    f.write(c)

print('Wired set_whisper_model into lib.rs')
