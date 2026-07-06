import { useState, useEffect } from "react"
import { useBroadcastStore } from "@/stores/broadcast-store"
import type { MediaItem } from "@/types/broadcast"
import { open } from "@tauri-apps/plugin-dialog"
import { convertFileSrc } from "@tauri-apps/api/core"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Pause, SkipForward, SkipBack, Plus, Trash2, Film, Image } from "lucide-react"

export function MediaPanel() {
  const [activeTab, setActiveTab] = useState<"library" | "queue">("queue")

  const {
    mediaLibrary,
    mediaQueue,
    currentMedia,
    isMediaPlaying,
    addToLibrary,
    removeFromLibrary,
    addToQueue,
    removeFromQueue,
    setCurrentMediaIndex,
    setMediaPlaying,
    nextMedia,
    prevMedia,
    clearQueue,
  } = useBroadcastStore()

  // Listen for video ended events from broadcast window to auto-advance
  useEffect(() => {
    const win = getCurrentWebviewWindow()
    let unlistenPromise: Promise<() => void>
    const setup = async () => {
      unlistenPromise = win.listen("broadcast:media-ended", () => {
        nextMedia()
      })
    }
    setup()
    return () => {
      unlistenPromise?.then((fn) => fn())
    }
  }, [nextMedia])

  const handleAddFiles = async () => {
    const selected = await open({
      multiple: true,
      filters: [
        { name: "Media", extensions: ["mp4", "mov", "webm", "jpg", "jpeg", "png", "gif", "webp"] },
        { name: "Video", extensions: ["mp4", "mov", "webm"] },
        { name: "Image", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
      ],
    })
    if (!selected || !Array.isArray(selected)) return

    const newItems: MediaItem[] = selected.map((path) => {
      const ext = path.split(".").pop()?.toLowerCase() || ""
      const isVideo = ["mp4", "mov", "webm"].includes(ext)
      const name = path.split(/[\\/]/).pop() || "Untitled"
      return {
        id: crypto.randomUUID(),
        type: isVideo ? "video" : "image",
        path: convertFileSrc(path),
        name,
        createdAt: Date.now(),
      }
    })

    newItems.forEach(addToLibrary)
    newItems.forEach(addToQueue)
  }

  const QueueItem = ({ item, index }: { item: MediaItem; index: number }) => {
    const isActive = currentMedia?.id === item.id
    return (
      <div
        className={`group flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
          isActive ? "bg-primary/20 border border-primary" : "hover:bg-muted"
        }`}
        onClick={() => setCurrentMediaIndex(index)}
      >
        {item.type === "video" ? <Film className="w-4 h-4 shrink-0" /> : <Image className="w-4 h-4 shrink-0" />}
        <span className="flex-1 truncate text-sm">{item.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); removeFromQueue(index) }}
          className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-card border rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 p-2 border-b">
        <Button
          variant={activeTab === "queue" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("queue")}
        >
          Queue ({mediaQueue.length})
        </Button>
        <Button
          variant={activeTab === "library" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("library")}
        >
          Library ({mediaLibrary.length})
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={handleAddFiles}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        <Button size="icon" variant="ghost" onClick={prevMedia} disabled={mediaQueue.length === 0}>
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setMediaPlaying(!isMediaPlaying)} disabled={!currentMedia}>
          {isMediaPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={nextMedia} disabled={mediaQueue.length === 0}>
          <SkipForward className="w-4 h-4" />
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={clearQueue} disabled={mediaQueue.length === 0}>
          Clear
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        {activeTab === "queue" ? (
          <div className="space-y-1">
            {mediaQueue.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No media in queue. Click "Add" to load images or videos.
              </p>
            )}
            {mediaQueue.map((item, i) => (
              <QueueItem key={item.id} item={item} index={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {mediaLibrary.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No media in library. Click "Add" to import files.
              </p>
            )}
            {mediaLibrary.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
                {item.type === "video" ? <Film className="w-4 h-4 shrink-0" /> : <Image className="w-4 h-4 shrink-0" />}
                <span className="flex-1 truncate text-sm">{item.name}</span>
                <Button size="sm" variant="ghost" onClick={() => addToQueue(item)}>Queue</Button>
                <Button size="sm" variant="ghost" onClick={() => removeFromLibrary(item.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}