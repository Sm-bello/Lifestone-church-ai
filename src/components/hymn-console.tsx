import { useState, useMemo, useEffect, useCallback } from "react"
import {
  MusicIcon,
  SearchIcon,
  PlusIcon,
  XIcon,
  Trash2Icon,
  SquareIcon,
  RadioIcon,
  SparklesIcon,
} from "lucide-react"
import { useHymnStore } from "@/stores"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function HymnConsole() {
  const isConsoleOpen = useHymnStore((s) => s.isConsoleOpen)
  const closeConsole = useHymnStore((s) => s.closeConsole)
  const hymns = useHymnStore((s) => s.hymns)
  const selectedHymnId = useHymnStore((s) => s.selectedHymnId)
  const selectHymn = useHymnStore((s) => s.selectHymn)
  const activeStanzaId = useHymnStore((s) => s.activeStanzaId)
  const presentStanza = useHymnStore((s) => s.presentStanza)
  const stopPresenting = useHymnStore((s) => s.stopPresenting)
  const importHymn = useHymnStore((s) => s.importHymn)
  const removeHymn = useHymnStore((s) => s.removeHymn)

  const [searchQuery, setSearchQuery] = useState("")
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importTitle, setImportTitle] = useState("")
  const [importLyrics, setImportLyrics] = useState("")
  const [importError, setImportError] = useState<string | null>(null)

  // Handle escape key to close modal or console
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isImportOpen) {
          setIsImportOpen(false)
          setImportError(null)
        } else if (isConsoleOpen) {
          closeConsole()
        }
      }
    },
    [isImportOpen, isConsoleOpen, closeConsole]
  )

  useEffect(() => {
    if (isConsoleOpen) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isConsoleOpen, handleKeyDown])

  // Filtered hymns based on search and sorted by number
  const filteredHymns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = hymns
    if (q) {
      list = hymns.filter((hymn) => {
        if (hymn.title.toLowerCase().includes(q)) return true
        if (hymn.number && hymn.number.toString().includes(q)) return true
        if (hymn.category && hymn.category.toLowerCase().includes(q)) return true
        if (hymn.author && hymn.author.toLowerCase().includes(q)) return true
        return hymn.stanzas.some((st) =>
          st.lines.some((line) => line.toLowerCase().includes(q))
        )
      })
    }
    return [...list].sort((a, b) => {
      if (a.number != null && b.number != null) return a.number - b.number
      if (a.number != null) return -1
      if (b.number != null) return 1
      return a.title.localeCompare(b.title)
    })
  }, [hymns, searchQuery])

  // Selected hymn object
  const selectedHymn = useMemo(() => {
    return hymns.find((h) => h.id === selectedHymnId) || null
  }, [hymns, selectedHymnId])

  // Reset import form
  const handleCloseImport = () => {
    setIsImportOpen(false)
    setImportTitle("")
    setImportLyrics("")
    setImportError(null)
  }

  // Handle import submit
  const handleDoImport = () => {
    const trimmedTitle = importTitle.trim()
    const trimmedLyrics = importLyrics.trim()

    if (!trimmedTitle) {
      setImportError("Please enter a song title.")
      return
    }

    if (!trimmedLyrics) {
      setImportError("Please enter or paste the lyrics.")
      return
    }

    importHymn(trimmedLyrics, trimmedTitle)
    handleCloseImport()
  }

  if (!isConsoleOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in-0 duration-150">
      <div className="relative flex h-[92vh] w-[92vw] max-w-7xl flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        {/* ── Top Bar ── */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5 md:px-6 bg-card/95">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎵</span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Hymnal &amp; Worship
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Project hymns and worship songs live to the screen
              </p>
            </div>
          </div>

          {/* Search input */}
          <div className="relative flex-1 max-w-md mx-4 md:mx-8">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, number, or lyrics..."
              className="pl-9 pr-8 h-9 text-sm bg-background/50 border-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          {/* Actions: Import & Close */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              className="gap-1.5 h-9 font-medium"
            >
              <PlusIcon className="size-4" />
              <span>Import Song</span>
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={closeConsole}
              title="Close Hymnal (Esc)"
              className="size-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-5" />
            </Button>
          </div>
        </div>

        {/* ── Two-Column Main Area ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Column: Hymn List (~35%) */}
          <div className="w-[35%] shrink-0 border-r border-border flex flex-col min-h-0 bg-background/40">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/20">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Songs ({filteredHymns.length})
              </span>
              {searchQuery && (
                <span className="text-[11px] text-muted-foreground">
                  Filtered
                </span>
              )}
            </div>

            <ScrollArea className="flex-1 p-2.5">
              {filteredHymns.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No songs found matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredHymns.map((hymn) => {
                    const isSelected = selectedHymnId === hymn.id
                    return (
                      <div
                        key={hymn.id}
                        onClick={() => selectHymn(hymn.id)}
                        className={cn(
                          "group relative flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                            : "border-transparent hover:border-border hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {hymn.number && (
                              <span className="font-mono text-xs font-bold text-primary shrink-0">
                                #{hymn.number}
                              </span>
                            )}
                            <span className="font-semibold text-sm text-foreground truncate">
                              {hymn.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Badge
                              variant={hymn.source === "builtin" ? "secondary" : "outline"}
                              className={cn(
                                "text-[10px] uppercase font-mono px-1.5 py-0 h-4.5",
                                hymn.source === "imported" &&
                                  "border-primary/40 text-primary"
                              )}
                            >
                              {hymn.source}
                            </Badge>

                            {hymn.source === "imported" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeHymn(hymn.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded"
                                title="Delete song"
                              >
                                <Trash2Icon className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate max-w-[200px] capitalize">
                            {hymn.category || hymn.author || "Gospel Hymns"}
                          </span>
                          <span className="shrink-0 text-[11px]">
                            {hymn.stanzas.length} stanzas
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Column: Stanza Cards (~65%) */}
          <div className="flex-1 flex flex-col min-h-0 bg-background/20 overflow-hidden">
            {!selectedHymn ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <div className="size-16 rounded-full bg-muted/40 flex items-center justify-center mb-4 border border-border">
                  <MusicIcon className="size-8 stroke-[1.5] text-muted-foreground/60" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Select a hymn to begin presenting
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                  Choose a hymn from the list on the left, then click any verse
                  or chorus card to display it live on the projector.
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
                {/* Header of selected hymn */}
                <div className="flex items-center justify-between border-b border-border px-6 py-3.5 bg-card/60">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      {selectedHymn.number && (
                        <span className="text-primary font-mono font-bold text-base">
                          #{selectedHymn.number}
                        </span>
                      )}
                      <h2 className="text-lg font-bold text-foreground truncate">
                        {selectedHymn.title}
                      </h2>
                      <Badge
                        variant={selectedHymn.source === "builtin" ? "secondary" : "outline"}
                        className="text-[10px] uppercase font-mono"
                      >
                        {selectedHymn.source}
                      </Badge>
                    </div>
                    {selectedHymn.author && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Author: {selectedHymn.author}
                      </p>
                    )}
                  </div>

                  {activeStanzaId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopPresenting}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5 h-8 font-medium"
                    >
                      <SquareIcon className="size-3.5 fill-current" />
                      <span>Stop Presenting</span>
                    </Button>
                  )}
                </div>

                {/* Stanzas grid */}
                <ScrollArea className="flex-1 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                    {selectedHymn.stanzas.map((stanza) => {
                      const isPresenting = activeStanzaId === stanza.id
                      return (
                        <div
                          key={stanza.id}
                          onClick={() => presentStanza(stanza.id)}
                          className={cn(
                            "relative flex flex-col justify-between p-5 rounded-xl border-2 cursor-pointer transition-all select-none group",
                            isPresenting
                              ? "border-emerald-500 bg-emerald-950/25 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/50"
                              : "border-border/70 bg-card hover:border-primary/50 hover:bg-card/90 hover:shadow-xs"
                          )}
                        >
                          {/* Card top bar */}
                          <div className="flex items-center justify-between mb-3">
                            <Badge
                              variant={stanza.type === "chorus" ? "default" : "secondary"}
                              className={cn(
                                "text-xs font-semibold uppercase tracking-wider px-2 py-0.5",
                                stanza.type === "chorus" &&
                                  "bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30"
                              )}
                            >
                              {stanza.label}
                            </Badge>

                            {isPresenting ? (
                              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[11px] font-bold tracking-wider uppercase animate-pulse">
                                <RadioIcon className="size-3 text-emerald-400 animate-spin" />
                                <span>PRESENTING</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                                <SparklesIcon className="size-3 text-primary" />
                                Click to Go Live
                              </span>
                            )}
                          </div>

                          {/* Stanza lyrics */}
                          <div className="space-y-1.5 text-sm md:text-base leading-relaxed text-foreground/90 font-medium">
                            {stanza.lines.map((line, idx) => (
                              <p key={idx} className="whitespace-pre-wrap">
                                {line}
                              </p>
                            ))}
                          </div>

                          {/* Footer indicator */}
                          <div className="mt-4 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="capitalize">{stanza.type}</span>
                            <span>{stanza.lines.length} lines</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Import Modal ── */}
      {isImportOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in-0 duration-150">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl flex flex-col gap-4 text-card-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎵</span>
                <h3 className="text-base font-bold text-foreground">
                  Import New Worship Song
                </h3>
              </div>
              <button
                onClick={handleCloseImport}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {importError && (
              <div className="p-2.5 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-xs">
                {importError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Song Title <span className="text-destructive">*</span>
              </label>
              <Input
                value={importTitle}
                onChange={(e) => {
                  setImportTitle(e.target.value)
                  if (importError) setImportError(null)
                }}
                placeholder="e.g. 10,000 Reasons (Bless the Lord)"
                autoFocus
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Lyrics <span className="text-destructive">*</span>
              </label>
              <p className="text-[11px] text-muted-foreground">
                Separate verses and chorus by double line breaks. Stanza labels like
                [Verse 1], Chorus, or Bridge are detected automatically.
              </p>
              <Textarea
                value={importLyrics}
                onChange={(e) => {
                  setImportLyrics(e.target.value)
                  if (importError) setImportError(null)
                }}
                placeholder={`Verse 1\nBless the Lord, O my soul, O my soul\nWorship His holy name\n\nChorus\nSing like never before, O my soul\nI'll worship Your holy name`}
                rows={10}
                className="min-h-[200px] font-mono text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseImport}
                className="h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDoImport}
                className="h-9 font-medium"
              >
                Import Song
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
