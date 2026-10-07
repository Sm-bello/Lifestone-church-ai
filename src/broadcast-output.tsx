import { createRoot } from "react-dom/client"
import { useRef, useEffect, useCallback, useState } from "react"
import { invoke, convertFileSrc } from "@tauri-apps/api/core"
import { readFile } from "@tauri-apps/plugin-fs"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import { emit, emitTo, listen } from "@tauri-apps/api/event"
import { renderVerse } from "@/lib/verse-renderer"
import type { BroadcastTheme, VerseRenderData, MediaItem } from "@/types/broadcast"
import type { NdiConfigEventPayload, NdiFrameRequest } from "@/types"

function uint8ToBase64(bytes: Uint8Array | Uint8ClampedArray): string {
  const CHUNK = 0x8000
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(
      String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + CHUNK) as unknown as number[]
      )
    )
  }
  return btoa(parts.join(""))
}

const OUTPUT_ID = (() => {
  const param = new URLSearchParams(window.location.search).get("output")
  if (param) return param
  try {
    const label = getCurrentWebviewWindow().label
    if (label.includes("alt")) return "alt"
  } catch {}
  return "main"
})()

interface BroadcastPayload {
  theme: BroadcastTheme
  verse: VerseRenderData | null
  outputId?: string
}

interface MediaUpdatePayload {
  media: MediaItem | null
  isPlaying: boolean
  base64Data?: string
  outputId?: string
}

function resolveMediaSrc(media: MediaItem | null): string {
  if (!media) return ""
  if (media.assetUrl) return media.assetUrl
  if (!media.path) return ""
  if (/^(https?|blob|data):/i.test(media.path)) return media.path
  try {
    return convertFileSrc(media.path)
  } catch (e) {
    console.error("[resolveMediaSrc] failed:", e)
    return media.path
  }
}

