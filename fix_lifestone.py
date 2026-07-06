#!/usr/bin/env python3
"""
fix_lifestone.py
Run from C:\\Users\\User\\lifestone:
    .venv\\Scripts\\python.exe fix_lifestone.py
"""

import re
import sys
from pathlib import Path

ROOT = Path("src-tauri/src")
STATE_FILE = ROOT / "state.rs"
STT_FILE   = ROOT / "commands/stt.rs"

errors = []

# ─────────────────────────────────────────────────────────────────────────────
# 1. FIX state.rs
#    Problem A: struct AppState is missing `pub whisper_model: String`
#    Problem B: impl AppState::new() has `whisper_model: ...` but the field
#               isn't declared in the struct — the struct needs it added.
# ─────────────────────────────────────────────────────────────────────────────

state_src = STATE_FILE.read_text(encoding="utf-8")

# Check whether whisper_model is already in the struct declaration
struct_block_match = re.search(
    r'pub struct AppState \{(.+?)\}',
    state_src,
    re.DOTALL
)

if not struct_block_match:
    errors.append("state.rs: could not find 'pub struct AppState { ... }'")
else:
    struct_body = struct_block_match.group(1)
    if "whisper_model" not in struct_body:
        # Insert the field before the closing brace of the struct.
        # We do this by finding the last field line and appending after it.
        new_state_src = state_src.replace(
            # The deepgram field is the last one — add whisper_model after it
            "    pub deepgram_api_key: Option<String>,\n}",
            "    pub deepgram_api_key: Option<String>,\n"
            "    /// Whisper model preference: \"base.en\" (fast) or \"large-v3-turbo\" (accurate)\n"
            "    pub whisper_model: String,\n"
            "}"
        )
        if new_state_src == state_src:
            # Try without trailing comma variant
            new_state_src = state_src.replace(
                "    pub deepgram_api_key: Option<String>\n}",
                "    pub deepgram_api_key: Option<String>,\n"
                "    pub whisper_model: String,\n"
                "}"
            )
        if new_state_src == state_src:
            errors.append(
                "state.rs: could not insert whisper_model field — "
                "deepgram_api_key line not found in expected form.\n"
                "  Struct body found:\n" + struct_body
            )
        else:
            state_src = new_state_src
            print("state.rs: added whisper_model field to struct")
    else:
        print("state.rs: struct already has whisper_model field — skipping")

# Fix impl new() — add whisper_model initializer if missing
if "whisper_model:" not in state_src:
    state_src = state_src.replace(
        "            deepgram_api_key: None,\n        }",
        "            deepgram_api_key: None,\n"
        "            whisper_model: \"base.en\".to_string(),\n"
        "        }"
    )
    print("state.rs: added whisper_model initializer in new()")
else:
    print("state.rs: new() already has whisper_model — skipping")

STATE_FILE.write_text(state_src, encoding="utf-8")
print(f"state.rs: written ✓")

# ─────────────────────────────────────────────────────────────────────────────
# 2. FIX stt.rs
#    Problem A: Mutex<<AppState>  →  Mutex<AppState>   (double < is malformed)
#    Problem B: "expected `::`, found `=`" — State<'_, Mutex<<AppState> = app.state()
#               that line has a malformed type annotation with `=` after the type
#    Problem C: __cmd__start_transcription not found — caused by malformed
#               #[tauri::command] attribute on start_transcription (likely
#               async fn vs fn mismatch or the attribute is on wrong item)
# ─────────────────────────────────────────────────────────────────────────────

stt_src = STT_FILE.read_text(encoding="utf-8")
original_stt = stt_src

# Fix all malformed double-angle-bracket generics.
# The file may contain any of these broken forms:
#   Mutex<<AppState>        → Mutex<AppState>
#   Mutex<<AppState>>       → Mutex<AppState>   (unlikely but cover it)
#   Arc<<AtomicBool>        → Arc<AtomicBool>   (if copied from state.rs)
#   State<'_, Mutex<<AppState> = app.state()   → State<'_, Mutex<AppState>>

fixes = [
    # Broken: Mutex<<AppState>  (one < too many, missing closing >)
    (r"Mutex<<AppState>([^>])",  r"Mutex<AppState>\1"),
    # Broken: Mutex<<AppState>> (one < too many, but both closing > present)
    (r"Mutex<<AppState>>",       r"Mutex<AppState>"),
    # Broken: Arc<<AtomicBool>
    (r"Arc<<AtomicBool>([^>])",  r"Arc<AtomicBool>\1"),
    # The `= app.state()` line — the full broken form is:
    #   let app_managed: State<'_, Mutex<<AppState> = app.state();
    # After fixing Mutex<<AppState> above it becomes:
    #   let app_managed: State<'_, Mutex<AppState> = app.state();
    # which is still missing the final > before `=`.
    # Fix: State<'_, Mutex<AppState> = → State<'_, Mutex<AppState>> =
    (r"State<'_, Mutex<AppState> =",  r"State<'_, Mutex<AppState>> ="),
]

for pattern, replacement in fixes:
    new_stt = re.sub(pattern, replacement, stt_src)
    if new_stt != stt_src:
        print(f"stt.rs: applied fix: {pattern!r} → {replacement!r}")
        stt_src = new_stt
    # else: pattern not found, skip silently

# Verify the known-bad string is gone
if "Mutex<<" in stt_src:
    errors.append("stt.rs: still contains 'Mutex<<' after fixes — manual inspection needed")
if "State<'_, Mutex<AppState> =" in stt_src:
    errors.append("stt.rs: still contains broken State<'_, Mutex<AppState> = — check regex")

if stt_src == original_stt:
    print("stt.rs: no changes made (patterns not found — file may already be correct)")
else:
    STT_FILE.write_text(stt_src, encoding="utf-8")
    print("stt.rs: written ✓")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Report
# ─────────────────────────────────────────────────────────────────────────────
print()
if errors:
    print("─── ERRORS (manual fix needed) ─────────────────────────────────")
    for e in errors:
        print(" ✗", e)
    sys.exit(1)
else:
    print("─── All fixes applied ───────────────────────────────────────────")
    print("Now run:")
    print("  cd src-tauri")
    print("  cargo check --workspace 2>&1 | Select-String '^error' | Select -First 10")
