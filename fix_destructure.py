with open('src/components/settings-dialog.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The actual file uses 2-space indent
old_destructure = """  const {
    sttProvider,
    setSttProvider,
    deepgramApiKey,
    setDeepgramApiKey,
  } = useSettingsStore()"""

new_destructure = """  const {
    sttProvider,
    setSttProvider,
    deepgramApiKey,
    setDeepgramApiKey,
    whisperModel,
    setWhisperModel,
  } = useSettingsStore()"""

if old_destructure in content:
    content = content.replace(old_destructure, new_destructure)
    print('✅ Fixed destructuring')
else:
    print('❌ Could not find destructuring')

with open('src/components/settings-dialog.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
