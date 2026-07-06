# ῥῆμα Lifestone

&gt; *"For the word of God is alive and active. Sharper than any double-edged sword."*
&gt; — Hebrews 4:12

**Real-time AI Bible verse detection for the local church.**

Lifestone listens to your sermon, identifies Scripture references in real-time, and instantly projects the full verse to your congregation — no manual lookup, no delay, no distraction from the flow of the Spirit.

---

## What It Does

| Feature | Description |
|---------|-------------|
| 🎙️ **NCAIR1 STT** | Nigerian English speech-to-text via fine-tuned Whisper |
| 🔍 **Semantic Search** | ONNX MiniLM embeddings find verses even from paraphrases |
| 📺 **Live Broadcast** | Image/video backgrounds with scripture overlay |
| 📡 **NDI Output** | Direct to OBS, ProPresenter, or any NDI receiver |
| 🌐 **PocketBase** | Meeting history, verse tracking, YouTube integration |
| ⚡ **Offline-First** | Runs entirely local — no internet needed during service |

---

## Architecture
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Microphone    │────▶│  NCAIR1 Whisper  │────▶│  Verse Detector │
│   (16kHz PCM)   │     │  (GGML, 487MB)   │     │  (ONNX MiniLM)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
│
┌───────────────────────────┘
▼
┌──────────────────┐
│  Broadcast Output │
│  Canvas + NDI    │
└──────────────────┘


---

## Download

| Platform | Installer |
|----------|---------|
| Windows 10+ | [`.exe`](https://github.com/colig-base/rhema-lifestone/releases/latest) |
| Windows (MSI) | [`.msi`](https://github.com/colig-base/rhema-lifestone/releases/latest) |
| macOS 10.13+ | [`.dmg`](https://github.com/colig-base/rhema-lifestone/releases/latest) |

Auto-updates enabled. The app checks for new releases on startup.

---

## Build from Source

```bash
# Clone
git clone https://github.com/Sm-bello/lifestone-church-ai.git
cd lifestone-church-ai

# Install dependencies
bun install

# Development mode
bun run tauri dev

# Production build
bun run build
cd src-tauri
cargo tauri build

