//! Local Whisper STT provider using whisper.cpp via whisper-rs.
//!
//! Processes audio through VAD to detect speech boundaries, accumulates short
//! clips across natural pauses, then runs Whisper inference. Emits the same
//! [`TranscriptEvent`] types as the cloud provider.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use crossbeam_channel::Receiver;
use tokio::sync::mpsc;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperState};

use crate::error::SttError;
use crate::provider::SttProvider;
use crate::types::{TranscriptEvent, Word};

// =============================================================================
// CONFIGURATION
// =============================================================================

/// Maximum audio buffer before force-flushing (10 seconds at 16 kHz).
const MAX_BUFFER_SAMPLES: usize = 16_000 * 10;

/// Minimum audio buffer for inference (0.5 seconds).
/// Whisper small handles 0.5s fine; the "input is too short" warning is non-fatal.
const MIN_BUFFER_SAMPLES: usize = 16_000 / 2;

/// Very short clips below this are permanently discarded as noise (0.15s).
const SHORT_CLIP_THRESHOLD: usize = 16_000 * 15 / 100;

/// If a short clip arrives within this window of a previous one, accumulate it.
const SHORT_CLIP_TIMEOUT_MS: u64 = 3_000;

/// Sample rate expected by Whisper.
const SAMPLE_RATE: usize = 16_000;

// =============================================================================
// HELPERS
// =============================================================================

fn i16_to_f32(samples: &[i16]) -> Vec<f32> {
    samples.iter().map(|&s| f32::from(s) / 32768.0).collect()
}

#[expect(
    clippy::cast_precision_loss,
    reason = "timestamps and word counts are small enough"
)]
fn extract_segments(state: &WhisperState) -> (String, Vec<Word>, f64) {
    let n_segments = state.full_n_segments();
    let mut full_text = String::new();
    let mut words = Vec::new();
    let mut total_confidence: f64 = 0.0;

    for i in 0..n_segments {
        let Some(segment) = state.get_segment(i) else {
            continue;
        };
        let text = segment.to_str_lossy().unwrap_or_default().to_string();
        if text.is_empty() {
            continue;
        }

        // whisper-rs returns timestamps in MILLISECONDS, not centiseconds.
        let start_sec = segment.start_timestamp() as f64 / 1000.0;
        let end_sec = segment.end_timestamp() as f64 / 1000.0;
        let confidence = 0.9;

        let n_words = text.split_whitespace().count();
        if n_words > 0 {
            let duration_per_word = (end_sec - start_sec).max(0.01) / n_words as f64;
            for (j, word_text) in text.split_whitespace().enumerate() {
                let w_start = start_sec + (j as f64 * duration_per_word);
                let w_end = w_start + duration_per_word;
                words.push(Word {
                    text: word_text.to_lowercase(),
                    start: w_start,
                    end: w_end,
                    confidence,
                    punctuated_word: Some(word_text.to_string()),
                });
            }
        }

        if !full_text.is_empty() {
            full_text.push(' ');
        }
        full_text.push_str(&text);
        total_confidence += confidence;
    }

    let avg_confidence = if n_segments > 0 {
        total_confidence / f64::from(n_segments)
    } else {
        0.0
    };

    (full_text.trim().to_string(), words, avg_confidence)
}

// =============================================================================
// SHORT-CLIP ACCUMULATOR
// =============================================================================

/// Holds a speech segment that was too short, waiting to see if more speech
/// arrives quickly (e.g. a pause between words in a sentence).
struct SpeechAccumulator {
    samples: Vec<i16>,
    last_update: Instant,
}

impl SpeechAccumulator {
    fn new(samples: Vec<i16>) -> Self {
        Self {
            samples,
            last_update: Instant::now(),
        }
    }

    fn is_stale(&self) -> bool {
        self.last_update.elapsed().as_millis() > u128::from(SHORT_CLIP_TIMEOUT_MS)
    }

    fn len(&self) -> usize {
        self.samples.len()
    }

    fn take(&mut self) -> Vec<i16> {
        std::mem::take(&mut self.samples)
    }

    fn prepend_to(&mut self, buffer: &mut Vec<i16>) {
        if !self.samples.is_empty() {
            let mut combined = std::mem::take(&mut self.samples);
            combined.extend_from_slice(buffer);
            *buffer = combined;
        }
    }
}

// =============================================================================
// PROVIDER
// =============================================================================

pub struct WhisperProvider {
    model_path: PathBuf,
    language: Option<String>,
    n_threads: i32,
    cancelled: Arc<AtomicBool>,
}

