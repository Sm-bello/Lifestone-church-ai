/**
 * Verifies the Nigerian-accented Whisper GGML model (NCAIR1) for local speech-to-text.
 *
 * Model: ggml-nigerian.bin (~465MB)
 * Fine-tuned for Nigerian English accent detection and offline scripture speech recognition.
 *
 * Run: bun run download:whisper
 */

import { join } from "node:path"
import { existsSync, mkdirSync } from "node:fs"

const PROJECT_ROOT = join(import.meta.dir, "..")
const MODELS_DIR = join(PROJECT_ROOT, "models", "whisper")
const MODEL_FILE = "ggml-nigerian.bin"
const MODEL_PATH = join(MODELS_DIR, MODEL_FILE)

async function main() {
  mkdirSync(MODELS_DIR, { recursive: true })

  if (existsSync(MODEL_PATH)) {
    console.log(`✅ Nigerian Whisper model ready: ${MODEL_PATH}`)
    return
  }

  console.log(`⚠️  Nigerian model not found at ${MODEL_PATH}.`)
  console.log(`   Ensure models/whisper/ggml-nigerian.bin is present in the repository.`)
}

main().catch((e) => {
  console.error("Verification failed:", e)
  process.exit(1)
})
