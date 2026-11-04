// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
fn is_avx_supported() -> bool {
    #[cfg(target_arch = "x86_64")]
    {
        std::is_x86_feature_detected!("avx")
    }
    #[cfg(not(target_arch = "x86_64"))]
    {
        true
    }
}

#[cfg(target_os = "windows")]
fn configure_windows_compatibility() {
    let args: Vec<String> = std::env::args().collect();
    let force_safe_mode = args.iter().any(|a| a == "--safe-mode" || a == "--disable-gpu");
    let lacks_avx = !is_avx_supported();

    // If running on a low-power CPU (like Pentium/Celeron without AVX) or if explicitly requested,
    // configure Microsoft Edge WebView2 to use safe software rendering.
    // This prevents GPU process hangs and crashes on legacy Intel HD Graphics (Gen7/Gen8).
    if lacks_avx || force_safe_mode {
        let current = std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").unwrap_or_default();
        if !current.contains("--disable-gpu") {
            let flags = format!("{current} --disable-gpu --disable-gpu-compositing --disable-d3d11")
                .trim()
                .to_string();
            std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", flags);
        }
    }
}

#[cfg(target_os = "windows")]
fn show_error_dialog(title: &str, message: &str) {
    use std::os::windows::ffi::OsStrExt;
    let wide_title: Vec<u16> = std::ffi::OsStr::new(title)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let wide_msg: Vec<u16> = std::ffi::OsStr::new(message)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    extern "system" {
        fn MessageBoxW(
            hwnd: *mut std::ffi::c_void,
            lpText: *const u16,
            lpCaption: *const u16,
            uType: u32,
        ) -> i32;
    }

    unsafe {
        const MB_OK: u32 = 0x0000_0000;
        const MB_ICONERROR: u32 = 0x0000_0010;
        MessageBoxW(
            std::ptr::null_mut(),
            wide_msg.as_ptr(),
            wide_title.as_ptr(),
            MB_OK | MB_ICONERROR,
        );
    }
}

fn main() {
    // 1. Custom panic hook for transparent crash diagnosis
    std::panic::set_hook(Box::new(|panic_info| {
        let msg = format!("{panic_info}");
        eprintln!("[FATAL PANIC] {msg}");

        #[cfg(target_os = "windows")]
        {
            if let Ok(appdata) = std::env::var("APPDATA") {
                let log_dir = std::path::PathBuf::from(appdata).join("Lifestone");
                let _ = std::fs::create_dir_all(&log_dir);
                let log_path = log_dir.join("crash.log");
                let _ = std::fs::write(
                    &log_path,
                    format!("Crash Time: {:?}\nDetails: {}\n", std::time::SystemTime::now(), msg),
                );
            }

            let advice = if !is_avx_supported() {
                "\n\nNote: Your processor does not support AVX instructions (e.g. Intel Pentium, Celeron, or legacy CPU). Please install 'Lifestone Lite / Compatibility Edition' from our website."
            } else {
                ""
            };

            show_error_dialog(
                "Lifestone Startup Error",
                &format!(
                    "Lifestone encountered an unexpected error:\n\n{}{}\n\nA crash report has been saved to %APPDATA%\\Lifestone\\crash.log.",
                    msg, advice
                ),
            );
        }
    }));

    // 2. Automated Compatibility Guard for Legacy / Budget CPUs
    #[cfg(target_os = "windows")]
    configure_windows_compatibility();

    lifestone_lib::run();
}
