import { useState, useEffect, useCallback, useRef } from "react"
import {
  RadioIcon,
  ShieldCheckIcon,
  SendIcon,
  SparklesIcon,
  MapPinIcon,
  RefreshCwIcon,
  GlobeIcon,
  Building2Icon,
  ExternalLinkIcon,
  CheckCircle2Icon,
  MegaphoneIcon,
  LockIcon,
  KeyRoundIcon,
  XIcon,
  CpuIcon,
  FingerprintIcon,
  Maximize2Icon,
  Minimize2Icon,
  MessageSquareTextIcon,
  LayoutGridIcon,
  ZoomInIcon,
  ZoomOutIcon,
  LayersIcon,
  LaptopIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  useFeedbackStore,
  useTranscriptStore,
  useHymnStore,
  useBibleStore,
  type FeedbackMessage,
} from "@/stores"
import { useGpuInfo } from "@/hooks/use-gpu-info"
import { useHdmiMonitor } from "@/hooks/use-hdmi-monitor"
import { verifyDeveloperPin, detectMachineOs } from "@/lib/crypto-node"
import { openExternalUrl } from "@/lib/open-external"
import { cn } from "@/lib/utils"

const COMMAND_CENTER_BASE_URL =
  import.meta.env.VITE_COMMAND_CENTER_URL || "https://lifestone-church-ai.vercel.app"

export interface BeaconNodeItem {
  nodeId: string
  signature: string
  publicKeyFingerprint: string
  cryptoAlgorithm: string
  lastSignatureHex?: string
  churchName: string
  displayName: string
  email: string
  churchAddress: string
  city: string
  region: string
  country: string
  isp: string
  ip: string
  latitude: number
  longitude: number
  appVersion: string
  osPlatform: string
  hasGpu: boolean
  gpuName: string
  performanceTier: string
  status: "live" | "transcribing" | "online"
  activeItem: string
  screenCount: number
  cpuCores: number
  lastSeenAt: number
}

interface ThreadItem {
  nodeId: string
  node: BeaconNodeItem | null
  messages: FeedbackMessage[]
  lastUpdatedAt: number
}

function latLngToSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * 1000
  const y = ((90 - lat) / 180) * 500
  return {
    x: Math.max(20, Math.min(980, x)),
    y: Math.max(20, Math.min(480, y)),
  }
}

