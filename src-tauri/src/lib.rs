mod commands;
mod events;
mod memstats;
mod state;

use std::sync::Mutex;

#[expect(clippy::too_many_lines, reason = "app setup is inherently complex")]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Mutex::new(state::AppState::new()))
        .manage(Mutex::new(lifestone_detection::DetectionPipeline::new()))
        .manage(Mutex::new(lifestone_broadcast::ndi::NdiRuntime::default()))
        .manage(Mutex::new(lifestone_detection::DirectDetector::new()))
        .manage(Mutex::new(lifestone_detection::DetectionMerger::new()))
        .manage(Mutex::new(lifestone_detection::ReadingMode::new()))
        .manage(Mutex::new(commands::remote::OscRuntime::new()))
        .manage(Mutex::new(commands::remote::HttpRuntime::new()))
        .invoke_handler(tauri::generate_handler![
            commands::bible::list_translations,
            commands::bible::list_books,
            commands::bible::get_chapter,
            commands::bible::get_verse,
            commands::bible::search_verses,
            commands::bible::get_translation_verses_for_search,
            commands::bible::get_cross_references,
            commands::bible::get_active_translation,
            commands::bible::set_active_translation,
            commands::detection::detect_verses,
            commands::detection::detection_status,
            commands::detection::semantic_search,
            commands::detection::toggle_paraphrase_detection,
            commands::detection::reading_mode_status,
            commands::detection::stop_reading_mode,
            commands::audio::get_audio_devices,
            commands::stt::start_transcription,
            commands::stt::stop_transcription,
            commands::broadcast::list_monitors,
            commands::broadcast::ensure_broadcast_window,
            commands::broadcast::open_broadcast_window,
            commands::broadcast::close_broadcast_window,
            commands::broadcast::start_ndi,
            commands::broadcast::stop_ndi,
            commands::broadcast::get_ndi_status,
            commands::broadcast::push_ndi_frame,
            commands::broadcast::push_to_ppt,
            commands::broadcast::clear_ppt_verse,
            commands::broadcast::get_ppt_status,
            commands::remote::start_osc,
            commands::remote::stop_osc,
            commands::remote::get_osc_status,
            commands::remote::start_http,
            commands::remote::stop_http,
            commands::remote::get_http_status,
            commands::remote::update_remote_status,
        ])
        .setup(|app| {
            use tauri::Manager;

            memstats::spawn();

            let db_path = app
                .path()
                .resource_dir()
                .map(|p| p.join("lifestone.db"))
                .ok()
                .filter(|p| p.exists())
                .unwrap_or_else(|| {
                    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                        .join("../data/lifestone.db")
                });

            if db_path.exists() {
                let bible_db = lifestone_bible::BibleDb::open(&db_path)
                    .expect("Failed to open Bible database");

                let managed_state = app.state::<Mutex<state::AppState>>();
                let mut state = managed_state.lock().unwrap();
                state.bible_db = Some(bible_db);
                drop(state);
                log::info!("Bible database loaded from {}", db_path.display());
            } else {
                log::warn!("Bible database not found at {}", db_path.display());
            }

            let base_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
            let model_path = {
                let minilm = base_dir.join("models/minilm-onnx/onnx/model.onnx");
                if minilm.exists() {
                    log::info!("[ONNX] Using MiniLM embedding model: {}", minilm.display());
                    minilm
                } else {
                    let int8 = base_dir.join("models/qwen3-embedding-0.6b-int8/model_quantized.onnx");
                    let fp32 = base_dir.join("models/qwen3-embedding-0.6b/model.onnx");
                    if int8.exists() {
                        log::info!("[ONNX] Using INT8 quantized ONNX model");
                        int8
                    } else if fp32.exists() {
                        log::info!("[ONNX] Using FP32 ONNX model (INT8 not found)");
                        fp32
                    } else {
                        log::info!("[ONNX] Using FP32 ONNX model (INT8 not found)");
                        fp32
                    }
                }
            };
            let tokenizer_path = base_dir.join("models/qwen3-embedding-0.6b/tokenizer.json");
            let embeddings_path = base_dir.join("embeddings/kjv-qwen3-0.6b.bin");
            let ids_path = base_dir.join("embeddings/kjv-qwen3-0.6b-ids.bin");

            if model_path.exists() && tokenizer_path.exists() {
                use lifestone_detection::semantic::embedder::TextEmbedder;
                use lifestone_detection::semantic::index::VectorIndex;
                match lifestone_detection::OnnxEmbedder::load(&model_path, &tokenizer_path) {
                    Ok(embedder) => {
                        log::info!("ONNX embedding model loaded");
                        let managed_pipeline = app.state::<Mutex<lifestone_detection::DetectionPipeline>>();
                        let mut pipeline = managed_pipeline.lock().unwrap();

                        if embeddings_path.exists() && ids_path.exists() {
                            let dim = embedder.dimension();
                            match lifestone_detection::HnswVectorIndex::load(&embeddings_path, &ids_path, dim) {
                                Ok(index) => {
                                    log::info!("Verse embeddings loaded ({} vectors)", index.len());
                                    pipeline.set_semantic(
                                        lifestone_detection::SemanticDetector::new(
                                            Box::new(embedder),
                                            Box::new(index),
                                        ),
                                    );
                                }
                                Err(e) => {
                                    log::warn!("Failed to load verse embeddings: {e}");
                                }
                            }
                        } else {
                            log::info!("No pre-computed verse embeddings found. Run 'bun run export:verses' then the precompute binary.");
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to load ONNX model: {e}");
                    }
                }
            } else {
                log::info!("ONNX model not found. Semantic search disabled. Run 'bun run download:model' to download.");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}