function useMediaSrc(media: MediaItem | null): string {
  const [src, setSrc] = useState("")

  useEffect(() => {
    let cancelled = false
    let blobUrl = ""

    const load = async () => {
      if (!media) {
        if (!cancelled) setSrc("")
        return
      }

      if (media.assetUrl) {
        if (!cancelled) setSrc(media.assetUrl)
        return
      }

      if (!media.path) {
        if (!cancelled) setSrc("")
        return
      }

      if (/^(https?|blob|data):/i.test(media.path)) {
        if (!cancelled) setSrc(media.path)
        return
      }

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
          blobUrl = URL.createObjectURL(
            new Blob([bytes], { type: mimeMap[ext] || "video/mp4" })
          )
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
  }, [media?.id, media?.type, media?.path, media?.assetUrl])

  return src
}

export function BroadcastCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaContainerRef = useRef<HTMLDivElement>(null)
  const latestData = useRef<BroadcastPayload | null>(null)
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const ndiConfigRef = useRef<NdiConfigEventPayload>({
    active: false,
    fps: 24,
    width: 1920,
    height: 1080,
  })
  const ndiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastPushRef = useRef(0)
  const pushingRef = useRef(false)
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null)
  const [mediaReady, setMediaReady] = useState(false)
  const [activeVerse, setActiveVerse] = useState<VerseRenderData | null>(null)
  const [activeTheme, setActiveTheme] = useState<BroadcastTheme | null>(null)
  const [showControls, setShowControls] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const mediaSrc = useMediaSrc(currentMedia)

  // Wake and auto-hide floating control bar on mouse movement
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false)
    }, 3200)
  }, [])

  // Window control actions
  const handleMinimize = useCallback(async () => {
    try {
      const win = getCurrentWebviewWindow()
      await win.minimize()
    } catch (e) {
      console.warn("Minimize error:", e)
    }
  }, [])

  const handleToggleFullscreen = useCallback(async () => {
    try {
      const win = getCurrentWebviewWindow()
      const current = await win.isFullscreen().catch(() => false)
      await win.setFullscreen(!current)
      setIsFullscreen(!current)
    } catch (e) {
      console.warn("Fullscreen toggle error:", e)
    }
  }, [])

  const handleClose = useCallback(async () => {
    try {
      // Hide the window immediately — 0ms lag
      const win = getCurrentWebviewWindow()
      await win.hide().catch(() => {})
      invoke("close_broadcast_window", { outputId: OUTPUT_ID }).catch(() => {})
    } catch (e) {
      console.warn("Close window error:", e)
    }
  }, [])

  // Draw scripture verse or theme background to canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = mediaContainerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return

    canvas.width = w
    canvas.height = h
    ctx.clearRect(0, 0, w, h)

    const payload = latestData.current
    if (!payload?.theme) {
      return
    }

    const { theme, verse } = payload
    // When media is active (image/video), display the media clean without scripture text overlay
    const shouldDrawText = !!verse && !currentMedia

    if (shouldDrawText) {
      const scale = w / theme.resolution.width
      renderVerse(ctx, theme, verse, {
        scale,
        imageCache: imageCacheRef.current,
      })
    }
  }, [currentMedia])

  const preloadBackgroundImage = useCallback(
    (theme: BroadcastTheme) => {
      const bg = theme.background
      if (bg.type !== "image" || !bg.image?.url) return
      const url = bg.image.url
      if (imageCacheRef.current.has(url)) return
      const img = new Image()
      img.onload = () => {
        imageCacheRef.current.set(url, img)
        draw()
      }
      img.onerror = () => console.warn("[broadcast-output] bg failed:", url)
      img.src = url
    },
    [draw]
  )

  const pushNdiFrame = useCallback(async () => {
    if (!ndiConfigRef.current.active || pushingRef.current) return
    pushingRef.current = true
    try {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const tw = ndiConfigRef.current.width
      const th = ndiConfigRef.current.height
      let sc = ctx,
        sw = canvas.width,
        sh = canvas.height

      if (canvas.width !== tw || canvas.height !== th) {
        const nc = ndiCanvasRef.current ?? document.createElement("canvas")
        nc.width = tw
        nc.height = th
        const nx = nc.getContext("2d")
        if (!nx) return
        nx.drawImage(canvas, 0, 0, tw, th)
        ndiCanvasRef.current = nc
        sc = nx
        sw = tw
        sh = th
      }

      const id = sc.getImageData(0, 0, sw, sh)
      await invoke("push_ndi_frame", {
        request: {
          outputId: OUTPUT_ID,
          width: sw,
          height: sh,
          rgbaBase64: uint8ToBase64(id.data),
        } as NdiFrameRequest,
      })
      lastPushRef.current = Date.now()
    } catch (e) {
      console.warn("[broadcast-output] NDI push failed", e)
    } finally {
      pushingRef.current = false
    }
  }, [])

  const pushNdiBurst = useCallback(() => {
    void pushNdiFrame()
    setTimeout(() => void pushNdiFrame(), 150)
    setTimeout(() => void pushNdiFrame(), 300)
  }, [pushNdiFrame])

  // Video render tick
  useEffect(() => {
    if (!latestData.current?.verse) return
    if (currentMedia?.type !== "video" || !mediaReady) return

    let rafId: number
    const tick = () => {
      draw()
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [currentMedia, mediaReady, draw])

  // Setup listeners and bidirectional sync
  useEffect(() => {
    const currentWindow = getCurrentWebviewWindow()
    currentWindow.isFullscreen().then(setIsFullscreen).catch(() => {})

    const handleVerseUpdate = (payload: BroadcastPayload) => {
      if (payload.outputId && payload.outputId !== OUTPUT_ID) return
      latestData.current = payload
      setActiveVerse(payload.verse)
      setActiveTheme(payload.theme)
      preloadBackgroundImage(payload.theme)
      draw()
      pushNdiBurst()
    }

    // Listen locally to window events
    const unlistenWindowVerse = currentWindow.listen<BroadcastPayload>(
      "broadcast:verse-update",
      (event) => handleVerseUpdate(event.payload)
    )

    // Also listen to global broadcast events
    const unlistenGlobalVerse = listen<BroadcastPayload>(
      "broadcast:verse-update",
      (event) => handleVerseUpdate(event.payload)
    )

    const unlistenNdiConfig = currentWindow.listen<NdiConfigEventPayload>(
      "broadcast:ndi-config",
      (event) => {
        ndiConfigRef.current = event.payload
        if (event.payload.active) pushNdiBurst()
      }
    )

    const handleMediaUpdate = (payload: MediaUpdatePayload) => {
      if (payload.outputId && payload.outputId !== OUTPUT_ID) return
      setCurrentMedia(payload.media)
      setMediaReady(false)
    }

    const unlistenWindowMedia = currentWindow.listen<MediaUpdatePayload>(
      "broadcast:media-update",
      (event) => handleMediaUpdate(event.payload)
    )

    const unlistenGlobalMedia = listen<MediaUpdatePayload>(
      "broadcast:media-update",
      (event) => handleMediaUpdate(event.payload)
    )

    // Handshake burst: Announce ready to main window repeatedly until initial theme/verse arrives
    const announceReady = () => {
      console.log("[broadcast-output] Announcing ready for output:", OUTPUT_ID)
      void currentWindow.emitTo("main", "broadcast:output-ready", { output: OUTPUT_ID }).catch((e) => {
        console.warn("[broadcast-output] emitTo main failed:", e)
      })
      void emit("broadcast:output-ready", { output: OUTPUT_ID }).catch((e) => {
        console.warn("[broadcast-output] global emit failed:", e)
      })
    }

    // Announce immediately, then retry every 300ms for up to 10 seconds
    announceReady()
    let retryCount = 0
    const syncInterval = setInterval(() => {
      if (!latestData.current && retryCount < 33) {
        retryCount++
        announceReady()
      } else {
        clearInterval(syncInterval)
      }
    }, 300)

    // Check NDI status
    void invoke<{ active: boolean; width: number; height: number; fps: number } | null>(
      "get_ndi_status",
      { outputId: OUTPUT_ID }
    )
      .then((status) => {
        if (status?.active) {
          ndiConfigRef.current = {
            active: true,
            fps: status.fps,
            width: status.width,
            height: status.height,
          }
        }
      })
      .catch(() => {})

    // Keyboard shortcuts: Escape to exit fullscreen, F11 to toggle
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        currentWindow.isFullscreen().then((fs) => {
          if (fs) {
            void currentWindow.setFullscreen(false)
            setIsFullscreen(false)
          } else {
            void handleMinimize()
          }
        }).catch(() => {})
      } else if (e.key === "F11") {
        e.preventDefault()
        void handleToggleFullscreen()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      clearInterval(syncInterval)
      window.removeEventListener("keydown", handleKeyDown)
      unlistenWindowVerse.then((fn) => fn())
      unlistenGlobalVerse.then((fn) => fn())
      unlistenNdiConfig.then((fn) => fn())
      unlistenWindowMedia.then((fn) => fn())
      unlistenGlobalMedia.then((fn) => fn())
    }
  }, [draw, preloadBackgroundImage, pushNdiBurst, handleMinimize, handleToggleFullscreen])

  // Periodic NDI frame push
  useEffect(() => {
    const timer = setInterval(() => {
      if (!ndiConfigRef.current.active) return
      if (Date.now() - lastPushRef.current > 2000) void pushNdiFrame()
    }, 2000)
    return () => clearInterval(timer)
  }, [pushNdiFrame])

  // Resize listener to re-draw canvas
  useEffect(() => {
    const handleResize = () => draw()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [draw])

  return (
    <div
      ref={mediaContainerRef}
      onMouseMove={handleMouseMove}
      onDoubleClick={handleToggleFullscreen}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        background: activeTheme?.background?.color || "radial-gradient(ellipse at center, #0d121f 0%, #05070b 70%, #000000 100%)",
        overflow: "hidden",
        cursor: showControls ? "default" : "none",
      }}
    >
      {/* Media Layer (Image Background) */}
      {currentMedia?.type === "image" && (
        <img
          src={mediaSrc}
          alt="broadcast"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          crossOrigin="anonymous"
          onLoad={() => {
            setMediaReady(true)
            draw()
            pushNdiBurst()
          }}
          onError={() => {
            console.error("[broadcast-output] img error")
            setMediaReady(false)
          }}
        />
      )}

      {/* Media Layer (Video Background) */}
      {currentMedia?.type === "video" && mediaSrc && (
        <video
          key={mediaSrc}
          src={mediaSrc}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          muted
          playsInline
          loop
          preload="auto"
          autoPlay
          onCanPlay={(e) => {
            setMediaReady(true)
            e.currentTarget.play().catch(() => {})
          }}
          onLoadedData={(e) => {
            setMediaReady(true)
            e.currentTarget.play().catch(() => {})
            draw()
            pushNdiBurst()
          }}
          onError={() => {
            setMediaReady(false)
          }}
        />
      )}

      {/* Standby Church Live Display (EasyWorship Style) when no verse is active */}
      {!activeVerse && !currentMedia && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            background: "radial-gradient(circle at 50% 45%, rgba(30, 41, 59, 0.45) 0%, rgba(5, 7, 12, 0.95) 75%)",
          }}
        >
          {/* Subtle Church Cross & Radiance Emblem */}
          <div
            style={{
              position: "relative",
              width: 120,
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(234, 179, 8, 0.22) 0%, rgba(234, 179, 8, 0.0) 70%)",
                filter: "blur(8px)",
              }}
            />
            <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {/* Modern elegant Latin Cross */}
              <path
                d="M12 3V21M7 8H17"
                stroke="#eab308"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="8"
                r="3.5"
                stroke="#fef08a"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.6"
              />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#ffffff",
              textShadow: "0 2px 16px rgba(0,0,0,0.8), 0 0 30px rgba(234, 179, 8, 0.25)",
              marginBottom: 8,
              fontFamily: "inherit",
            }}
          >
            LIFESTONE
          </div>

          {/* Subtitle / Live Output Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 9999,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backgroundColor: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(12px)",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#22c55e",
                boxShadow: "0 0 10px #22c55e",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#e2e8f0",
              }}
            >
              LIVE OUTPUT · {OUTPUT_ID === "alt" ? "ALT PROJECTOR" : "PROGRAM"}
            </span>
          </div>

          <div
            style={{
              fontSize: "0.875rem",
              color: "rgba(148, 163, 184, 0.8)",
              letterSpacing: "0.05em",
              maxWidth: 420,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Connected & Ready · Detected scriptures and selected verses will project here automatically
          </div>
        </div>
      )}

      {/* Canvas Layer (Renders Live Verses) */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* Floating Top-Right Window Controls (Minimize, Maximize, Close) */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 10,
          backgroundColor: "rgba(15, 23, 42, 0.82)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
          opacity: showControls ? 1 : 0,
          transform: showControls ? "translateY(0)" : "translateY(-8px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          zIndex: 50,
          pointerEvents: showControls ? "auto" : "none",
        }}
      >
        <span
          style={{
            fontSize: "0.6875rem",
            color: "#94a3b8",
            fontWeight: 600,
            paddingRight: 8,
            borderRight: "1px solid rgba(255, 255, 255, 0.1)",
            letterSpacing: "0.05em",
          }}
        >
          {OUTPUT_ID === "alt" ? "ALT" : "PROJECTOR"}
        </span>

        {/* Minimize Button */}
        <button
          onClick={handleMinimize}
          title="Minimize window"
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            borderRadius: 6,
            color: "#cbd5e1",
            cursor: "pointer",
            transition: "background-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
            e.currentTarget.style.color = "#ffffff"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent"
            e.currentTarget.style.color = "#cbd5e1"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Maximize / Fullscreen Button */}
        <button
          onClick={handleToggleFullscreen}
          title={isFullscreen ? "Restore window (F11)" : "Maximize fullscreen (F11)"}
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            borderRadius: 6,
            color: "#cbd5e1",
            cursor: "pointer",
            transition: "background-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
            e.currentTarget.style.color = "#ffffff"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent"
            e.currentTarget.style.color = "#cbd5e1"
          }}
        >
          {isFullscreen ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </button>

        {/* Close Button */}
        <button
          onClick={handleClose}
          title="Close projector window (Esc)"
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            borderRadius: 6,
            color: "#f87171",
            cursor: "pointer",
            transition: "background-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)"
            e.currentTarget.style.color = "#ffffff"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent"
            e.currentTarget.style.color = "#f87171"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

const root = document.getElementById("broadcast-root")!
createRoot(root).render(<BroadcastCanvas />)