import { create } from "zustand"
import { emitTo } from "@tauri-apps/api/event"
import { load, type Store } from "@tauri-apps/plugin-store"
import type { BroadcastTheme, VerseRenderData } from "@/types"
import type { MediaItem } from "@/types/broadcast"
import { BUILTIN_THEMES } from "@/lib/builtin-themes"

type SelectedElement = "verse" | "reference" | null

interface BroadcastState {
  themes: BroadcastTheme[]
  activeThemeId: string
  altActiveThemeId: string
  isLive: boolean
  liveVerse: VerseRenderData | null

  // Media layer
  currentMedia: MediaItem | null
  mediaQueue: MediaItem[]
  currentMediaIndex: number
  isMediaPlaying: boolean
  mediaLibrary: MediaItem[]

  // Designer state
  isDesignerOpen: boolean
  editingThemeId: string | null
  renamingThemeId: string | null
  draftTheme: BroadcastTheme | null
  selectedElement: SelectedElement

  // Theme management
  loadThemes: () => void
  saveTheme: (theme: BroadcastTheme) => void
  deleteTheme: (id: string) => void
  duplicateTheme: (id: string) => void
  createNewTheme: () => void
  renameTheme: (id: string, name: string) => void
  togglePinTheme: (id: string) => void
  setActiveTheme: (id: string) => void
  setAltActiveTheme: (id: string) => void
  setLive: (live: boolean) => void
  setLiveVerse: (verse: VerseRenderData | null) => void
  syncBroadcastOutput: () => void
  syncBroadcastOutputFor: (outputId: string) => void

  // Designer actions
  setDesignerOpen: (open: boolean) => void
  startEditing: (themeId: string) => void
  stopEditing: () => void
  updateDraft: (updates: Partial<BroadcastTheme>) => void
  updateDraftNested: (path: string, value: unknown) => void
  saveDraft: () => void
  discardDraft: () => void
  setSelectedElement: (el: SelectedElement) => void
  setRenamingTheme: (id: string | null) => void

  // Media actions
  setCurrentMedia: (item: MediaItem | null) => void
  setMediaQueue: (queue: MediaItem[]) => void
  setCurrentMediaIndex: (index: number) => void
  nextMedia: () => void
  prevMedia: () => void
  setMediaPlaying: (playing: boolean) => void
  addToLibrary: (item: MediaItem) => void
  removeFromLibrary: (id: string) => void
  addToQueue: (item: MediaItem) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  syncBroadcastMedia: () => void
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split(".")
  const isIndex = (key: string) => /^\d+$/.test(key)
  const result: Record<string, unknown> = Array.isArray(obj) ? [...obj] as unknown as Record<string, unknown> : { ...obj }

  let current: Record<string, unknown> | unknown[] = result
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const nextKey = keys[i + 1]
    const currentIndex = isIndex(key) ? Number(key) : key
    const existing = (current as Record<string, unknown> | unknown[])[currentIndex as keyof typeof current]
    const nextContainer = Array.isArray(existing)
      ? [...existing]
      : existing && typeof existing === "object"
        ? { ...(existing as Record<string, unknown>) }
        : isIndex(nextKey)
          ? []
          : {}

    ;(current as Record<string, unknown> | unknown[])[currentIndex as keyof typeof current] = nextContainer as never
    current = nextContainer as Record<string, unknown> | unknown[]
  }

  const lastKey = keys[keys.length - 1]
  const lastIndex = isIndex(lastKey) ? Number(lastKey) : lastKey
  ;(current as Record<string, unknown> | unknown[])[lastIndex as keyof typeof current] = value as never

  return result
}

function emitDraftToBroadcast(state: BroadcastState): void {
  if (!state.draftTheme) return
  const id = state.editingThemeId
  if (id === state.activeThemeId) {
    void emitTo("broadcast", "broadcast:verse-update", {
      theme: state.draftTheme,
      verse: state.liveVerse,
    }).catch(() => {})
  }
  if (id === state.altActiveThemeId) {
    void emitTo("broadcast-alt", "broadcast:verse-update", {
      theme: state.draftTheme,
      verse: state.liveVerse,
    }).catch(() => {})
  }
}

