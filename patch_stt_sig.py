
import sys

path = r'C:\Users\User\lifestone\src-tauri\src\commands\stt.rs'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Build the search strings piece by piece to avoid angle bracket issues
mutex_single = 'Mutex<AppState>'
mutex_double = 'Mutex<<AppState>>'

base_old = '''pub async fn start_transcription(
    app: AppHandle,
    state: State<'_, '''

base_new = '''pub async fn start_transcription(
    app: AppHandle,
    state: State<'_, '''

suffix_old = '''>,
    api_key: String,
    device_id: Option<String>,
    gain: Option<f32>,'''

suffix_new = '''>,
    api_key: String,
    device_id: Option<String>,
    gain: Option<f32>,
    model: Option<String>,'''

# Try single angle brackets first
old_sig = base_old + mutex_single + suffix_old
new_sig = base_new + mutex_single + suffix_new

if old_sig not in content:
    # Try double angle brackets
    old_sig = base_old + mutex_double + suffix_old
    new_sig = base_new + mutex_double + suffix_new

if old_sig in content:
    content = content.replace(old_sig, new_sig)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed function signature - added model parameter')
else:
    print('ERROR: Could not find function signature to patch')
    print('Searching for start_transcription...')
    for i, line in enumerate(content.split(chr(10))):
        if 'start_transcription' in line:
            print(f'Line {i}: {line}')
