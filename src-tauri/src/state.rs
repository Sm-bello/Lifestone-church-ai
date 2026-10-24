use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use lifestone_bible::BibleDb;

pub struct AppState {
    pub bible_db: Option<BibleDb>,
    pub active_translation_id: i64,
    pub audio_active: Arc<AtomicBool>,
    pub stt_active: Arc<AtomicBool>,
    #[expect(dead_code, reason = "reserved for future Deepgram key injection")]
    pub deepgram_api_key: Option<String>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            bible_db: None,
            active_translation_id: 1, // Default to first translation (KJV)
            audio_active: Arc::new(AtomicBool::new(false)),
            stt_active: Arc::new(AtomicBool::new(false)),
            deepgram_api_key: None,
        }
    }

    /// Retrieve a reference to the loaded Bible database, or attempt lazy discovery if not yet loaded.
    pub fn get_or_load_bible_db(&mut self) -> Result<&BibleDb, String> {
        if self.bible_db.is_none() {
            if let Some(path) = find_bible_db_fallback() {
                match BibleDb::open(&path) {
                    Ok(db) => {
                        log::info!("[BIBLE] Bible database lazily opened from {}", path.display());
                        self.bible_db = Some(db);
                    }
                    Err(e) => {
                        log::error!("[BIBLE] Failed to lazily open Bible database at {}: {e}", path.display());
                    }
                }
            }
        }
        self.bible_db
            .as_ref()
            .ok_or_else(|| "Bible database not loaded. Please ensure lifestone.db is available.".to_string())
    }
}

/// Fallback candidate path finder for `lifestone.db`.
/// Checks executable directory, bundled resource paths, and standard AppData locations.
pub fn find_bible_db_fallback() -> Option<std::path::PathBuf> {
    let mut candidates = Vec::new();

    // 1. Executable parent directory & subdirectories
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            candidates.push(exe_dir.join("lifestone.db"));
            candidates.push(exe_dir.join("_up_").join("data").join("lifestone.db"));
            candidates.push(exe_dir.join("data").join("lifestone.db"));
            candidates.push(exe_dir.join("resources").join("lifestone.db"));
            candidates.push(exe_dir.join("resources").join("_up_").join("data").join("lifestone.db"));
            candidates.push(exe_dir.join("resources").join("data").join("lifestone.db"));
        }
    }

    // 2. User Local AppData
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        let p = std::path::PathBuf::from(local_appdata).join("Lifestone");
        candidates.push(p.join("lifestone.db"));
        candidates.push(p.join("_up_").join("data").join("lifestone.db"));
        candidates.push(p.join("data").join("lifestone.db"));
    }

    // 3. User Roaming AppData
    if let Ok(appdata) = std::env::var("APPDATA") {
        let p1 = std::path::PathBuf::from(&appdata).join("com.lifestone.church");
        candidates.push(p1.join("lifestone.db"));
        let p2 = std::path::PathBuf::from(&appdata).join("Lifestone");
        candidates.push(p2.join("lifestone.db"));
    }

    // 4. Development workspace fallback
    candidates.push(
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../data/lifestone.db")
    );

    for candidate in candidates {
        if candidate.is_file() {
            return Some(candidate);
        }
    }

    None
}
