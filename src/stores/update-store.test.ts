import { beforeEach, describe, expect, it, vi } from "vitest"
import { useUpdateStore } from "./update-store"

const storageMap = new Map<string, string>()

const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
}

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
})

describe("update-store", () => {
  beforeEach(() => {
    localStorageMock.clear()
    useUpdateStore.setState({
      currentVersion: "1.0.6",
      latestRelease: null,
      hasUpdate: false,
      isChecking: false,
      isDialogOpen: false,
    })
  })

  it("initializes with hasUpdate = false when no newer release is cached", () => {
    const state = useUpdateStore.getState()
    expect(state.hasUpdate).toBe(false)
  })

  it("sets hasUpdate = true when GitHub returns a newer version", async () => {
    const mockRelease = {
      tag_name: "v1.0.7",
      name: "Lifestone v1.0.7",
      body: "Exciting new features",
      published_at: "2026-10-18T14:00:00Z",
      html_url: "https://github.com/Sm-bello/Lifestone-church-ai/releases/tag/v1.0.7",
      assets: [],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRelease,
    })

    const hasNewUpdate = await useUpdateStore.getState().checkForUpdates()
    expect(hasNewUpdate).toBe(true)
    expect(useUpdateStore.getState().hasUpdate).toBe(true)
    expect(useUpdateStore.getState().latestRelease?.version).toBe("1.0.7")
  })

  it("sets hasUpdate = false when GitHub release is equal or older than current version", async () => {
    const mockRelease = {
      tag_name: "v1.0.6",
      name: "Lifestone v1.0.6",
      body: "Current version",
      published_at: "2026-10-18T14:00:00Z",
      html_url: "https://github.com/Sm-bello/Lifestone-church-ai/releases/tag/v1.0.6",
      assets: [],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRelease,
    })

    const hasNewUpdate = await useUpdateStore.getState().checkForUpdates()
    expect(hasNewUpdate).toBe(false)
    expect(useUpdateStore.getState().hasUpdate).toBe(false)
  })

  it("handles offline network failure gracefully without throwing or resetting state", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network offline"))

    const result = await useUpdateStore.getState().checkForUpdates()
    expect(result).toBe(false)
    expect(useUpdateStore.getState().isChecking).toBe(false)
  })

  it("persists red dot even when dialog is opened and closed", () => {
    useUpdateStore.setState({
      hasUpdate: true,
      latestRelease: {
        version: "1.0.7",
        title: "v1.0.7",
        notes: "",
        publishedAt: "",
        releaseUrl: "",
        assets: [],
      },
    })

    useUpdateStore.getState().openDialog()
    expect(useUpdateStore.getState().isDialogOpen).toBe(true)
    expect(useUpdateStore.getState().hasUpdate).toBe(true)

    useUpdateStore.getState().closeDialog()
    expect(useUpdateStore.getState().isDialogOpen).toBe(false)
    expect(useUpdateStore.getState().hasUpdate).toBe(true) // Red dot STILL THERE!
  })
})
