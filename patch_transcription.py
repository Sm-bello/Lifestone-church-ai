with open('src/hooks/use-transcription.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add model to the invoke call
old_invoke = '''await invoke("start_transcription", {
        apiKey:
          settings.sttProvider === "deepgram"
            ? (settings.deepgramApiKey ?? "")
            : "",
        deviceId: settings.audioDeviceId,
        gain: settings.gain,
        provider: settings.sttProvider,
      })'''

new_invoke = '''await invoke("start_transcription", {
        apiKey:
          settings.sttProvider === "deepgram"
            ? (settings.deepgramApiKey ?? "")
            : "",
        deviceId: settings.audioDeviceId,
        gain: settings.gain,
        provider: settings.sttProvider,
        model: settings.sttProvider === "whisper" ? settings.whisperModel : null,
      })'''

content = content.replace(old_invoke, new_invoke)

with open('src/hooks/use-transcription.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ use-transcription.ts patched')
