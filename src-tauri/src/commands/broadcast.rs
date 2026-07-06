#![expect(clippy::needless_pass_by_value, reason = "Tauri command extractors require pass-by-value")]

use std::sync::Mutex;

use base64::Engine;
use serde::{Deserialize, Serialize};
use tauri::State;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use lifestone_broadcast::ndi::{NdiRuntime, NdiSessionInfo, NdiStartRequest};

/// Map `output_id` ("main" | "alt") to Tauri window label.
fn window_label(output_id: &str) -> &'static str {
    match output_id {
        "alt" => "broadcast-alt",
        _ => "broadcast",
    }
}

/// Map `output_id` to broadcast-output.html URL with query param.
fn window_url(output_id: &str) -> String {
    format!("broadcast-output.html?output={output_id}")
}

#[derive(Serialize)]
pub struct MonitorInfo {
    pub name: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NdiFrameRequest {
    pub output_id: String,
    pub width: u32,
    pub height: u32,
    pub rgba_base64: String,
}

#[tauri::command]
pub fn list_monitors(app: tauri::AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    Ok(monitors
        .iter()
        .map(|m| {
            let size = m.size();
            MonitorInfo {
                name: m.name().cloned().unwrap_or_else(|| "Unknown".to_string()),
                width: size.width,
                height: size.height,
            }
        })
        .collect())
}

/// Ensure the broadcast window for a given output exists (creates hidden if not).
#[tauri::command]
pub fn ensure_broadcast_window(app: tauri::AppHandle, output_id: String) -> Result<(), String> {
    let label = window_label(&output_id);
    if app.get_webview_window(label).is_some() {
        return Ok(());
    }
    WebviewWindowBuilder::new(
        &app,
        label,
        WebviewUrl::App(window_url(&output_id).into()),
    )
    .title(if output_id == "alt" { "Lifestone NDI Alt" } else { "Lifestone NDI" })
    .inner_size(1920.0, 1080.0)
    .visible(false)
    .skip_taskbar(true)
    .focused(false)
    .build()
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_broadcast_window(
    app: tauri::AppHandle,
    output_id: String,
    monitor_index: usize,
) -> Result<(), String> {
    let label = window_label(&output_id);
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let monitor = monitors
        .get(monitor_index)
        .ok_or_else(|| format!("Monitor index {monitor_index} out of range"))?;

    let pos = monitor.position();
    let size = monitor.size();

    // If window already exists (e.g. hidden for NDI), reuse it
    if let Some(window) = app.get_webview_window(label) {
        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: pos.x,
                y: pos.y,
            }))
            .map_err(|e| e.to_string())?;
        window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: size.width,
                height: size.height,
            }))
            .map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let title = if output_id == "alt" {
        "Projector - Alt"
    } else {
        "Projector - Program"
    };

    WebviewWindowBuilder::new(
        &app,
        label,
        WebviewUrl::App(window_url(&output_id).into()),
    )
    .title(title)
    .position(f64::from(pos.x), f64::from(pos.y))
    .inner_size(f64::from(size.width), f64::from(size.height))
    .decorations(true)
    .always_on_top(false)
    .skip_taskbar(false)
    .focused(true)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn close_broadcast_window(
    app: tauri::AppHandle,
    output_id: String,
    runtime: State<'_, Mutex<NdiRuntime>>,
) -> Result<(), String> {
    let label = window_label(&output_id);
    if let Some(window) = app.get_webview_window(label) {
        let ndi_active = runtime
            .lock()
            .map_err(|e| e.to_string())?
            .is_active(&output_id);
        if ndi_active {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.close().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn start_ndi(
    output_id: String,
    runtime: State<'_, Mutex<NdiRuntime>>,
    request: NdiStartRequest,
) -> Result<NdiSessionInfo, String> {
    let mut runtime = runtime.lock().map_err(|e| e.to_string())?;
    runtime
        .start(output_id, request)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stop_ndi(output_id: String, runtime: State<'_, Mutex<NdiRuntime>>) -> Result<(), String> {
    let mut runtime = runtime.lock().map_err(|e| e.to_string())?;
    runtime.stop(&output_id);
    Ok(())
}

#[derive(Serialize)]
pub struct NdiStatusResponse {
    pub active: bool,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
}

#[tauri::command]
pub fn get_ndi_status(
    output_id: String,
    runtime: State<'_, Mutex<NdiRuntime>>,
) -> Result<Option<NdiStatusResponse>, String> {
    let runtime = runtime.lock().map_err(|e| e.to_string())?;
    match runtime.current_info(&output_id) {
        Some(info) => Ok(Some(NdiStatusResponse {
            active: true,
            width: info.width,
            height: info.height,
            fps: info.fps,
        })),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn push_ndi_frame(
    runtime: State<'_, Mutex<NdiRuntime>>,
    request: NdiFrameRequest,
) -> Result<(), String> {
    let rgba_data = base64::engine::general_purpose::STANDARD
        .decode(&request.rgba_base64)
        .map_err(|e| format!("base64 decode error: {e}"))?;
    let mut runtime = runtime.lock().map_err(|e| e.to_string())?;
    runtime
        .send_frame_rgba(&request.output_id, request.width, request.height, &rgba_data)
        .map_err(|e| e.to_string())
}
// === PowerPoint COM Sidecar Bridge ===
use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;

const PPT_SIDECAR_HOST: &str = "127.0.0.1";
const PPT_SIDECAR_PORT: u16 = 47832;
const TCP_TIMEOUT_MS: u64 = 3000;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PptVersePayload {
    pub reference: String,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
}

#[tauri::command]
pub fn push_to_ppt(payload: PptVersePayload) -> Result<bool, String> {
    let addr = format!("{}:{}", PPT_SIDECAR_HOST, PPT_SIDECAR_PORT);
    let mut stream = TcpStream::connect_timeout(
        &addr.parse().map_err(|e| format!("Bad address: {e}"))?,
        Duration::from_millis(TCP_TIMEOUT_MS),
    ).map_err(|e| format!("Cannot connect to PPT sidecar: {e}. Is PowerPoint running and the sidecar started?"))?;
    
    let request = serde_json::json!({
        "action": "update",
        "reference": payload.reference,
        "text": payload.text,
        "context": payload.context.as_deref().unwrap_or(""),
    });
    
    let request_bytes = request.to_string() + "\n";
    stream.write_all(request_bytes.as_bytes()).map_err(|e| format!("Failed to send: {e}"))?;
    
    let mut response = String::new();
    stream.read_to_string(&mut response).map_err(|e| format!("Failed to read: {e}"))?;
    
    let parsed: serde_json::Value = serde_json::from_str(&response).map_err(|e| format!("Invalid response: {e}"))?;
    Ok(parsed.get("ok").and_then(|v| v.as_bool()).unwrap_or(false))
}

#[tauri::command]
pub fn clear_ppt_verse() -> Result<bool, String> {
    let addr = format!("{}:{}", PPT_SIDECAR_HOST, PPT_SIDECAR_PORT);
    let mut stream = TcpStream::connect_timeout(
        &addr.parse().map_err(|e| format!("Bad address: {e}"))?,
        Duration::from_millis(TCP_TIMEOUT_MS),
    ).map_err(|e| format!("Sidecar not available: {e}"))?;
    
    let request = serde_json::json!({"action": "clear"});
    stream.write_all((request.to_string() + "\n").as_bytes()).map_err(|e| format!("Send failed: {e}"))?;
    
    let mut response = String::new();
    stream.read_to_string(&mut response).ok();
    Ok(true)
}

#[tauri::command]
pub fn get_ppt_status() -> Result<bool, String> {
    let addr = format!("{}:{}", PPT_SIDECAR_HOST, PPT_SIDECAR_PORT);
    let mut stream = match TcpStream::connect_timeout(
        &addr.parse().map_err(|e| format!("Bad address: {e}"))?,
        Duration::from_millis(1000),
    ) {
        Ok(s) => s,
        Err(_) => return Ok(false),
    };
    
    let request = serde_json::json!({"action": "health"});
    stream.write_all((request.to_string() + "\n").as_bytes()).map_err(|e| e.to_string())?;
    
    let mut response = String::new();
    stream.read_to_string(&mut response).ok();
    let parsed: serde_json::Value = serde_json::from_str(&response).unwrap_or_default();
    Ok(parsed.get("ok").and_then(|v| v.as_bool()).unwrap_or(false))
}