export const useBroadcastStore = create<BroadcastState>((set, get) => ({
  themes: [...BUILTIN_THEMES],
  activeThemeId: BUILTIN_THEMES[0].id,
  altActiveThemeId: BUILTIN_THEMES[0].id,
  isLive: false,
  liveVerse: null,
  currentMedia: null,
  mediaQueue: [],
  currentMediaIndex: -1,
  isMediaPlaying: true,
  mediaLibrary: [],
  isDesignerOpen: false,
  editingThemeId: null,
  renamingThemeId: null,
  draftTheme: null,
  selectedElement: null,

  loadThemes: () => {
    set({ themes: [...BUILTIN_THEMES] })
  },
  saveTheme: (theme) =>
    set((s) => ({
      themes: s.themes.some((t) => t.id === theme.id)
        ? s.themes.map((t) => (t.id === theme.id ? theme : t))
        : [...s.themes, theme],
    })),
  deleteTheme: (id) =>
    set((s) => ({ themes: s.themes.filter((t) => t.id !== id || t.builtin) })),
  duplicateTheme: (id) => {
    const s = get()
    const source = s.themes.find((t) => t.id === id)
    if (!source) return
    const newTheme: BroadcastTheme = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} Copy`,
      builtin: false,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set((s) => ({ themes: [...s.themes, newTheme] }))
  },
  createNewTheme: () => {
    const source = BUILTIN_THEMES[0]
    const newTheme: BroadcastTheme = {
      ...source,
      id: crypto.randomUUID(),
      name: "Untitled Theme",
      builtin: false,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      background: {
        type: "solid",
        color: "#000000",
        gradient: null,
        image: null,
        video: null,
      },
    }
    set((s) => ({ themes: [...s.themes, newTheme] }))
    get().startEditing(newTheme.id)
  },
  renameTheme: (id, name) =>
    set((s) => ({
      themes: s.themes.map((t) =>
        t.id === id && !t.builtin ? { ...t, name, updatedAt: Date.now() } : t
      ),
      draftTheme:
        s.draftTheme?.id === id ? { ...s.draftTheme, name, updatedAt: Date.now() } : s.draftTheme,
    })),
  togglePinTheme: (id) =>
    set((s) => ({
      themes: s.themes.map((t) =>
        t.id === id ? { ...t, pinned: !t.pinned, updatedAt: Date.now() } : t
      ),
    })),
  syncBroadcastOutputFor: (outputId: string) => {
    const s = get()
    const themeId = outputId === "alt" ? s.altActiveThemeId : s.activeThemeId
    const label = outputId === "alt" ? "broadcast-alt" : "broadcast"
    const theme = s.themes.find((t) => t.id === themeId) ?? s.themes[0]
    if (!theme) return

    void emitTo(label, "broadcast:verse-update", {
      theme,
      verse: s.liveVerse,
    }).catch(() => {})

    // Also sync media to broadcast window
    if (s.currentMedia) {
      void emitTo(label, "broadcast:media-update", {
        media: s.currentMedia,
        isPlaying: s.isMediaPlaying,
      }).catch(() => {})
    }
  },
  syncBroadcastOutput: () => {
    get().syncBroadcastOutputFor("main")
    get().syncBroadcastOutputFor("alt")
  },
  setActiveTheme: (activeThemeId) => {
    set({ activeThemeId })
    get().syncBroadcastOutputFor("main")
  },
  setAltActiveTheme: (altActiveThemeId) => {
    set({ altActiveThemeId })
    get().syncBroadcastOutputFor("alt")
  },
  setLive: (isLive) => set({ isLive }),
  setLiveVerse: (liveVerse) => {
    set({ liveVerse })
    get().syncBroadcastOutput()
  },

  // Designer
  setDesignerOpen: (isDesignerOpen) => {
    if (!isDesignerOpen) {
      set({ isDesignerOpen, editingThemeId: null, draftTheme: null, selectedElement: null })
    } else {
      set({ isDesignerOpen })
    }
  },
  startEditing: (themeId) => {
    const theme = get().themes.find((t) => t.id === themeId)
    if (!theme) return
    set({
      editingThemeId: themeId,
      draftTheme: { ...theme, updatedAt: Date.now() },
      selectedElement: null,
    })
  },
  stopEditing: () => {
    set({
      editingThemeId: null,
      draftTheme: null,
      selectedElement: null,
    })
  },
  updateDraft: (updates) => {
    set((s) => ({
      draftTheme: s.draftTheme ? { ...s.draftTheme, ...updates, updatedAt: Date.now() } : null,
    }))
    emitDraftToBroadcast(get())
  },
  updateDraftNested: (path, value) => {
    set((s) => ({
      draftTheme: s.draftTheme
        ? (setNestedValue(s.draftTheme as unknown as Record<string, unknown>, path, value) as unknown as BroadcastTheme)
        : null,
    }))
    emitDraftToBroadcast(get())
  },
  saveDraft: () => {
    const { draftTheme } = get()
    if (!draftTheme) return
    if (draftTheme.builtin) {
      const customTheme = {
        ...draftTheme,
        id: crypto.randomUUID(),
        name: `${draftTheme.name} (Custom)`,
        builtin: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      set((s) => ({
        themes: [...s.themes, customTheme],
        activeThemeId: customTheme.id,
        editingThemeId: customTheme.id,
        draftTheme: customTheme,
      }))
    } else {
      get().saveTheme(draftTheme)
    }
  },
  discardDraft: () => {
    const { editingThemeId } = get()
    if (editingThemeId) {
      get().startEditing(editingThemeId)
    }
  },
  setSelectedElement: (selectedElement) => set({ selectedElement }),
  setRenamingTheme: (id) => set({ renamingThemeId: id }),

  // Media actions
  setCurrentMedia: (item) => {
    set({ currentMedia: item })
    get().syncBroadcastMedia()
  },

  setMediaQueue: (queue) => {
    set({ mediaQueue: queue })
    get().syncBroadcastMedia()
  },

  setCurrentMediaIndex: (index) => {
    const { mediaQueue } = get()
    if (index >= 0 && index < mediaQueue.length) {
      set({
        currentMediaIndex: index,
        currentMedia: mediaQueue[index],
        isMediaPlaying: true,
      })
    } else {
      set({ currentMediaIndex: -1, currentMedia: null })
    }
    get().syncBroadcastMedia()
  },

  nextMedia: () => {
    const { mediaQueue, currentMediaIndex } = get()
    if (mediaQueue.length === 0) return
    const next = (currentMediaIndex + 1) % mediaQueue.length
    get().setCurrentMediaIndex(next)
  },

  prevMedia: () => {
    const { mediaQueue, currentMediaIndex } = get()
    if (mediaQueue.length === 0) return
    const prev = currentMediaIndex <= 0 ? mediaQueue.length - 1 : currentMediaIndex - 1
    get().setCurrentMediaIndex(prev)
  },

  setMediaPlaying: (playing) => {
    set({ isMediaPlaying: playing })
    get().syncBroadcastMedia()
  },

  addToLibrary: (item) => set((state) => ({
    mediaLibrary: [...state.mediaLibrary, item],
  })),

  removeFromLibrary: (id) => set((state) => ({
    mediaLibrary: state.mediaLibrary.filter((m) => m.id !== id),
  })),

  addToQueue: (item) => {
    set((state) => ({ mediaQueue: [...state.mediaQueue, item] }))
    get().syncBroadcastMedia()
  },

  removeFromQueue: (index) => {
    set((state) => {
      const newQueue = [...state.mediaQueue]
      newQueue.splice(index, 1)
      const newIndex = state.currentMediaIndex >= index
        ? Math.max(0, state.currentMediaIndex - 1)
        : state.currentMediaIndex
      return {
        mediaQueue: newQueue,
        currentMediaIndex: newIndex,
        currentMedia: newIndex >= 0 && newIndex < newQueue.length ? newQueue[newIndex] : null,
      }
    })
    get().syncBroadcastMedia()
  },

  clearQueue: () => {
    set({ mediaQueue: [], currentMediaIndex: -1, currentMedia: null })
    get().syncBroadcastMedia()
  },

  syncBroadcastMedia: () => {
    const s = get()
    const payload = { media: s.currentMedia, isPlaying: s.isMediaPlaying }
    void emitTo("broadcast", "broadcast:media-update", payload).catch(() => {})
    void emitTo("broadcast-alt", "broadcast:media-update", payload).catch(() => {})
  },
}))

// ── Theme persistence via tauri-plugin-store ──

let tauriStore: Store | null = null
let hydrationPromise: Promise<void> | null = null

async function getThemeStore(): Promise<Store> {
  if (!tauriStore) {
    tauriStore = await load("broadcast-themes.json", { autoSave: false, defaults: {} })
  }
  return tauriStore
}

export function hydrateBroadcastThemes(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const store = await getThemeStore()
      const customThemes = (await store.get("customThemes")) as BroadcastTheme[] | undefined
      const activeId = (await store.get("activeThemeId")) as string | undefined
      const altActiveId = (await store.get("altActiveThemeId")) as string | undefined

      const patch: Partial<BroadcastState> = {}
      if (customThemes && Array.isArray(customThemes) && customThemes.length > 0) {
        patch.themes = [...BUILTIN_THEMES, ...customThemes]
      }
      if (activeId) patch.activeThemeId = activeId
      if (altActiveId) patch.altActiveThemeId = altActiveId

      if (Object.keys(patch).length > 0) {
        useBroadcastStore.setState(patch)
      }

      useBroadcastStore.subscribe((state, prevState) => {
        const changed =
          state.themes !== prevState.themes ||
          state.activeThemeId !== prevState.activeThemeId ||
          state.altActiveThemeId !== prevState.altActiveThemeId
        if (!changed) return
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          saveTimer = null
          pendingSave = pendingSave.then(() =>
            persistBroadcastThemes(useBroadcastStore.getState())
          )
        }, SAVE_DEBOUNCE_MS)
      })
    } catch {
      console.warn("[broadcast] Failed to load persisted themes, using defaults")
    }
  })()
  return hydrationPromise
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSave: Promise<void> = Promise.resolve()
const SAVE_DEBOUNCE_MS = 500

async function persistBroadcastThemes(state: BroadcastState): Promise<void> {
  try {
    const store = await getThemeStore()
    const customThemes = state.themes.filter((t) => !t.builtin)
    await store.set("customThemes", customThemes)
    await store.set("activeThemeId", state.activeThemeId)
    await store.set("altActiveThemeId", state.altActiveThemeId)
    await store.save()
  } catch {
    console.warn("[broadcast] Failed to persist themes")
  }
}