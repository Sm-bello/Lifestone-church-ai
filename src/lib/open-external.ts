import { invoke } from "@tauri-apps/api/core"
import { openUrl } from "@tauri-apps/plugin-opener"

export async function openExternalUrl(url: string): Promise<void> {
  try {
    await invoke("open_external_url", { url })
    return
  } catch {
    // Fallback if not in Tauri runtime
  }

  try {
    await openUrl(url)
    return
  } catch {
    // Fallback to browser window.open
  }

  window.open(url, "_blank", "noopener,noreferrer")
}
