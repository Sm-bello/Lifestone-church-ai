/**
 * Verifies and downloads the high-speed Whisper models for offline speech recognition:
 * - ggml-base.bin (~141MB) — primary transcription model
 * - ggml-tiny.bin (~74MB) — sub-second cascaded command recognition
 *
 * Total bundled size: ~215MB (down from 487MB), running with sub-second response on standard CPU laptops.
 *
 * Run: bun run download:whisper
 */

import { join } from "node:path"
import { existsSync, mkdirSync, createWriteStream } from "node:fs"
import { pipeline } from "node:stream/promises"
import { Readable } from "node:stream"

const PROJECT_ROOT = join(import.meta.dir, "..")
const MODELS_DIR = join(PROJECT_ROOT, "models", "whisper")

const MODELS = [
  {
    name: "ggml-base.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
    desc: "Whisper Base primary model (~141MB)",
  },
  {
    name: "ggml-tiny.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
    desc: "Whisper Tiny fast command model (~74MB)",
  },
]

async function downloadFile(url: string, dest: string, desc: string) {
  console.log(`📥 Downloading ${desc}...`)
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }
  const fileStream = createWriteStream(dest)
  // @ts-expect-error fetch body is compatible stream
  await pipeline(Readable.fromWeb(response.body), fileStream)
  console.log(`✅ Downloaded: ${dest}`)
}

async function main() {
  mkdirSync(MODELS_DIR, { recursive: true })

  for (const model of MODELS) {
    const dest = join(MODELS_DIR, model.name)
    if (existsSync(dest)) {
      console.log(`✅ ${model.desc} is present: ${dest}`)
    } else {
      await downloadFile(model.url, dest, model.desc)
    }
  }
}

main().catch((e) => {
  console.error("Verification/download failed:", e)
  process.exit(1)
})
