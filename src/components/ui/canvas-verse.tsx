import { useRef, useEffect, useState, useCallback, memo } from "react"
import { convertFileSrc } from "@tauri-apps/api/core"
import { readFile } from "@tauri-apps/plugin-fs"
import { renderVerse } from "@/lib/verse-renderer"
import type { BroadcastTheme, VerseRenderData, MediaItem } from "@/types/broadcast"
import { cn } from "@/lib/utils"

interface CanvasVerseProps {
  theme: BroadcastTheme
  verse: VerseRenderData | null
  media?: MediaItem | null
  className?: string
}

// ── Media source resolver with blob URL support for local videos ──
// eslint-disable-next-line react-hooks/set-state-in-effect
function useMediaSrc(media: MediaItem | null): string {
  const [src, setSrc] = useState("")

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!media) {
      setSrc("")
      return
    }

    if (media.assetUrl) {
      setSrc(media.assetUrl)
      return
    }

    if (!media.path) {
      setSrc("")
      return
    }

    if (/^(https?|blob|data):/i.test(media.path)) {
      setSrc(media.path)
      return
    }

    let cancelled = false
    let blobUrl = ""

    const load = async () => {
      try {
        if (media.type === "video") {
          const bytes = await readFile(media.path)
          const ext = media.path.split(".").pop()?.toLowerCase() || "mp4"
          const mimeMap: Record<string, string> = {
            mp4: "video/mp4",
            mov: "video/quicktime",
            avi: "video/x-msvideo",
            mkv: "video/x-matroska",
            webm: "video/webm",
            ogv: "video/ogg",
            m4v: "video/mp4",
          }
          blobUrl = URL.createObjectURL(new Blob([bytes], { type: mimeMap[ext] || "video/mp4" }))
          if (!cancelled) setSrc(blobUrl)
        } else {
          const url = convertFileSrc(media.path)
          if (!cancelled) setSrc(url)
        }
      } catch (e) {
        console.error("[useMediaSrc] Failed:", media.path, e)
        if (!cancelled) setSrc("")
      }
    }

    load()

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media?.id, media?.type, media?.path, media?.assetUrl])

  return src
}

// ── Component ──

export const CanvasVerse = memo(function CanvasVerse({
  theme,
  verse,
  media,
  className,
}: CanvasVerseProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [mediaReady, setMediaReady] = useState(false)
  const mediaSrc = useMediaSrc(media)

  // Cleanup video when media changes
  useEffect(() => {
    return () => {
      const v = videoRef.current
      if (v) {
        v.pause()
        v.removeAttribute("src")
        v.load()
      }
    }
  }, [media?.id])

  const drawText = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const cssW = rect.width
    const cssH = rect.height
    if (cssW === 0 || cssH === 0) return

    if (
      canvas.width !== Math.floor(cssW * dpr) ||
      canvas.height !== Math.floor(cssH * dpr)
    ) {
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const aspectRatio = theme.resolution.width / theme.resolution.height
    const displayW = cssW
    const displayH = cssW / aspectRatio
    ctx.clearRect(0, 0, displayW, displayH)

    const shouldDrawText = !!verse && (!media || !mediaReady)
    if (!shouldDrawText) return

    ctx.fillStyle = "rgba(0, 0, 0, 0.45)"
    ctx.fillRect(0, 0, displayW, displayH)

    const effectiveTheme = {
      ...theme,
      background: {
        ...theme.background,
        type: "transparent" as const,
        color: "transparent",
        gradient: null,
        image: null,
        video: null,
      },
    }

    const scale = displayW / theme.resolution.width
    renderVerse(ctx, effectiveTheme, verse, {
      scale,
      imageCache: imageCacheRef.current,
    })
  }, [theme, verse, media, mediaReady])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => drawText())
    ro.observe(container)
    drawText()
    return () => ro.disconnect()
  }, [drawText])

  useEffect(() => {
    drawText()
  }, [drawText])

  useEffect(() => {
    const bg = theme.background
    if (bg.type !== "image" || !bg.image?.url) return
    const url = bg.image.url
    if (imageCacheRef.current.has(url)) return
    const img = new Image()
    img.onload = () => {
      imageCacheRef.current.set(url, img)
      drawText()
    }
    img.onerror = () => console.warn("[CanvasVerse] Theme bg failed:", url.slice(0, 80))
    img.src = url
  }, [theme.background, drawText])

  useEffect(() => {
    const shouldDrawText = !!verse && (!media || !mediaReady)
    if (!shouldDrawText) return
    if (media?.type !== "video" || !mediaReady) return
    let rafId: number
    const tick = () => {
      drawText()
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [media?.id, mediaReady, verse, drawText])

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full overflow-hidden", className)}
      style={{
        background: "#111",
        aspectRatio: `${theme.resolution.width} / ${theme.resolution.height}`,
      }}
    >
      {/* IMAGE LAYER */}
      {media?.type === "image" && (
        <img
          src={mediaSrc}
          alt={media.name}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ zIndex: 1 }}
          crossOrigin="anonymous"
          onLoad={() => {
            console.log("[CanvasVerse] Image ready:", media.name)
            setMediaReady(true)
          }}
          onError={() => {
            console.error("[CanvasVerse] Image failed:", media.name, mediaSrc.slice(0, 60))
            setMediaReady(false)
          }}
        />
      )}

      {/* VIDEO LAYER — key={mediaSrc} forces remount when blob URL is ready */}
      {media?.type === "video" && mediaSrc && (
        <>
          <video
            key={mediaSrc}
            ref={videoRef}
            src={mediaSrc}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ zIndex: 1 }}
            muted
            playsInline
            loop
            preload="auto"
            onLoadedData={(e) => {
              const el = e.currentTarget
              console.log("[CanvasVerse] Video loaded:", media.name, "duration:", el.duration)
              setMediaReady(true)
              el.play().catch((err) => {
                console.warn("[CanvasVerse] Autoplay blocked:", err)
              })
            }}
            onCanPlay={() => console.log("[CanvasVerse] Can play:", media.name)}
            onError={() => {
              console.error("[CanvasVerse] Video error:", media.name, "src:", mediaSrc.slice(0, 60))
              setMediaReady(false)
            }}
          />
          {/* Play overlay — click to start video if autoplay blocked */}
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(0,0,0,0.3)", zIndex: 10 }}
            onClick={(e) => {
              const video = videoRef.current
              if (video) {
                video.play().catch((err) => console.error("Play failed:", err))
                e.currentTarget.style.display = "none"
              }
            }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 64,
                height: 64,
                background: "rgba(255,255,255,0.9)",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>
        </>
      )}

      {/* TEXT OVERLAY — highest z-index, pointer events disabled */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ pointerEvents: "none", zIndex: 5 }}
      />
    </div>
  )
})