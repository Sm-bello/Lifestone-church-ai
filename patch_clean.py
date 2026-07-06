import re

with open('src-tauri/src/commands/stt.rs', 'r', encoding='utf-8') as f:
    c = f.read()

# Find the original model_path block and add exe_dir fallback BEFORE the resource_dir fallback
old_block = '''                } else {
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
                }'''

new_block = '''                } else {
                    // Try resource_dir first (production bundle)
                    let resource_path = app.path()
                        .resource_dir()
                        .map(|p| {
                            p.join("models")
                                .join("whisper")
                                .join(model_filename)
                        });
                    
                    if let Some(ref p) = resource_path {
                        if p.exists() {
                            p.clone()
                        } else {
                            // Fallback: same directory as the executable
                            if let Ok(exe_path) = std::env::current_exe() {
                                if let Some(exe_dir) = exe_path.parent() {
                                    let exe_model = exe_dir.join("models").join("whisper").join(model_filename);
                                    if exe_model.exists() {
                                        exe_model
                                    } else {
                                        resource_path.unwrap_or_else(|| {
                                            std::path::PathBuf::from("models/whisper").join(model_filename)
                                        })
                                    }
                                } else {
                                    resource_path.unwrap_or_else(|| {
                                        std::path::PathBuf::from("models/whisper").join(model_filename)
                                    })
                                }
                            } else {
                                resource_path.unwrap_or_else(|| {
                                    std::path::PathBuf::from("models/whisper").join(model_filename)
                                })
                            }
                        }
                    } else {
                        // resource_dir not available
                        if let Ok(exe_path) = std::env::current_exe() {
                            if let Some(exe_dir) = exe_path.parent() {
                                let exe_model = exe_dir.join("models").join("whisper").join(model_filename);
                                if exe_model.exists() {
                                    exe_model
                                } else {
                                    std::path::PathBuf::from("models/whisper").join(model_filename)
                                }
                            } else {
                                std::path::PathBuf::from("models/whisper").join(model_filename)
                            }
                        } else {
                            std::path::PathBuf::from("models/whisper").join(model_filename)
                        }
                    }
                }'''

c = c.replace(old_block, new_block)

with open('src-tauri/src/commands/stt.rs', 'w', encoding='utf-8') as f:
    f.write(c)

print('Applied clean exe_dir fallback')
