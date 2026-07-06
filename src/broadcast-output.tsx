import { createRoot } from "react-dom/client"
import { useRef, useEffect, useCallback, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { convertFileSrc } from "@tauri-apps/api/core"
import { readFile } from "@tauri-apps/plugin-fs"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
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

const OUTPUT_ID = new URLSearchParams(window.location.search).get("output") ?? "main"

interface BroadcastPayload {
  theme: BroadcastTheme
  verse: VerseRenderData | null
}

interface MediaUpdatePayload {
  media: MediaItem | null
  isPlaying: boolean
  base64Data?: string
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

  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null)
  const [mediaReady, setMediaReady] = useState(false)

  const mediaSrc = useMediaSrc(currentMedia)

  const logDebug = useCallback((message: string, meta?: unknown) => {
    console.log(`[broadcast-output] ${message}`, meta ?? "")
  }, [])

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

    if (!latestData.current) {
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, w, h)
      return
    }

    const { theme, verse } = latestData.current
    const shouldDrawText = !!verse && (!currentMedia || !mediaReady)
    if (!shouldDrawText) return

    ctx.fillStyle = "rgba(0, 0, 0, 0.45)"
    ctx.fillRect(0, 0, w, h)

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

    const scale = w / theme.resolution.width
    renderVerse(ctx, effectiveTheme, verse, {
      scale,
      imageCache: imageCacheRef.current,
    })
  }, [currentMedia, mediaReady])

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

  useEffect(() => {
    const shouldDrawText = !!latestData.current?.verse && (!currentMedia || !mediaReady)
    if (!shouldDrawText) return
    if (currentMedia?.type !== "video" || !mediaReady) return

    let rafId: number
    const tick = () => {
      draw()
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [currentMedia, mediaReady, draw])

  useEffect(() => {
    const currentWindow = getCurrentWebviewWindow()
    logDebug("Mounting", { label: currentWindow.label, outputId: OUTPUT_ID })

    const unlisten = currentWindow.listen<BroadcastPayload>(
      "broadcast:verse-update",
      (event) => {
        latestData.current = event.payload
        preloadBackgroundImage(event.payload.theme)
        draw()
        pushNdiBurst()
      }
    )

    const unlistenNdiConfig = currentWindow.listen<NdiConfigEventPayload>(
      "broadcast:ndi-config",
      (event) => {
        ndiConfigRef.current = event.payload
        if (event.payload.active) pushNdiBurst()
      }
    )

    const unlistenMedia = currentWindow.listen<MediaUpdatePayload>(
      "broadcast:media-update",
      (event) => {
        const payload = event.payload
        logDebug("media-update", {
          type: payload.media?.type,
          src: resolveMediaSrc(payload.media).slice(0, 60),
        })

        setCurrentMedia(payload.media)
        setMediaReady(false)
      }
    )

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

    void currentWindow.emitTo("main", "broadcast:output-ready").catch(() => {})

    return () => {
      unlisten.then((fn) => fn())
      unlistenNdiConfig.then((fn) => fn())
      unlistenMedia.then((fn) => fn())
    }
  }, [draw, logDebug, preloadBackgroundImage, pushNdiFrame, pushNdiBurst])

  useEffect(() => {
    const timer = setInterval(() => {
      if (!ndiConfigRef.current.active) return
      if (Date.now() - lastPushRef.current > 2000) void pushNdiFrame()
    }, 2000)
    return () => clearInterval(timer)
  }, [pushNdiFrame])

  return (
    <div
      ref={mediaContainerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        background: "#000",
        overflow: "hidden",
      }}
    >
      {currentMedia?.type === "image" && (
        <img
          src={mediaSrc}
          alt="broadcast"
          className="absolute inset-0 h-full w-full object-cover"
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

      {currentMedia?.type === "video" && mediaSrc && (
        <>
          <video
            src={mediaSrc}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            playsInline
            loop
            preload="auto"
            autoPlay
            onLoadedData={(e) => {
              const el = e.currentTarget
              console.log("[broadcast-output] Video loaded:", currentMedia?.name, "duration:", el.duration)
              setMediaReady(true)
              el.play().catch((err) => {
                console.warn("[broadcast-output] Autoplay blocked:", err)
              })
              draw()
              pushNdiBurst()
            }}
            onCanPlay={() => console.log("[broadcast-output] Can play:", currentMedia?.name)}
            onError={() => {
              console.error("[broadcast-output] Video error:", currentMedia?.name, "src:", mediaSrc.slice(0, 80))
              setMediaReady(false)
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(0,0,0,0.3)", zIndex: 10 }}
            onClick={(e) => {
              const video = e.currentTarget.previousElementSibling as HTMLVideoElement
              if (video) {
                video.play().catch((err) => console.error("Play failed:", err))
                e.currentTarget.style.display = "none"
              }
            }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 80,
                height: 80,
                background: "rgba(255,255,255,0.9)",
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>
        </>
      )}

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
    </div>
  )
}

const root = document.getElementById("broadcast-root")!
createRoot(root).render(<BroadcastCanvas />)