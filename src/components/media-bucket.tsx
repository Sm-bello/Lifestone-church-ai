import { useState, useEffect } from "react"
import { useBroadcastStore } from "@/stores/broadcast-store"
import type { MediaItem } from "@/types/broadcast"
import { open } from "@tauri-apps/plugin-dialog"
import { readFile } from "@tauri-apps/plugin-fs"
import { emit } from "@tauri-apps/api/event"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Play, Image } from "lucide-react"

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
    addToLibrary,
    removeFromLibrary,
    setCurrentMedia,
  } = useBroadcastStore()

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

  // When currentMedia changes, send to broadcast windows
  useEffect(() => {
    const sendMedia = async () => {
      if (!currentMedia) {
        await emit("broadcast:media-update", { media: null, isPlaying: false })
        return
      }

      if (currentMedia.type === "image") {
        try {
          const base64 = await fileToBase64(currentMedia.path)
          await emit("broadcast:media-update", {
            media: { ...currentMedia, base64Data: base64 },
            isPlaying: true,
          })
        } catch (e) {
          console.warn("Failed to send image base64:", e)
        }
      } else if (currentMedia.type === "video") {
        const url = blobUrls.get(currentMedia.id) || currentMedia.assetUrl
        await emit("broadcast:media-update", {
          media: { ...currentMedia, assetUrl: url },
          isPlaying: true,
        })
      }
    }

    sendMedia()
  }, [currentMedia, blobUrls])

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
    <div className="flex flex-col h-full bg-card border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        <h3 className="font-semibold text-sm">Media Bucket</h3>
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
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
              const isActive = currentMedia?.id === item.id
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
                  onClick={() => setCurrentMedia(isActive ? null : item)}
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