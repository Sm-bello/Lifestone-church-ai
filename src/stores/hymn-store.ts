import { create } from "zustand"
import type { Hymn } from "@/types/hymn"
import type { VerseRenderData } from "@/types/broadcast"
import { BUILTIN_HYMNS, parseHymnText } from "@/lib/hymn-parser"
import { useBroadcastStore } from "./broadcast-store"

const STORAGE_KEY = "lifestone_imported_hymns"

function loadInitialHymns(): Hymn[] {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Hymn[]
        if (Array.isArray(parsed)) {
          return [...BUILTIN_HYMNS, ...parsed]
        }
      }
    }
  } catch (e) {
    console.warn("Failed to read imported hymns from storage:", e)
  }
  return BUILTIN_HYMNS
}

function persistImportedHymns(hymns: Hymn[]) {
  try {
    if (typeof window !== "undefined") {
      const imported = hymns.filter((h) => h.source === "imported")
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported))
    }
  } catch (e) {
    console.warn("Failed to persist imported hymns to storage:", e)
  }
}

export interface HymnState {
  hymns: Hymn[]
  isConsoleOpen: boolean
  selectedHymnId: string | null
  activeStanzaId: string | null

  openConsole: () => void
  closeConsole: () => void
  selectHymn: (id: string) => void
  clearSelection: () => void
  presentStanza: (stanzaId: string) => void
  stopPresenting: () => void
  importHymn: (text: string, title: string) => void
  removeHymn: (id: string) => void
}

export const useHymnStore = create<HymnState>((set, get) => ({
  hymns: loadInitialHymns(),
  isConsoleOpen: false,
  selectedHymnId: null,
  activeStanzaId: null,

  openConsole: () => set({ isConsoleOpen: true }),

  closeConsole: () => set({ isConsoleOpen: false }),

  selectHymn: (id: string) => set({ selectedHymnId: id }),

  clearSelection: () => set({ selectedHymnId: null }),

  presentStanza: (stanzaId: string) => {
    const { hymns, selectedHymnId, activeStanzaId } = get()

    // Toggle off if clicking the currently presenting stanza
    if (activeStanzaId === stanzaId) {
      get().stopPresenting()
      return
    }

    const hymn = hymns.find((h) => h.id === selectedHymnId)
    if (!hymn) return

    const stanza = hymn.stanzas.find((s) => s.id === stanzaId)
    if (!stanza) return

    const renderData: VerseRenderData = {
      reference: hymn.title,
      segments: [
        {
          text: stanza.lines.join("\n"),
        },
      ],
    }

    const broadcast = useBroadcastStore.getState()
    broadcast.setLive(true)
    broadcast.setLiveVerse(renderData)

    set({ activeStanzaId: stanzaId })
  },

  stopPresenting: () => {
    useBroadcastStore.getState().setLiveVerse(null)
    set({ activeStanzaId: null })
  },

  importHymn: (text: string, title: string) => {
    const newHymn = parseHymnText(text, title)
    // Guarantee source is imported
    newHymn.source = "imported"

    set((state) => {
      const nextHymns = [...state.hymns, newHymn]
      persistImportedHymns(nextHymns)
      return {
        hymns: nextHymns,
        selectedHymnId: newHymn.id,
      }
    })
  },

  removeHymn: (id: string) => {
    const { hymns, selectedHymnId, activeStanzaId } = get()
    const target = hymns.find((h) => h.id === id)
    if (!target || target.source !== "imported") {
      return
    }

    // If currently presenting a stanza from this hymn, stop
    if (activeStanzaId && target.stanzas.some((s) => s.id === activeStanzaId)) {
      get().stopPresenting()
    }

    const nextHymns = hymns.filter((h) => h.id !== id)
    persistImportedHymns(nextHymns)

    set({
      hymns: nextHymns,
      selectedHymnId: selectedHymnId === id ? null : selectedHymnId,
    })
  },
}))
