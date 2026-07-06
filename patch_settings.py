with open('src/stores/settings-store.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add whisperModel to interface
content = content.replace(
    'sttProvider: SttProvider\n\n  setDeepgramApiKey',
    'sttProvider: SttProvider\n  whisperModel: string\n\n  setDeepgramApiKey'
)

content = content.replace(
    'setSttProvider: (provider: SttProvider) => void\n}',
    'setSttProvider: (provider: SttProvider) => void\n  setWhisperModel: (model: string) => void\n}'
)

# Add default value
content = content.replace(
    'sttProvider: "whisper",\n\n  setDeepgramApiKey',
    'sttProvider: "whisper",\n  whisperModel: "ggml-large-v3-turbo-q8_0.bin",\n\n  setDeepgramApiKey'
)

# Add setter
content = content.replace(
    'setSttProvider: (sttProvider) => set({ sttProvider }),\n})',
    'setSttProvider: (sttProvider) => set({ sttProvider }),\n  setWhisperModel: (whisperModel) => set({ whisperModel }),\n})'
)

with open('src/stores/settings-store.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ settings-store.ts patched')
