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
  isMuted?: boolean
  playbackMode?: 'loop' | 'play-once'
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

// ── Encouraging scripture verse carousel shown on standby ──────────────────
const STANDBY_VERSES = [
  { text: "I can do all things through Christ who strengthens me.",       ref: "Philippians 4:13" },
  { text: "The LORD is my shepherd; I shall not want.",                   ref: "Psalm 23:1"       },
  { text: "For God so loved the world that He gave His only Son.",        ref: "John 3:16"        },
  { text: "Trust in the LORD with all your heart.",                       ref: "Proverbs 3:5"     },
  { text: "Be strong and courageous. Do not be afraid.",                  ref: "Joshua 1:9"       },
  { text: "The joy of the LORD is your strength.",                        ref: "Nehemiah 8:10"    },
  { text: "With God all things are possible.",                            ref: "Matthew 19:26"    },
  { text: "He gives power to the faint, and strength to the powerless.",  ref: "Isaiah 40:29"     },
]

function StandbyVerseCarousel() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const DISPLAY_MS = 6000
  const FADE_MS = 800

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx((i) => (i + 1) % STANDBY_VERSES.length)
        setVisible(true)
      }, FADE_MS)
    }, DISPLAY_MS)
    return () => clearInterval(cycle)
  }, [])

  const verse = STANDBY_VERSES[idx]
  return (
    <div style={{
      maxWidth: "clamp(280px, 46vw, 680px)",
      textAlign: "center",
      transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(8px)",
    }}>
      <div style={{
        fontSize: "clamp(0.85rem, 1.8vw, 1.45rem)",
        fontWeight: 400,
        fontStyle: "italic",
        color: "rgba(226, 232, 240, 0.92)",
        lineHeight: 1.65,
        marginBottom: "clamp(6px, 1vh, 14px)",
        fontFamily: "Georgia, 'Times New Roman', serif",
        textShadow: "0 2px 16px rgba(0,0,0,0.7)",
      }}>
        "{verse.text}"
      </div>
      <div style={{
        fontSize: "clamp(0.6rem, 1vw, 0.9rem)",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "rgba(234, 179, 8, 0.85)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        — {verse.ref}
      </div>
    </div>
  )
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
  const [mediaMuted, setMediaMuted] = useState(true)
  const [mediaLoop, setMediaLoop] = useState(true)
  const [activeVerse, setActiveVerse] = useState<VerseRenderData | null>(null)
  const [activeTheme, setActiveTheme] = useState<BroadcastTheme | null>(null)
  const [showControls, setShowControls] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = mediaMuted
    }
  }, [mediaMuted])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.loop = mediaLoop
    }
  }, [mediaLoop])

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
      const isMuted = payload.isMuted ?? payload.media?.isMuted ?? true
      const playbackMode = payload.playbackMode ?? payload.media?.playbackMode ?? "loop"
      setMediaMuted(isMuted)
      setMediaLoop(playbackMode !== "play-once")
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
          ref={videoRef}
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
          muted={mediaMuted}
          playsInline
          loop={mediaLoop}
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

      {/* ── Standby Screen: animated logo + scripture verse carousel ── */}
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
            overflow: "hidden",
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(20, 30, 55, 0.8) 0%, rgba(4, 6, 14, 1) 80%)",
          }}
        >
          {/* ── Injected CSS animations (no Tailwind needed in this window) ── */}
          <style>{`
            @keyframes sb-spin       { from { transform: rotate(0deg)   } to { transform: rotate(360deg)  } }
            @keyframes sb-spin-rev   { from { transform: rotate(0deg)   } to { transform: rotate(-360deg) } }
            @keyframes sb-pulse-glow { 0%,100% { opacity: 0.55; transform: scale(1)    }
                                       50%      { opacity: 0.9;  transform: scale(1.12) } }
            @keyframes sb-pulse-dot  { 0%,100% { box-shadow: 0 0 6px 2px #22c55e  }
                                       50%      { box-shadow: 0 0 18px 6px #22c55e } }
            @keyframes sb-logo-float { 0%,100% { transform: translateY(0px)   }
                                       50%      { transform: translateY(-10px) } }
            @keyframes sb-fade-verse { 0%       { opacity: 0; transform: translateY(12px) }
                                       12%,88%  { opacity: 1; transform: translateY(0)    }
                                       100%     { opacity: 0; transform: translateY(-8px) } }
            @keyframes sb-shimmer    { 0%   { background-position: -400px 0 }
                                       100% { background-position:  400px 0 } }
          `}</style>

          {/* ── Deep background ambient glow ── */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 55% 45% at 50% 38%, rgba(99, 102, 241, 0.18) 0%, transparent 70%)",
          }} />

          {/* ── Outer slowly-rotating light-ray ring ── */}
          <div style={{
            position: "absolute",
            width: "min(55vw, 55vh)", height: "min(55vw, 55vh)",
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, transparent 0%, rgba(234,179,8,0.06) 10%, transparent 20%, rgba(99,102,241,0.05) 35%, transparent 50%, rgba(234,179,8,0.07) 65%, transparent 80%, rgba(99,102,241,0.04) 90%, transparent 100%)",
            animation: "sb-spin 28s linear infinite",
            pointerEvents: "none",
          }} />

          {/* ── Inner slowly-rotating ring (opposite direction) ── */}
          <div style={{
            position: "absolute",
            width: "min(38vw, 38vh)", height: "min(38vw, 38vh)",
            borderRadius: "50%",
            border: "1px solid rgba(234, 179, 8, 0.08)",
            boxShadow: "0 0 40px rgba(234, 179, 8, 0.06) inset",
            animation: "sb-spin-rev 18s linear infinite",
            pointerEvents: "none",
          }} />

          {/* ── Golden halo glow behind logo ── */}
          <div style={{
            position: "absolute",
            width: "min(22vw, 22vh)", height: "min(22vw, 22vh)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(234,179,8,0.28) 0%, rgba(234,179,8,0.08) 50%, transparent 75%)",
            filter: "blur(18px)",
            animation: "sb-pulse-glow 4s ease-in-out infinite",
            pointerEvents: "none",
          }} />

          {/* ── Logo mark ── */}
          <div style={{ animation: "sb-logo-float 6s ease-in-out infinite", marginBottom: "clamp(16px, 2.5vh, 32px)" }}>
            <img
              src="/rhema.svg"
              alt="Lifestone"
              style={{
                width: "clamp(72px, 10vw, 140px)",
                height: "clamp(72px, 10vw, 140px)",
                filter: "drop-shadow(0 0 28px rgba(234, 179, 8, 0.55)) drop-shadow(0 0 8px rgba(255,255,255,0.15))",
                userSelect: "none",
              }}
            />
          </div>

          {/* ── LIFESTONE wordmark ── */}
          <div style={{
            fontSize: "clamp(1.5rem, 3.5vw, 2.8rem)",
            fontWeight: 800,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#ffffff",
            textShadow: "0 2px 24px rgba(0,0,0,0.9), 0 0 48px rgba(234, 179, 8, 0.3)",
            marginBottom: "clamp(4px, 0.8vh, 10px)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            background: "linear-gradient(135deg, #ffffff 30%, #fde68a 60%, #ffffff 90%)",
            backgroundSize: "800px 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "sb-shimmer 5s linear infinite",
          }}>
            LIFESTONE
          </div>

          {/* ── Tagline ── */}
          <div style={{
            fontSize: "clamp(0.65rem, 1.1vw, 0.95rem)",
            fontWeight: 500,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(148, 163, 184, 0.75)",
            marginBottom: "clamp(20px, 3.5vh, 40px)",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>
            Real-time Bible for Live Worship
          </div>

          {/* ── Rotating encouraging scripture carousel ── */}
          <StandbyVerseCarousel />

          {/* ── Live-ready badge ── */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 20px",
            borderRadius: 9999,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backgroundColor: "rgba(10, 16, 36, 0.75)",
            backdropFilter: "blur(14px)",
            marginTop: "clamp(20px, 3.5vh, 44px)",
          }}>
            <span style={{
              width: 9, height: 9, borderRadius: "50%",
              backgroundColor: "#22c55e",
              display: "inline-block",
              animation: "sb-pulse-dot 2.2s ease-in-out infinite",
            }} />
            <span style={{
              fontSize: "clamp(0.6rem, 0.9vw, 0.8rem)",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#e2e8f0",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}>
              {OUTPUT_ID === "alt" ? "Alt Projector" : "Program Output"} · Connected & Ready
            </span>
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