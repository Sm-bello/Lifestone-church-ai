import { useState, useEffect } from "react"
import { useBroadcastStore } from "@/stores/broadcast-store"
import type { MediaItem } from "@/types/broadcast"
import { open } from "@tauri-apps/plugin-dialog"
import { readFile } from "@tauri-apps/plugin-fs"
import { emit } from "@tauri-apps/api/event"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Play, Pause, Image, Repeat, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

const blobCache = new Map<string, string>()

async function getBlobUrl(path: string, type?: "image" | "video"): Promise<string> {
  if (blobCache.has(path)) return blobCache.get(path)!

  const bytes = await readFile(path)
  const ext = path.split(".").pop()?.toLowerCase() || "png"

  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
    tiff: "image/tiff",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
  }

  const mimeType = mimeMap[ext] || (type === "video" ? "video/mp4" : "image/png")
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  blobCache.set(path, url)
  return url
}

async function fileToBase64(path: string): Promise<string> {
  const bytes = await readFile(path)
  const ext = path.split(".").pop()?.toLowerCase() || "png"
  const mimeType =
    ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : ext === "gif" ? "image/gif"
    : ext === "webp" ? "image/webp"
    : ext === "svg" ? "image/svg+xml"
    : ext === "bmp" ? "image/bmp"
    : ext === "ico" ? "image/x-icon"
    : "image/png"
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:${mimeType};base64,${btoa(binary)}`
}

export function MediaBucket() {
  const {
    mediaLibrary,
    currentMedia,
    isLive,
    mediaPlaybackMode,
    isMediaMuted,
    isMediaPlaying,
    addToLibrary,
    removeFromLibrary,
    setCurrentMedia,
    setLive,
    setMediaPlaybackMode,
    toggleMediaMute,
    setMediaPlaying,
  } = useBroadcastStore()

  const playbackMode = currentMedia?.playbackMode ?? mediaPlaybackMode ?? "loop"
  const isMuted = currentMedia?.isMuted ?? isMediaMuted ?? true

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map())
  const [loadErrors, setLoadErrors] = useState<Set<string>>(new Set())

  // Load blob URLs for ALL media (images + videos)
  useEffect(() => {
    let cancelled = false
    const loadBlobs = async () => {
      const newUrls = new Map<string, string>()
      for (const item of mediaLibrary) {
        if (blobCache.has(item.path)) {
          newUrls.set(item.id, blobCache.get(item.path)!)
        } else {
          try {
            const url = await getBlobUrl(item.path, item.type)
            if (!cancelled) newUrls.set(item.id, url)
          } catch (e) {
            console.warn("Failed to load blob for", item.path, e)
          }
        }
      }
      if (!cancelled) setBlobUrls(newUrls)
    }
    loadBlobs()
    return () => { cancelled = true }
  }, [mediaLibrary])

  // When currentMedia or isLive changes, send to broadcast windows (gated by isLive)
  useEffect(() => {
    const sendMedia = async () => {
      if (!isLive || !currentMedia) {
        await emit("broadcast:media-update", { media: null, isPlaying: false })
        return
      }

      const activePlaybackMode = currentMedia.playbackMode ?? mediaPlaybackMode ?? "loop"
      const activeMuted = currentMedia.isMuted ?? isMediaMuted ?? true

      if (currentMedia.type === "image") {
        try {
          const base64 = await fileToBase64(currentMedia.path)
          await emit("broadcast:media-update", {
            media: { ...currentMedia, base64Data: base64, playbackMode: activePlaybackMode, isMuted: activeMuted },
            isPlaying: true,
            playbackMode: activePlaybackMode,
            isMuted: activeMuted,
          })
        } catch (e) {
          console.warn("Failed to send image base64:", e)
        }
      } else if (currentMedia.type === "video") {
        const url = blobUrls.get(currentMedia.id) || currentMedia.assetUrl
        await emit("broadcast:media-update", {
          media: { ...currentMedia, assetUrl: url, playbackMode: activePlaybackMode, isMuted: activeMuted },
          isPlaying: isMediaPlaying,
          playbackMode: activePlaybackMode,
          isMuted: activeMuted,
        })
      }
    }

    sendMedia()
  }, [currentMedia, isLive, blobUrls, mediaPlaybackMode, isMediaMuted, isMediaPlaying])

  const handleAdd = async () => {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "All Media",
          extensions: [
            "mp4", "mov", "webm", "mkv", "avi",
            "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg", "ico",
          ],
        },
        { name: "Video", extensions: ["mp4", "mov", "webm", "mkv", "avi"] },
        { name: "Image", extensions: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg", "ico"] },
      ],
    })
    if (!selected || !Array.isArray(selected)) return

    const items: MediaItem[] = []
    for (const path of selected) {
      const ext = path.split(".").pop()?.toLowerCase() || ""
      const isVideo = ["mp4", "mov", "webm", "mkv", "avi"].includes(ext)
      const name = path.split(/[\\/]/).pop() || "Untitled"

      // Generate blob URL for ALL media types (images + videos)
      let blobUrl: string | undefined
      try {
        blobUrl = await getBlobUrl(path, isVideo ? "video" : "image")
      } catch (e) {
        console.warn("Failed blob", path, e)
      }

      items.push({
        id: crypto.randomUUID(),
        type: isVideo ? "video" : "image",
        path,
        assetUrl: blobUrl,
        name,
        createdAt: Date.now(),
      })
    }
    items.forEach(addToLibrary)
    if (items.length > 0) setCurrentMedia(items[0])
  }

  const handleImageError = (id: string) => {
    setLoadErrors((prev) => new Set(prev).add(id))
  }

  return (
    <div data-slot="media-bucket" className="flex flex-col h-full bg-card border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        <h3 className="font-semibold text-sm">Media Bucket</h3>
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {/* Media Playback & Audio Controls Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 bg-muted/20">
        <div className="flex items-center gap-1.5">
          {/* Playback mode toggle */}
          <div className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMediaPlaybackMode("loop")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                playbackMode === "loop"
                  ? "bg-primary/15 text-primary font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Loop video continuously"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Loop</span>
            </button>
            <button
              type="button"
              onClick={() => setMediaPlaybackMode("play-once")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                playbackMode === "play-once"
                  ? "bg-primary/15 text-primary font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Play video once and pause"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Once</span>
            </button>
          </div>

          {/* Video Play / Pause button */}
          <button
            type="button"
            onClick={() => setMediaPlaying(!isMediaPlaying)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors",
              isMediaPlaying
                ? "text-emerald-500 border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25"
                : "text-amber-500 border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25"
            )}
            title={isMediaPlaying ? "Pause video playback" : "Resume video playback"}
          >
            {isMediaPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Play</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            )}
          </button>
        </div>

        {/* Audio toggle */}
        <button
          type="button"
          onClick={toggleMediaMute}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
            !isMuted
              ? "text-blue-500 border-blue-500/40 bg-blue-500/15 hover:bg-blue-500/25"
              : "text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/50"
          )}
          title={isMuted ? "Audio muted (speakerless)" : "Audio unmuted (on-speaker)"}
        >
          {!isMuted ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Audio</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>Audio</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {mediaLibrary.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Image className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs text-center">
              No media yet.<br />Click Add to load images or videos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {mediaLibrary.map((item) => {
              const isActive = currentMedia?.id === item.id && isLive
              const isHovered = hoveredId === item.id
              const hasError = loadErrors.has(item.id)
              const displayUrl = item.assetUrl || blobUrls.get(item.id)

              // Don't render video/img if no URL ready yet
              if (!displayUrl && !hasError) {
                return (
                  <div
                    key={item.id}
                    className="relative aspect-square rounded-md overflow-hidden bg-muted animate-pulse"
                  />
                )
              }

              return (
                <div
                  key={item.id}
                  className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                    isActive ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30"
                  }`}
                  onClick={() => {
                    if (isActive) {
                      setCurrentMedia(null)
                    } else {
                      setLive(true)
                      const itemWithUrl = { ...item, assetUrl: blobUrls.get(item.id) || item.assetUrl }
                      setCurrentMedia(itemWithUrl)
                    }
                  }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {hasError ? (
                    <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
                      <Image className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-[9px] text-muted-foreground text-center px-1">{item.name}</span>
                    </div>
                  ) : item.type === "video" ? (
                    <video
                      key={displayUrl} // Force remount when blob URL ready
                      src={displayUrl}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                      playsInline
                      onError={() => handleImageError(item.id)}
                    />
                  ) : (
                    <img
                      src={displayUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      draggable={false}
                      onError={() => handleImageError(item.id)}
                    />
                  )}

                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">LIVE</div>
                  )}

                  {item.type === "video" && !isActive && !hasError && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                      <Play className="w-8 h-8 text-white drop-shadow-lg" />
                    </div>
                  )}

                  {isHovered && (
                    <button
                      className="absolute bottom-1.5 right-1.5 bg-black/70 text-white p-1.5 rounded-md hover:bg-destructive transition-colors z-10"
                      onClick={(e) => { e.stopPropagation(); removeFromLibrary(item.id); if (currentMedia?.id === item.id) setCurrentMedia(null) }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
                    <p className="text-[10px] text-white truncate font-medium">{item.name}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}