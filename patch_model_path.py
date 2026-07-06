with open('src-tauri/src/commands/stt.rs', 'r') as f:
    c = f.read()

# Find the model_path resolution block and add fallback to exe_dir
old_block = '''            let model_path = {
                let base_dir =
                    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
                let dev_path = base_dir
                    .join("models")
                    .join("whisper")
                    .join(model_filename);
                if dev_path.exists() {
                    dev_path
                } else {
                    app.path()
                        .resource_dir()
                        .map(|p| {
                            p.join("models")
                                .join("whisper")
                                .join(model_filename)
                        })
                        .ok()
                        .filter(|p| p.exists())
                        .ok_or_else(|| {
                            "Whisper model not found. Run: bun run download:whisper"
                                .to_string()
                        })?
                }
            };'''

new_block = '''            let model_path = {
                let base_dir =
                    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
                let dev_path = base_dir
                    .join("models")
                    .join("whisper")
                    .join(model_filename);
                if dev_path.exists() {
                    dev_path
                } else {
                    // Try resource_dir first (production bundle)
                    let resource_path = app.path()
                        .resource_dir()
                        .map(|p| p.join("models").join("whisper").join(model_filename));
                    
                    if let Some(ref p) = resource_path {
                        if p.exists() {
                            return p.clone();
                        }
                    }
                    
                    // Fallback: same directory as the executable
                    if let Ok(exe_path) = std::env::current_exe() {
                        if let Some(exe_dir) = exe_path.parent() {
                            let exe_model = exe_dir.join("models").join("whisper").join(model_filename);
                            if exe_model.exists() {
                                return exe_model;
                            }
                        }
                    }
                    
                    // Last resort: use resource_path even if it doesn't exist (will fail with clear error)
                    resource_path.ok_or_else(|| {
                        "Whisper model not found. Run: bun run download:whisper".to_string()
                    })?
                }
            };'''

c = c.replace(old_block, new_block)

with open('src-tauri/src/commands/stt.rs', 'w') as f:
    f.write(c)

print('Patched model path resolution')
