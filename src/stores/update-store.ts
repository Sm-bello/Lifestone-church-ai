import { create } from "zustand"
import { getVersion } from "@tauri-apps/api/app"
import { compareVersions, normalizeVersion } from "@/lib/semver"
import type { UpdateInfo } from "@/types/update"

const GITHUB_API_LATEST = "https://api.github.com/repos/Sm-bello/Lifestone-church-ai/releases/latest"
const STORAGE_KEY = "lifestone_latest_update"
const FALLBACK_VERSION = "1.0.6"

interface UpdateState {
  currentVersion: string
  latestRelease: UpdateInfo | null
  hasUpdate: boolean
  isChecking: boolean
  lastCheckedAt: number | null
  isDialogOpen: boolean

  // Actions
  checkForUpdates: (silent?: boolean) => Promise<boolean>
  openDialog: () => void
  closeDialog: () => void
  init: () => Promise<void>
}

// Hydrate cached release from localStorage if available
function loadCachedRelease(): UpdateInfo | null {
  try {
    if (typeof localStorage === "undefined") return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UpdateInfo
  } catch {
    return null
  }
}

function saveCachedRelease(release: UpdateInfo | null) {
  try {
    if (typeof localStorage === "undefined") return
    if (release) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(release))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore localStorage errors
  }
}

const initialCached = loadCachedRelease()
const initialHasUpdate = initialCached
  ? compareVersions(initialCached.version, FALLBACK_VERSION) > 0
  : false

export const useUpdateStore = create<UpdateState>((set, get) => ({
  currentVersion: FALLBACK_VERSION,
  latestRelease: initialCached,
  hasUpdate: initialHasUpdate,
  isChecking: false,
  lastCheckedAt: null,
  isDialogOpen: false,

  openDialog: () => set({ isDialogOpen: true }),
  closeDialog: () => set({ isDialogOpen: false }),

  init: async () => {
    let resolvedVersion = FALLBACK_VERSION
    try {
      resolvedVersion = await getVersion()
    } catch {
      // Fallback for non-tauri or test environments
    }

    const cached = get().latestRelease
    const hasUpdate = cached ? compareVersions(cached.version, resolvedVersion) > 0 : false

    set({
      currentVersion: resolvedVersion,
      hasUpdate,
    })

    // Listen to network changes: if user was offline and connects to internet, quietly check
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        void get().checkForUpdates(true)
      })

      // Delayed initial quiet check after app startup
      setTimeout(() => {
        void get().checkForUpdates(true)
      }, 4000)
    }
  },

  checkForUpdates: async (silent = true) => {
    const { isChecking, currentVersion } = get()
    if (isChecking) return false

    // If explicitly offline in browser, silently return without hanging or erroring
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return false
    }

    set({ isChecking: true })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    try {
      const response = await fetch(GITHUB_API_LATEST, {
        signal: controller.signal,
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
        cache: "no-store",
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        set({ isChecking: false, lastCheckedAt: Date.now() })
        return false
      }

      const data = await response.json()
      const rawTag = data.tag_name || ""
      const version = normalizeVersion(rawTag)

      if (!version) {
        set({ isChecking: false, lastCheckedAt: Date.now() })
        return false
      }

      const updateInfo: UpdateInfo = {
        version,
        title: data.name || `Lifestone v${version}`,
        notes: data.body || "",
        publishedAt: data.published_at || new Date().toISOString(),
        releaseUrl: data.html_url || "https://github.com/Sm-bello/Lifestone-church-ai/releases/latest",
        assets: Array.isArray(data.assets)
          ? data.assets.map((a: any) => ({
              name: a.name,
              browser_download_url: a.browser_download_url,
              size: a.size,
            }))
          : [],
      }

      // Check if newer than current running app
      const hasUpdate = compareVersions(version, currentVersion) > 0

      saveCachedRelease(updateInfo)

      set({
        latestRelease: updateInfo,
        hasUpdate,
        isChecking: false,
        lastCheckedAt: Date.now(),
      })

      return hasUpdate
    } catch (e) {
      clearTimeout(timeoutId)
      // Completely swallow network errors so offline experience is 100% undisturbed
      set({ isChecking: false, lastCheckedAt: Date.now() })
      return false
    }
  },
}))