impl WhisperProvider {
    pub fn new(model_path: PathBuf, language: Option<String>, n_threads: i32) -> Self {
        Self {
            model_path,
            language,
            n_threads: n_threads.max(1),
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }
}

impl std::fmt::Debug for WhisperProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("WhisperProvider")
            .field("model_path", &self.model_path)
            .field("language", &self.language)
            .field("n_threads", &self.n_threads)
            .finish_non_exhaustive()
    }
}

#[async_trait::async_trait]
impl SttProvider for WhisperProvider {
    #[expect(
        clippy::too_many_lines,
        reason = "spawns two blocking tasks; splitting would obscure the pipeline"
    )]
    async fn start(
        &self,
        audio_rx: Receiver<Vec<i16>>,
        event_tx: mpsc::Sender<TranscriptEvent>,
    ) -> Result<(), SttError> {
        if !self.model_path.exists() {
            return Err(SttError::ModelNotFound(format!(
                "Whisper model not found: {}",
                self.model_path.display()
            )));
        }

        let model_size_mb = std::fs::metadata(&self.model_path)
            .map(|m| m.len() / 1024 / 1024)
            .unwrap_or(0);

        log::info!(
            "[Whisper] Loading model from: {} (size: {} MB)",
            self.model_path.display(),
            model_size_mb
        );

        let _ = event_tx.send(TranscriptEvent::Connected).await;

        let model_path = self.model_path.clone();
        let language = self.language.clone();
        let n_threads = self.n_threads;
        let cancelled = self.cancelled.clone();

        // Larger channel so VAD never blocks waiting for inference.
        let (inference_tx, mut inference_rx) = mpsc::channel::<Vec<i16>>(16);

        // ---------------------------------------------------------------------
        // Task 1: VAD + audio accumulation
        // ---------------------------------------------------------------------
        let vad_cancelled = cancelled.clone();
        let vad_event_tx = event_tx.clone();
        let vad_handle = tokio::task::spawn_blocking({
            let inference_tx = inference_tx.clone();
            move || {
                use lifestone_audio::{AudioFrame, Vad, VadConfig, VadTransition};

                let vad_config = VadConfig {
                    silence_threshold: 0.015,
                    frame_threshold: 0.008,
                    overall_threshold: 0.08,
                    silence_frame_count: 25,   // ~1.6s silence to end
                    min_voice_frames: 10,      // ~0.6s voice to start
                    max_utterance_frames: 375, // ~24s max
                    pre_buffer_frames: 6,      // ~0.4s pre-buffer
                };

                log::info!(
                    "[VAD] Config: silence_threshold={}, frame_threshold={}, \
                     min_voice_frames={}, silence_frame_count={}",
                    vad_config.silence_threshold,
                    vad_config.frame_threshold,
                    vad_config.min_voice_frames,
                    vad_config.silence_frame_count
                );

                let mut vad = Vad::new(vad_config);
                let mut audio_buffer: Vec<i16> = Vec::new();
                let mut pending_short: Option<SpeechAccumulator> = None;
                let mut frames_seen: u64 = 0;

                let send_buffer = |buf: Vec<i16>, tx: &mpsc::Sender<Vec<i16>>| {
                    if buf.len() >= MIN_BUFFER_SAMPLES {
                        let dur = buf.len() as f64 / SAMPLE_RATE as f64;
                        log::info!(
                            "[VAD] Flushing {} samples ({:.2}s) to inference",
                            buf.len(),
                            dur
                        );
                        let _ = tx.blocking_send(buf);
                        true
                    } else {
                        false
                    }
                };

                loop {
                    if vad_cancelled.load(Ordering::SeqCst) {
                        // Flush any accumulated audio before shutting down.
                        if let Some(mut acc) = pending_short.take() {
                            audio_buffer.extend(acc.take());
                        }
                        if !audio_buffer.is_empty() {
                            let dur = audio_buffer.len() as f64 / SAMPLE_RATE as f64;
                            log::info!(
                                "[VAD] Shutdown flush: {} samples ({:.2}s)",
                                audio_buffer.len(),
                                dur
                            );
                            let _ = inference_tx.blocking_send(std::mem::take(&mut audio_buffer));
                        }
                        break;
                    }

                    match audio_rx.recv_timeout(Duration::from_millis(50)) {
                        Ok(samples) => {
                            let frame = AudioFrame {
                                samples,
                                timestamp_ms: 0,
                            };
                            let result = vad.process(&frame);

                            if let Some(transition) = result.transition {
                                match transition {
                                    VadTransition::SpeechStarted => {
                                        // If we have a recent short clip, prepend it.
                                        if let Some(ref mut acc) = pending_short {
                                            if !acc.is_stale() {
                                                log::debug!(
                                                    "[VAD] Prepending {} short samples to new speech",
                                                    acc.len()
                                                );
                                                acc.prepend_to(&mut audio_buffer);
                                            } else {
                                                log::debug!(
                                                    "[VAD] Stale short clip ({} ms old), discarding",
                                                    acc.last_update.elapsed().as_millis()
                                                );
                                                pending_short = None;
                                            }
                                        }

                                        let _ = vad_event_tx
                                            .blocking_send(TranscriptEvent::SpeechStarted);
                                    }
                                    VadTransition::SpeechEnded => {
                                        let dur = audio_buffer.len() as f64 / SAMPLE_RATE as f64;
                                        log::info!(
                                            "[VAD] SpeechEnded: buffer={} samples ({:.2}s)",
                                            audio_buffer.len(),
                                            dur
                                        );

                                        if audio_buffer.len() >= MIN_BUFFER_SAMPLES {
                                            // Normal utterance — send immediately.
                                            let _ = inference_tx
                                                .blocking_send(std::mem::take(&mut audio_buffer));
                                            pending_short = None;
                                        } else if audio_buffer.len() >= SHORT_CLIP_THRESHOLD {
                                            // Too short for inference now, but might be part of a
                                            // longer phrase. Hold it.
                                            log::warn!(
                                                "[VAD] Holding short clip: {} samples ({:.2}s) \
                                                 — waiting for more speech",
                                                audio_buffer.len(),
                                                dur
                                            );
                                            pending_short =
                                                Some(SpeechAccumulator::new(std::mem::take(
                                                    &mut audio_buffer,
                                                )));
                                        } else {
                                            // Noise click — discard.
                                            log::warn!(
                                                "[VAD] Discarding noise: {} samples ({:.2}s)",
                                                audio_buffer.len(),
                                                dur
                                            );
                                            audio_buffer.clear();
                                            pending_short = None;
                                        }
                                    }
                                }
                            }

                            for frame in result.frames {
                                audio_buffer.extend_from_slice(&frame.samples);
                                frames_seen += 1;
                            }

                            if frames_seen % 50 == 0 && !audio_buffer.is_empty() {
                                log::debug!(
                                    "[VAD] Buffer growing: {} samples ({:.1}s)",
                                    audio_buffer.len(),
                                    audio_buffer.len() as f64 / SAMPLE_RATE as f64,
                                );
                            }

                            // Force flush if buffer grows too large.
                            if audio_buffer.len() >= MAX_BUFFER_SAMPLES {
                                let dur = audio_buffer.len() as f64 / SAMPLE_RATE as f64;
                                log::warn!(
                                    "[VAD] MAX_BUFFER forced flush: {} samples ({:.1}s)",
                                    audio_buffer.len(),
                                    dur,
                                );
                                if let Some(mut acc) = pending_short.take() {
                                    audio_buffer.extend(acc.take());
                                }
                                let _ = inference_tx
                                    .blocking_send(std::mem::take(&mut audio_buffer));
                            }
                        }
                        Err(crossbeam_channel::RecvTimeoutError::Timeout) => {
                            // If we've been idle and have a pending short clip that's now stale,
                            // flush it if it meets minimum, otherwise discard.
                            if let Some(ref acc) = pending_short {
                                if acc.is_stale() {
                                    let mut buf = pending_short.take().unwrap().take();
                                    if buf.len() >= MIN_BUFFER_SAMPLES {
                                        let dur = buf.len() as f64 / SAMPLE_RATE as f64;
                                        log::info!(
                                            "[VAD] Stale short clip now meets min: {} samples ({:.2}s)",
                                            buf.len(),
                                            dur
                                        );
                                        let _ = inference_tx.blocking_send(buf);
                                    } else {
                                        log::warn!(
                                            "[VAD] Stale short clip discarded: {} samples ({:.2}s)",
                                            buf.len(),
                                            buf.len() as f64 / SAMPLE_RATE as f64
                                        );
                                    }
                                    pending_short = None;
                                }
                            }
                        }
                        Err(crossbeam_channel::RecvTimeoutError::Disconnected) => {
                            if let Some(mut acc) = pending_short.take() {
                                audio_buffer.extend(acc.take());
                            }
                            if !audio_buffer.is_empty() {
                                let _ = inference_tx
                                    .blocking_send(std::mem::take(&mut audio_buffer));
                            }
                            break;
                        }
                    }
                }

                // Critical: drop the sender so the inference task exits cleanly.
                drop(inference_tx);
                log::info!("[VAD] Task exiting");
            }
        });

        // ---------------------------------------------------------------------
        // Task 2: Whisper inference
        // ---------------------------------------------------------------------
        let inf_cancelled = cancelled.clone();
        let inf_event_tx = event_tx.clone();
        let inf_handle = tokio::task::spawn_blocking(move || {
            log::info!("[Whisper] Loading GGML from: {}", model_path.display());

            let ctx = match WhisperContext::new_with_params(
                &model_path,
                WhisperContextParameters::default(),
            ) {
                Ok(ctx) => ctx,
                Err(e) => {
                    log::error!("[Whisper] Failed to load model: {e}");
                    let _ = inf_event_tx.blocking_send(TranscriptEvent::Error(format!(
                        "Failed to load Whisper model: {e}"
                    )));
                    return;
                }
            };

            let mut state = match ctx.create_state() {
                Ok(s) => s,
                Err(e) => {
                    log::error!("[Whisper] Failed to create state: {e}");
                    let _ = inf_event_tx.blocking_send(TranscriptEvent::Error(format!(
                        "Failed to create Whisper state: {e}"
                    )));
                    return;
                }
            };

            log::info!("[Whisper] Model loaded, ready for inference");

            let is_nigerian = model_path
                .file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.contains("nigerian") || s.contains("ncair"))
                .unwrap_or(false);

            if is_nigerian {
                log::info!(
                    "[Whisper] NCAIR1 model detected — auto-language + context mode"
                );
            } else {
                log::info!("[Whisper] Standard model — forced English");
            }

            let mut utterance_count: u64 = 0;

            while let Some(audio_i16) = inference_rx.blocking_recv() {
                if inf_cancelled.load(Ordering::SeqCst) {
                    log::info!("[Whisper] Cancellation received, exiting");
                    break;
                }

                let audio_f32 = i16_to_f32(&audio_i16);
                let duration_s = audio_i16.len() as f64 / SAMPLE_RATE as f64;
                utterance_count += 1;

                let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

                if is_nigerian {
                    params.set_language(None);
                    params.set_translate(false);
                    params.set_no_context(false);
                    params.set_single_segment(true);
                } else {
                    params.set_language(Some(language.as_deref().unwrap_or("en")));
                    params.set_single_segment(false);
                }

                // Tuned for sermon content; make this configurable for non-religious use.
                params.set_initial_prompt(
                    "Genesis Exodus Leviticus Numbers Deuteronomy Joshua Judges Ruth \
                     Samuel Kings Chronicles Ezra Nehemiah Esther Job Psalms Proverbs \
                     Ecclesiastes Isaiah Jeremiah Lamentations Ezekiel Daniel Hosea Joel \
                     Amos Obadiah Jonah Micah Nahum Habakkuk Zephaniah Haggai Zechariah \
                     Malachi Matthew Mark Luke John Acts Romans Corinthians Galatians \
                     Ephesians Philippians Colossians Thessalonians Timothy Titus Philemon \
                     Hebrews James Peter Jude Revelation chapter verse verses scripture biblical"
                );

                params.set_n_threads(n_threads);
                params.set_print_progress(false);
                params.set_print_special(false);
                params.set_print_realtime(false);
                params.set_token_timestamps(true);
                params.set_no_speech_thold(0.3); // Was 0.6 — too aggressive for short clips
                params.set_suppress_blank(true);
                params.set_suppress_nst(true);

                log::info!(
                    "[Whisper] #{utterance_count}: Running inference on {:.2}s audio...",
                    duration_s
                );

                let start = Instant::now();
                if let Err(e) = state.full(params, &audio_f32) {
                    log::error!("[Whisper] Inference error: {e}");
                    let _ = inf_event_tx.blocking_send(TranscriptEvent::Error(format!(
                        "Whisper inference error: {e}"
                    )));
                    continue;
                }
                let elapsed = start.elapsed();

                let (text, words, confidence) = extract_segments(&state);

                if text.is_empty() {
                    log::warn!(
                        "[Whisper] #{utterance_count}: Empty transcript for {:.2}s audio",
                        duration_s
                    );
                    let _ = inf_event_tx.blocking_send(TranscriptEvent::UtteranceEnd);
                    continue;
                }

                log::info!(
                    "[Whisper] #{utterance_count}: {:.2}s -> \"{}\" (took {:?}, {} words, conf={:.2})",
                    duration_s,
                    text,
                    elapsed,
                    words.len(),
                    confidence
                );

                let _ = inf_event_tx.blocking_send(TranscriptEvent::Final {
                    transcript: text,
                    words,
                    confidence,
                    speech_final: true,
                });

                let _ = inf_event_tx.blocking_send(TranscriptEvent::UtteranceEnd);
            }

            log::info!("[Whisper] Inference task exiting");
        });

        // Wait for both tasks; if one panics, we still try to shut down cleanly.
        let _ = tokio::try_join!(vad_handle, inf_handle);
        let _ = event_tx.send(TranscriptEvent::Disconnected).await;

        Ok(())
    }

    fn stop(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }

    fn name(&self) -> &'static str {
        "whisper"
    }
}