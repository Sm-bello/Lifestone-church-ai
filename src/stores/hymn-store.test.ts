import { describe, it, expect, beforeEach, vi } from "vitest"
import { useHymnStore } from "./hymn-store"
import { useBroadcastStore } from "./broadcast-store"

describe("hymn-store", () => {
  beforeEach(() => {
    // Reset store state
    useHymnStore.setState({
      selectedHymnId: null,
      activeStanzaId: null,
      isConsoleOpen: false,
    })
  })

  it("opens and closes console", () => {
    const store = useHymnStore.getState()
    expect(store.isConsoleOpen).toBe(false)

    store.openConsole()
    expect(useHymnStore.getState().isConsoleOpen).toBe(true)

    store.closeConsole()
    expect(useHymnStore.getState().isConsoleOpen).toBe(false)
  })

  it("selects and clears hymn", () => {
    const store = useHymnStore.getState()
    expect(store.selectedHymnId).toBeNull()

    const firstHymn = store.hymns[0]
    store.selectHymn(firstHymn.id)
    expect(useHymnStore.getState().selectedHymnId).toBe(firstHymn.id)

    store.clearSelection()
    expect(useHymnStore.getState().selectedHymnId).toBeNull()
  })

  it("imports and removes hymns", () => {
    const store = useHymnStore.getState()
    const initialCount = store.hymns.length

    const lyrics = `
Verse 1
Line 1
Line 2

Chorus
Chorus Line 1
`
    store.importHymn(lyrics, "Brand New Song")

    const afterImport = useHymnStore.getState()
    expect(afterImport.hymns.length).toBe(initialCount + 1)
    const imported = afterImport.hymns.find((h) => h.title === "Brand New Song")!
    expect(imported).toBeDefined()
    expect(imported.source).toBe("imported")
    expect(afterImport.selectedHymnId).toBe(imported.id)

    // Attempting to remove builtin hymn does nothing
    afterImport.removeHymn(afterImport.hymns[0].id)
    expect(useHymnStore.getState().hymns.length).toBe(initialCount + 1)

    // Removing imported hymn succeeds
    afterImport.removeHymn(imported.id)
    expect(useHymnStore.getState().hymns.length).toBe(initialCount)
  })

  it("presents and stops presenting stanzas", () => {
    const store = useHymnStore.getState()
    const firstHymn = store.hymns[0]
    store.selectHymn(firstHymn.id)

    const firstStanza = firstHymn.stanzas[0]

    const setLiveSpy = vi.spyOn(useBroadcastStore.getState(), "setLive")
    const setLiveVerseSpy = vi.spyOn(useBroadcastStore.getState(), "setLiveVerse")

    store.presentStanza(firstStanza.id)

    expect(useHymnStore.getState().activeStanzaId).toBe(firstStanza.id)
    expect(setLiveSpy).toHaveBeenCalledWith(true)
    expect(setLiveVerseSpy).toHaveBeenCalledWith({
      reference: firstHymn.title,
      segments: [
        {
          text: firstStanza.lines.join("\n"),
        },
      ],
    })

    // Calling presentStanza again on the same stanza toggles off
    store.presentStanza(firstStanza.id)
    expect(useHymnStore.getState().activeStanzaId).toBeNull()
    expect(setLiveVerseSpy).toHaveBeenCalledWith(null)
  })
})