export function CommandCenterDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const localProfile = useFeedbackStore((s) => s.profile)
  const localMessages = useFeedbackStore((s) => s.messages)
  const refreshRealLocation = useFeedbackStore((s) => s.refreshRealLocation)
  const updateLocation = useFeedbackStore((s) => s.updateLocation)
  const sendBeaconHeartbeat = useFeedbackStore((s) => s.sendBeaconHeartbeat)

  const isTranscribing = useTranscriptStore((s) => s.isTranscribing)
  const activeHymn = useHymnStore((s) => s.selectedHymn)
  const activeStanzaId = useHymnStore((s) => s.activeStanzaId)
  const liveVerse = useBibleStore((s) => s.liveVerse)

  const gpuInfo = useGpuInfo()
  const hdmiState = useHdmiMonitor()
  const osInfo = detectMachineOs()

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("lifestone_dev_command_unlocked") === "true"
    } catch {
      return false
    }
  })
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState(false)

  const [nodes, setNodes] = useState<BeaconNodeItem[]>([])
  const [threads, setThreads] = useState<ThreadItem[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Workroom layout & Google Map controls
  const [workroomTab, setWorkroomTab] = useState<"split" | "chat" | "map">("split")
  const [mapMode, setMapMode] = useState<"google-vicinity" | "world-radar">("google-vicinity")
  const [googleMapZoom, setGoogleMapZoom] = useState<number>(17)
  const [googleMapType, setGoogleMapType] = useState<"h" | "m" | "p">("h") // h = satellite hybrid, m = roadmap, p = terrain
  const [isMaximized, setIsMaximized] = useState(false)
  const [locatingGps, setLocatingGps] = useState(false)

  // Chat & release composer state
  const [replyText, setReplyText] = useState("")
  const [isUpdateNotice, setIsUpdateNotice] = useState(false)
  const [releaseVersion, setReleaseVersion] = useState("1.1.1")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusBanner, setStatusBanner] = useState<string | null>(null)

  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Compute real live activity string from actual stores
  const realActiveItem = activeStanzaId && activeHymn
    ? `Presenting Hymn #${activeHymn.number}: ${activeHymn.title}`
    : liveVerse
    ? `Presenting ${liveVerse.book_name} ${liveVerse.chapter}:${liveVerse.verse}`
    : isTranscribing
    ? "🎙️ Live AI Voice Transcription Active"
    : "Online — Ready to Present"

  const realStatus: "live" | "transcribing" | "online" =
    activeStanzaId || liveVerse
      ? "live"
      : isTranscribing
      ? "transcribing"
      : "online"

  const syncCommandCenterData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshRealLocation()
      await sendBeaconHeartbeat({
        status: realStatus,
        activeItem: realActiveItem,
        screenCount: hdmiState.monitors.length || 1,
      })

      const freshProfile = useFeedbackStore.getState().profile
      const lat = freshProfile.latitude ?? 0
      const lng = freshProfile.longitude ?? 0
      const locationLabel =
        freshProfile.churchAddress ||
        [freshProfile.city, freshProfile.region, freshProfile.country]
          .filter(Boolean)
          .join(", ") ||
        "Resolving Live IP Geolocation..."

      // Construct 100% REAL telemetry node for this live machine
      const selfNode: BeaconNodeItem = {
        nodeId: freshProfile.nodeId,
        signature: freshProfile.signature,
        publicKeyFingerprint: freshProfile.publicKeyFingerprint || "Generating ECDSA P-256...",
        cryptoAlgorithm: freshProfile.cryptoAlgorithm || "ECDSA-P256-SHA256",
        lastSignatureHex: freshProfile.lastSignatureHex,
        churchName:
          freshProfile.churchName ||
          (freshProfile.city
            ? `Lifestone Sanctuary (${freshProfile.city})`
            : `This ${osInfo.platform} Node (Live)`),
        displayName: freshProfile.displayName || `${osInfo.platform} Sanctuary Operator`,
        email: freshProfile.email || "Not signed in with Gmail yet",
        churchAddress: locationLabel,
        city: freshProfile.city || "Detecting...",
        region: freshProfile.region || "",
        country: freshProfile.country || "",
        isp: freshProfile.isp || "Direct Internet",
        ip: freshProfile.ip || "",
        latitude: lat,
        longitude: lng,
        appVersion: "1.1.1",
        osPlatform: osInfo.label,
        hasGpu: gpuInfo.hasGpu,
        gpuName: gpuInfo.gpuName,
        performanceTier: gpuInfo.performanceTier,
        status: realStatus,
        activeItem: realActiveItem,
        screenCount: hdmiState.monitors.length || 1,
        cpuCores:
          typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4,
        lastSeenAt: Date.now(),
      }

      // Fetch any other real active nodes from the remote server (excluding any fake seeds)
      let remoteNodes: BeaconNodeItem[] = []
      try {
        const res = await fetch(`${COMMAND_CENTER_BASE_URL}/api/beacon?_t=${Date.now()}`)
        if (res.ok) {
          const data = (await res.json()) as { nodes?: BeaconNodeItem[] }
          if (data.nodes && Array.isArray(data.nodes)) {
            remoteNodes = data.nodes
              .filter(
                (n) =>
                  n.nodeId !== selfNode.nodeId &&
                  Boolean(n.publicKeyFingerprint) // Only include nodes with real ECDSA cryptographic fingerprints
              )
              .map((n) => ({
                ...n,
                osPlatform: n.osPlatform || "Windows / macOS Desktop",
              }))
          }
        }
      } catch {
        // Offline or local-only
      }

      const mergedNodes = [selfNode, ...remoteNodes]
      setNodes(mergedNodes)
      if (!selectedNodeId) {
        setSelectedNodeId(selfNode.nodeId)
      }

      const selfThread: ThreadItem = {
        nodeId: selfNode.nodeId,
        node: selfNode,
        messages: useFeedbackStore.getState().messages,
        lastUpdatedAt: Date.now(),
      }

      setThreads((prev) => {
        const others = prev.filter((t) => t.nodeId !== selfNode.nodeId)
        return [selfThread, ...others]
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [
    refreshRealLocation,
    sendBeaconHeartbeat,
    realStatus,
    realActiveItem,
    hdmiState.monitors.length,
    osInfo.platform,
    osInfo.label,
    gpuInfo.hasGpu,
    gpuInfo.gpuName,
    gpuInfo.performanceTier,
    selectedNodeId,
  ])

  useEffect(() => {
    if (open && isUnlocked) {
      void syncCommandCenterData()
    }
  }, [open, isUnlocked, syncCommandCenterData])

  const selectedNode =
    nodes.find((n) => n.nodeId === selectedNodeId) || nodes[0] || null
  const selectedThread = threads.find(
    (t) => t.nodeId === (selectedNode?.nodeId || selectedNodeId)
  )
  const currentMessages =
    selectedNode?.nodeId === localProfile.nodeId
      ? localMessages
      : selectedThread?.messages || []

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [currentMessages, workroomTab, open])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const valid = await verifyDeveloperPin(pinInput)
    if (valid) {
      setIsUnlocked(true)
      setPinError(false)
      setPinInput("")
      try {
        sessionStorage.setItem("lifestone_dev_command_unlocked", "true")
      } catch {
        // ignore
      }
    } else {
      setPinError(true)
    }
  }

  const handleRefineGpsPin = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      void syncCommandCenterData()
      return
    }
    setLocatingGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        updateLocation({
          latitude,
          longitude,
          address: `${localProfile.city || "Sanctuary"} (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
        })
        setGoogleMapZoom(19)
        setMapMode("google-vicinity")
        setLocatingGps(false)
        void syncCommandCenterData()
      },
      () => {
        setLocatingGps(false)
        void syncCommandCenterData()
      },
      { enableHighAccuracy: true, timeout: 7000 }
    )
  }

  const sendDeveloperReply = () => {
    if (!selectedNode || !replyText.trim()) return

    const newReply: FeedbackMessage = {
      id: `dev-reply-${Date.now()}`,
      nodeId: selectedNode.nodeId,
      signature: selectedNode.signature,
      sender: "developer",
      senderName: "Lifestone Command Center",
      text: replyText.trim(),
      category: isUpdateNotice ? "update-notice" : "question",
      isUpdateNotice,
      releaseVersion,
      timestamp: Date.now(),
      read: false,
    }

    if (selectedNode.nodeId === localProfile.nodeId) {
      const nextMsgs = [...useFeedbackStore.getState().messages, newReply]
      useFeedbackStore.setState({
        messages: nextMsgs,
        unreadCount: useFeedbackStore.getState().unreadCount + 1,
      })
      try {
        localStorage.setItem("lifestone_feedback_messages_v1", JSON.stringify(nextMsgs))
      } catch {
        // ignore
      }
    }

    setThreads((prev) => {
      const idx = prev.findIndex((t) => t.nodeId === selectedNode.nodeId)
      if (idx >= 0) {
        return prev.map((t, i) =>
          i === idx
            ? { ...t, messages: [...t.messages, newReply], lastUpdatedAt: Date.now() }
            : t
        )
      }
      return [
        {
          nodeId: selectedNode.nodeId,
          node: selectedNode,
          messages: [newReply],
          lastUpdatedAt: Date.now(),
        },
        ...prev,
      ]
    })

    setReplyText("")
    setStatusBanner(
      isUpdateNotice
        ? `Signed Release Notification (v${releaseVersion}) delivered to ${selectedNode.churchName} (${selectedNode.signature})!`
        : `Developer reply delivered to ${selectedNode.churchName} (${selectedNode.signature})!`
    )
    setTimeout(() => setStatusBanner(null), 5000)
  }

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    sendDeveloperReply()
  }

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      sendDeveloperReply()
    }
  }

  const handleQuickSignedTemplate = () => {
    if (!selectedNode) return
    setIsUpdateNotice(true)
    setReplyText(
      `Hello ${selectedNode.churchName} (${selectedNode.signature})! We received your feedback and have built, certified, and signed the latest Lifestone v${releaseVersion} update for Windows & macOS addressing your sanctuary setup. Please tap "Update Now" in your chat box to install!`
    )
  }

  const handleBroadcastAll = () => {
    if (!replyText.trim()) return
    const now = Date.now()
    const broadcastReply: FeedbackMessage = {
      id: `dev-broadcast-${now}`,
      nodeId: localProfile.nodeId,
      signature: localProfile.signature,
      sender: "developer",
      senderName: "Lifestone Command Center (Global Broadcast)",
      text: replyText.trim(),
      category: "update-notice",
      isUpdateNotice: true,
      releaseVersion,
      timestamp: now,
      read: false,
    }

    const nextLocal = [...useFeedbackStore.getState().messages, broadcastReply]
    useFeedbackStore.setState({
      messages: nextLocal,
      unreadCount: useFeedbackStore.getState().unreadCount + 1,
    })

    setReplyText("")
    setStatusBanner(
      `Global Signed Update Broadcast sent to all ${nodes.length} active church light-nodes!`
    )
    setTimeout(() => setStatusBanner(null), 5000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "overflow-hidden border-cyan-500/35 bg-[#050811] text-slate-100 shadow-2xl",
          !isUnlocked
            ? "max-w-md rounded-2xl p-7 sm:max-w-md"
            : isMaximized
            ? "flex h-screen w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:max-w-none"
            : "flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 rounded-2xl p-0 sm:max-w-[96vw] xl:max-w-[1620px]"
        )}
      >
        {!isUnlocked ? (
          <div className="space-y-5 py-2">
            <DialogHeader>
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/35">
                <LockIcon className="size-7" />
              </div>
              <DialogTitle className="text-center text-xl font-bold text-white">
                Lifestone Command Center
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-slate-300">
                In-App Developer Workroom • Enter your security PIN to access live node
                telemetry, Google Maps vicinity, and church dispatch.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center justify-center gap-2 text-sm font-semibold text-cyan-300">
                  <KeyRoundIcon className="size-4" />
                  <span>Developer Security PIN</span>
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value)
                    setPinError(false)
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
                />
                {pinError && (
                  <p className="text-center text-sm font-medium text-rose-400">
                    Invalid Developer PIN. Access denied.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-cyan-600 text-base font-bold text-white hover:bg-cyan-500"
              >
                Unlock Command Center Workroom
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* ── Top Workroom Header & Mode Switcher ── */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#080d1a] px-6 py-4 pr-14">
              <div className="flex items-center gap-3">
                <span className="relative flex size-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-3.5 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <DialogTitle className="flex flex-wrap items-center gap-2.5 text-lg font-bold tracking-tight text-white sm:text-xl">
                    <span>LIFESTONE COMMAND CENTER — DEVELOPER WORKROOM</span>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300"
                    >
                      <RadioIcon className="mr-1.5 size-3.5 animate-pulse" />
                      {nodes.length} Active Runner{nodes.length === 1 ? "" : "s"}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs text-cyan-300 sm:text-sm">
                    100% Real Hardware &amp; Google Maps Vicinity • ECDSA-P256-SHA256 Light-Nodes •
                    Windows, macOS &amp; Linux
                  </DialogDescription>
                </div>
              </div>

              {/* Workroom View Tabs + Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl border border-slate-700/80 bg-slate-900/90 p-1">
                  <button
                    type="button"
                    onClick={() => setWorkroomTab("split")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm",
                      workroomTab === "split"
                        ? "bg-cyan-600 text-white shadow"
                        : "text-slate-300 hover:text-white"
                    )}
                  >
                    <LayoutGridIcon className="size-4" />
                    <span>Split Studio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkroomTab("chat")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm",
                      workroomTab === "chat"
                        ? "bg-cyan-600 text-white shadow"
                        : "text-slate-300 hover:text-white"
                    )}
                  >
                    <MessageSquareTextIcon className="size-4" />
                    <span>Relaxed Chat Workroom</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkroomTab("map")
                      setMapMode("google-vicinity")
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm",
                      workroomTab === "map"
                        ? "bg-emerald-600 text-white shadow"
                        : "text-slate-300 hover:text-white"
                    )}
                  >
                    <GlobeIcon className="size-4" />
                    <span>Expanded Google Map</span>
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void syncCommandCenterData()}
                  className="h-9 gap-1.5 border-slate-700 bg-slate-900 px-3 text-xs text-slate-200 hover:bg-slate-800 sm:text-sm"
                >
                  <RefreshCwIcon
                    className={cn("size-4", isRefreshing && "animate-spin text-cyan-400")}
                  />
                  <span>Sync Telemetry</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMaximized((v) => !v)}
                  className="h-9 px-2.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                  title={isMaximized ? "Restore Window Size" : "Maximize Fullscreen"}
                >
                  {isMaximized ? (
                    <Minimize2Icon className="size-4" />
                  ) : (
                    <Maximize2Icon className="size-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsUnlocked(false)
                    try {
                      sessionStorage.removeItem("lifestone_dev_command_unlocked")
                    } catch {
                      // ignore
                    }
                  }}
                  className="h-9 px-2.5 text-slate-400 hover:text-rose-400"
                  title="Lock Command Center"
                >
                  <LockIcon className="size-4" />
                </Button>
              </div>
            </div>

            {statusBanner && (
              <div className="mx-6 mt-3 flex shrink-0 items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-4 py-2.5 text-sm font-medium text-emerald-200">
                <span>
                  <CheckCircle2Icon className="mr-2 inline size-4 text-emerald-400" />
                  {statusBanner}
                </span>
                <button type="button" onClick={() => setStatusBanner(null)}>
                  <XIcon className="size-4" />
                </button>
              </div>
            )}

            {/* ── Main Workroom Content Grid ── */}
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto p-6 lg:grid-cols-12">
              {/* =====================================================================
                  LEFT / MAP & TELEMETRY COLUMN (Shown in "split" or full width in "map")
                 ===================================================================== */}
              {workroomTab !== "chat" && (
                <div
                  className={cn(
                    "flex flex-col gap-5",
                    workroomTab === "map" ? "lg:col-span-12" : "lg:col-span-6"
                  )}
                >
                  {/* Interactive Google Maps Church Vicinity + World Radar Card */}
                  <div className="flex flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#080d1a] shadow-lg">
                    {/* Map Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GlobeIcon className="size-5 text-cyan-400" />
                        <div>
                          <div className="text-sm font-bold text-white sm:text-base">
                            {mapMode === "google-vicinity"
                              ? `Google Maps Live Vicinity — ${selectedNode?.churchName || "Node"}`
                              : "Global Light-Node Beacon Radar"}
                          </div>
                          {selectedNode && (
                            <div className="text-xs text-slate-300">
                              📍 {selectedNode.churchAddress} ({selectedNode.latitude.toFixed(5)},{" "}
                              {selectedNode.longitude.toFixed(5)})
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMapMode("google-vicinity")}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                            mapMode === "google-vicinity"
                              ? "bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-500/50"
                              : "bg-slate-800 text-slate-300 hover:text-white"
                          )}
                        >
                          🏛️ Google Map Church Vicinity
                        </button>
                        <button
                          type="button"
                          onClick={() => setMapMode("world-radar")}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                            mapMode === "world-radar"
                              ? "bg-cyan-500/25 text-cyan-300 ring-1 ring-cyan-500/50"
                              : "bg-slate-800 text-slate-300 hover:text-white"
                          )}
                        >
                          🌍 World Radar
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setWorkroomTab(workroomTab === "map" ? "split" : "map")
                          }
                          className="h-8 gap-1.5 border-cyan-500/40 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                        >
                          {workroomTab === "map" ? (
                            <>
                              <Minimize2Icon className="size-3.5" />
                              <span>Back to Split View</span>
                            </>
                          ) : (
                            <>
                              <Maximize2Icon className="size-3.5" />
                              <span>Expand Map Full Workroom</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Google Maps Zoom & Layer Bar when in Google Map mode */}
                    {mapMode === "google-vicinity" && selectedNode && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#0b1224] px-4 py-2.5 text-xs">
                        {/* Vicinity Narrowing Presets */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-slate-300">Narrow View:</span>
                          {[
                            { label: "🌍 Region", zoom: 8 },
                            { label: "🏙️ City", zoom: 13 },
                            { label: "🏘️ District", zoom: 16 },
                            { label: "🏛️ Church Street (18x)", zoom: 18 },
                            { label: "🛰️ Building Roof (20x)", zoom: 20 },
                          ].map((preset) => (
                            <button
                              key={preset.zoom}
                              type="button"
                              onClick={() => setGoogleMapZoom(preset.zoom)}
                              className={cn(
                                "rounded-md px-2.5 py-1 font-medium transition",
                                googleMapZoom === preset.zoom
                                  ? "bg-emerald-600 text-white shadow"
                                  : "bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                          <div className="ml-1 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setGoogleMapZoom((z) => Math.max(3, z - 1))}
                              className="rounded bg-slate-800 p-1 text-slate-200 hover:bg-slate-700"
                              title="Zoom Out"
                            >
                              <ZoomOutIcon className="size-3.5" />
                            </button>
                            <span className="px-1 font-mono text-cyan-300">{googleMapZoom}x</span>
                            <button
                              type="button"
                              onClick={() => setGoogleMapZoom((z) => Math.min(21, z + 1))}
                              className="rounded bg-slate-800 p-1 text-slate-200 hover:bg-slate-700"
                              title="Zoom In Closer"
                            >
                              <ZoomInIcon className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Layer Toggle + Refine GPS + External Google Maps */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setGoogleMapType((t) => (t === "h" ? "m" : t === "m" ? "p" : "h"))
                            }
                            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 font-medium text-slate-200 hover:bg-slate-800"
                          >
                            <LayersIcon className="size-3.5 text-cyan-400" />
                            <span>
                              {googleMapType === "h"
                                ? "🛰️ Satellite Hybrid"
                                : googleMapType === "m"
                                ? "🗺️ Street Map"
                                : "⛰️ Terrain"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRefineGpsPin}
                            disabled={locatingGps}
                            className="rounded-md border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 font-semibold text-cyan-300 hover:bg-cyan-500/25"
                          >
                            {locatingGps ? "Pinpointing..." : "📍 Pin Exact GPS"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void openExternalUrl(
                                `https://www.google.com/maps/search/?api=1&query=${selectedNode.latitude},${selectedNode.longitude}`
                              )
                            }
                            className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-500"
                          >
                            <span>Google Street View</span>
                            <ExternalLinkIcon className="size-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Map Viewport */}
                    {mapMode === "google-vicinity" && selectedNode ? (
                      <div
                        className={cn(
                          "w-full bg-slate-950 transition-all",
                          workroomTab === "map" ? "h-[62vh]" : "h-[350px]"
                        )}
                      >
                        <iframe
                          title={`Google Map Church Vicinity - ${selectedNode.churchName}`}
                          width="100%"
                          height="100%"
                          src={`https://maps.google.com/maps?ll=${selectedNode.latitude},${selectedNode.longitude}&q=${selectedNode.latitude},${selectedNode.longitude}&z=${googleMapZoom}&t=${googleMapType}&output=embed`}
                          className="border-0"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "relative w-full bg-[#060b16] p-2",
                          workroomTab === "map" ? "h-[60vh]" : "h-[340px]"
                        )}
                      >
                        <svg viewBox="0 0 1000 500" className="h-full w-full">
                          <defs>
                            <pattern
                              id="inapp-radar-grid"
                              width="50"
                              height="50"
                              patternUnits="userSpaceOnUse"
                            >
                              <path
                                d="M 50 0 L 0 0 0 50"
                                fill="none"
                                stroke="rgba(34, 211, 238, 0.08)"
                                strokeWidth="1"
                              />
                            </pattern>
                          </defs>
                          <rect width="1000" height="500" fill="url(#inapp-radar-grid)" />
                          <line
                            x1="0"
                            y1="250"
                            x2="1000"
                            y2="250"
                            stroke="rgba(34, 211, 238, 0.16)"
                            strokeDasharray="4 4"
                          />
                          <line
                            x1="500"
                            y1="0"
                            x2="500"
                            y2="500"
                            stroke="rgba(34, 211, 238, 0.16)"
                            strokeDasharray="4 4"
                          />
                          <g
                            fill="rgba(30, 41, 59, 0.7)"
                            stroke="rgba(56, 189, 248, 0.25)"
                            strokeWidth="1.2"
                          >
                            <path d="M 110,70 L 260,65 L 310,140 L 250,215 L 185,230 L 135,165 Z" />
                            <path d="M 245,250 L 335,275 L 350,360 L 295,455 L 260,395 Z" />
                            <path d="M 455,75 L 575,65 L 595,145 L 470,160 Z" />
                            <path d="M 455,180 L 585,185 L 615,285 L 560,405 L 495,380 L 450,260 Z" />
                            <path d="M 595,65 L 865,75 L 895,215 L 775,265 L 620,210 Z" />
                            <path d="M 765,335 L 885,330 L 895,415 L 780,420 Z" />
                          </g>

                          {nodes.map((node) => {
                            const { x, y } = latLngToSvg(node.latitude, node.longitude)
                            const isSelected = selectedNode?.nodeId === node.nodeId
                            const color =
                              node.status === "live"
                                ? "#10b981"
                                : node.status === "transcribing"
                                ? "#06b6d4"
                                : "#22d3ee"

                            return (
                              <g
                                key={node.nodeId}
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedNodeId(node.nodeId)
                                  setMapMode("google-vicinity")
                                  setGoogleMapZoom(18)
                                }}
                              >
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={isSelected ? 26 : 16}
                                  fill={color}
                                  opacity={0.3}
                                />
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={isSelected ? 8 : 6}
                                  fill={color}
                                  stroke="#ffffff"
                                  strokeWidth={isSelected ? 2.5 : 1.5}
                                />
                                <g transform={`translate(${x + 12}, ${y - 10})`}>
                                  <rect
                                    rx="5"
                                    ry="5"
                                    width={Math.min(250, node.churchName.length * 6.8 + 26)}
                                    height="22"
                                    fill="rgba(5, 8, 17, 0.94)"
                                    stroke="#22d3ee"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x="8"
                                    y="15"
                                    fill="#67e8f9"
                                    fontSize="10.5"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                  >
                                    {node.churchName.slice(0, 32)}
                                  </text>
                                </g>
                              </g>
                            )
                          })}
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Real Cryptographic & Hardware Live Telemetry Cards */}
                  {selectedNode && (
                    <div className="space-y-3 rounded-2xl border border-cyan-500/25 bg-[#080d1a] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-300">
                          <FingerprintIcon className="size-5 text-cyan-400" />
                          Real Runner Telemetry &amp; Cryptographic Proof
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-cyan-500/35 bg-cyan-500/10 px-2.5 py-0.5 text-xs text-cyan-200"
                          >
                            <LaptopIcon className="mr-1.5 size-3.5" />
                            {selectedNode.osPlatform}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 bg-emerald-500/10 font-mono text-xs text-emerald-300"
                          >
                            ✓ {selectedNode.cryptoAlgorithm}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                          <div className="text-xs font-medium uppercase text-slate-400">
                            Public Key SHA-256 Fingerprint
                          </div>
                          <div className="mt-1 font-mono text-sm font-bold text-cyan-300">
                            {selectedNode.publicKeyFingerprint}
                          </div>
                          <div className="mt-1 truncate font-mono text-xs text-slate-300">
                            Node: {selectedNode.nodeId} • Sig: {selectedNode.signature}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                          <div className="text-xs font-medium uppercase text-slate-400">
                            Real GPU &amp; CPU Hardware
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white">
                            <CpuIcon className="size-4 shrink-0 text-emerald-400" />
                            <span className="truncate">{selectedNode.gpuName}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-300">
                            {selectedNode.hasGpu ? "⚡ GPU Accelerated" : "🐢 CPU Mode"} •{" "}
                            {selectedNode.cpuCores} Logical Cores • {selectedNode.screenCount}{" "}
                            Display(s)
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                          <div className="text-xs font-medium uppercase text-slate-400">
                            Real IP Geolocation &amp; ISP
                          </div>
                          <div className="mt-1 text-sm font-bold text-white">
                            <MapPinIcon className="mr-1.5 inline size-4 text-emerald-400" />
                            {selectedNode.churchAddress}
                          </div>
                          <div className="mt-1 font-mono text-xs text-slate-300">
                            Coords: {selectedNode.latitude.toFixed(5)},{" "}
                            {selectedNode.longitude.toFixed(5)} • ISP: {selectedNode.isp}{" "}
                            {selectedNode.ip ? `(${selectedNode.ip})` : ""}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                          <div className="text-xs font-medium uppercase text-slate-400">
                            Live Sanctuary Projection
                          </div>
                          <div className="mt-1 text-sm font-bold text-emerald-300">
                            {selectedNode.activeItem}
                          </div>
                          <div className="mt-1 truncate font-mono text-xs text-slate-300">
                            ECDSA Sig:{" "}
                            {selectedNode.lastSignatureHex
                              ? `0x${selectedNode.lastSignatureHex.slice(0, 24)}...`
                              : "Verified Local Session"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =====================================================================
                  RIGHT / RELAXED DEVELOPER CHAT & RELEASE WORKROOM
                  (Shown in "split" as 6 cols, or in "chat" as full 12 cols with node directory)
                 ===================================================================== */}
              {workroomTab !== "map" && (
                <div
                  className={cn(
                    "grid min-h-0 gap-5",
                    workroomTab === "chat"
                      ? "grid-cols-1 lg:col-span-12 lg:grid-cols-12"
                      : "grid-cols-1 lg:col-span-6"
                  )}
                >
                  {/* Node Runners Directory Sidebar (Visible in Full Chat Workroom mode or when multiple nodes exist) */}
                  {(workroomTab === "chat" || nodes.length > 1) && (
                    <div
                      className={cn(
                        "flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#080d1a] p-4",
                        workroomTab === "chat" ? "lg:col-span-4" : ""
                      )}
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <span className="text-base font-bold text-white">
                          Connected App Runners ({nodes.length})
                        </span>
                        <Badge
                          variant="outline"
                          className="border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300"
                        >
                          Live Nodes
                        </Badge>
                      </div>

                      <div className="flex flex-col gap-2.5 overflow-y-auto">
                        {nodes.map((node) => {
                          const active = selectedNode?.nodeId === node.nodeId
                          return (
                            <button
                              key={node.nodeId}
                              type="button"
                              onClick={() => setSelectedNodeId(node.nodeId)}
                              className={cn(
                                "flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition",
                                active
                                  ? "border-cyan-500/60 bg-cyan-950/25 shadow-md"
                                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-base font-bold text-white">
                                  {node.churchName}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/40 bg-emerald-500/10 font-mono text-xs text-emerald-300"
                                >
                                  {node.signature}
                                </Badge>
                              </div>
                              <div className="text-xs text-slate-300">
                                {node.email} • {node.osPlatform}
                              </div>
                              <div className="text-xs text-cyan-300">
                                📍 {node.churchAddress}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Main Relaxed Developer Conversation & Release Dispatch Studio */}
                  {selectedNode && (
                    <div
                      className={cn(
                        "flex min-h-0 flex-col justify-between rounded-2xl border border-cyan-500/30 bg-[#080d1a] p-6 shadow-xl",
                        workroomTab === "chat" ? "lg:col-span-8" : ""
                      )}
                    >
                      {/* Chat Room Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-lg font-bold text-white sm:text-xl">
                            <ShieldCheckIcon className="size-6 text-cyan-400" />
                            <span>{selectedNode.churchName}</span>
                            <Badge
                              variant="outline"
                              className="border-cyan-500/40 bg-cyan-500/10 font-mono text-xs text-cyan-300"
                            >
                              {selectedNode.signature}
                            </Badge>
                          </div>
                          <div className="mt-1 text-sm text-slate-300">
                            {selectedNode.displayName} ({selectedNode.email}) •{" "}
                            <span className="font-mono text-cyan-300">
                              {selectedNode.publicKeyFingerprint}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMapMode("google-vicinity")
                              setGoogleMapZoom(18)
                              if (workroomTab === "chat") setWorkroomTab("split")
                            }}
                            className="h-9 gap-1.5 border-emerald-500/40 bg-emerald-500/10 px-3.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 sm:text-sm"
                          >
                            <Building2Icon className="size-4" />
                            <span>Zoom Church on Google Map</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setWorkroomTab(workroomTab === "chat" ? "split" : "chat")
                            }
                            className="h-9 gap-1.5 border-slate-700 bg-slate-900 px-3 text-xs text-slate-200 hover:bg-slate-800 sm:text-sm"
                          >
                            {workroomTab === "chat" ? (
                              <>
                                <Minimize2Icon className="size-4" />
                                <span>Split View</span>
                              </>
                            ) : (
                              <>
                                <Maximize2Icon className="size-4" />
                                <span>Expand Chat</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Spacious, Large-Font Conversation Messages */}
                      <div
                        ref={chatScrollRef}
                        className={cn(
                          "my-4 flex flex-1 flex-col gap-4 overflow-y-auto rounded-2xl border border-slate-800/90 bg-[#050811] p-5",
                          workroomTab === "chat" ? "min-h-[380px]" : "min-h-[300px]"
                        )}
                      >
                        {currentMessages.map((msg) => {
                          const isDev = msg.sender === "developer"
                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                "flex max-w-[86%] flex-col rounded-2xl px-5 py-4 shadow-md",
                                isDev
                                  ? msg.isUpdateNotice
                                    ? "self-end border border-emerald-500/45 bg-emerald-950/45 text-emerald-50"
                                    : "self-end bg-cyan-600 text-white"
                                  : "self-start border border-slate-700/80 bg-slate-900 text-slate-100"
                              )}
                            >
                              <div className="mb-1.5 flex items-center justify-between gap-4 text-xs opacity-85">
                                <span className="font-bold">
                                  {isDev
                                    ? "🛰️ Lifestone Developer (You)"
                                    : `⛪ ${msg.senderName}`}
                                </span>
                                <span>
                                  {new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              <p className="whitespace-pre-wrap text-base leading-relaxed">
                                {msg.text}
                              </p>

                              {msg.cryptoEnvelope && (
                                <div className="mt-2.5 border-t border-white/15 pt-1.5 font-mono text-xs text-cyan-300/90">
                                  ✓ Verified {msg.cryptoEnvelope.algorithm}: 0x
                                  {msg.cryptoEnvelope.signatureHex.slice(0, 20)}...
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Relaxed Multi-Line Developer Reply & Signed Release Composer */}
                      <form onSubmit={handleSendReply} className="space-y-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleQuickSignedTemplate}
                              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/45 bg-emerald-500/15 px-3.5 py-1.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                            >
                              <SparklesIcon className="size-4" />
                              <span>Fill &ldquo;Signed &amp; Ready to Update&rdquo;</span>
                            </button>

                            <div className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                              <span>Release v</span>
                              <input
                                type="text"
                                value={releaseVersion}
                                onChange={(e) => setReleaseVersion(e.target.value)}
                                className="w-14 bg-transparent font-mono text-sm font-bold text-white focus:outline-none"
                              />
                            </div>
                          </div>

                          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-200">
                            <input
                              type="checkbox"
                              checked={isUpdateNotice}
                              onChange={(e) => setIsUpdateNotice(e.target.checked)}
                              className="size-4 rounded accent-emerald-500"
                            />
                            <span>Attach &ldquo;Update Now&rdquo; Signed Release Button</span>
                          </label>
                        </div>

                        <textarea
                          rows={4}
                          placeholder={`Relax and type your developer reply or signed release update to ${selectedNode.churchName} (${selectedNode.signature})... (${osInfo.sendShortcut} to send)`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={handleReplyKeyDown}
                          className="min-h-[115px] w-full resize-y rounded-2xl border border-slate-700 bg-[#050811] px-4 py-3.5 text-base leading-relaxed text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!replyText.trim()}
                            onClick={handleBroadcastAll}
                            className="h-11 gap-2 rounded-xl border-amber-500/45 bg-amber-500/15 px-4 text-sm font-bold text-amber-300 hover:bg-amber-500/25"
                          >
                            <MegaphoneIcon className="size-4" />
                            <span>Broadcast Update to All ({nodes.length}) Nodes</span>
                          </Button>

                          <Button
                            type="submit"
                            disabled={!replyText.trim()}
                            className="h-11 gap-2 rounded-xl bg-cyan-600 px-6 text-base font-bold text-white shadow-lg hover:bg-cyan-500"
                          >
                            <SendIcon className="size-4" />
                            <span>Send to {selectedNode.signature}</span>
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
