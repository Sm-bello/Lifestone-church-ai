with open('src/components/settings-dialog.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the Whisper radio option description and add model selector after RadioGroup
# We insert after the closing </RadioGroup> tag but before the Deepgram conditional

old_section = '''          </RadioGroup>
        </div>

        {/* Deepgram settings — show when deepgram is selected */}'''

new_section = '''          </RadioGroup>
        </div>

        {/* Whisper model selector — show when whisper is selected */}
        {sttProvider === "whisper" && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Whisper Model
            </label>
            <Select
              value={whisperModel}
              onValueChange={(v) => setWhisperModel(v)}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ggml-large-v3-turbo-q8_0.bin">
                  Large v3 Turbo (default) — best accuracy
                </SelectItem>
                <SelectItem value="ggml-nigerian.bin">
                  NCAIR1 — Nigerian accent optimized
                </SelectItem>
                <SelectItem value="ggml-base.en.bin">
                  Base English — fastest, lighter
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[0.625rem] text-muted-foreground">
              Select the model that matches your speaker accent. NCAIR1 is
              fine-tuned for Nigerian English. Base English is fastest but
              less accurate.
            </p>
          </div>
        )}

        {/* Deepgram settings — show when deepgram is selected */}'''

content = content.replace(old_section, new_section)

# Add whisperModel to the destructured constants in SpeechSection
content = content.replace(
    '''const {
      sttProvider,
      setSttProvider,
      deepgramApiKey,
      setDeepgramApiKey,
    } = useSettingsStore()''',
    '''const {
      sttProvider,
      setSttProvider,
      deepgramApiKey,
      setDeepgramApiKey,
      whisperModel,
      setWhisperModel,
    } = useSettingsStore()'''
)

with open('src/components/settings-dialog.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ settings-dialog.tsx patched')
