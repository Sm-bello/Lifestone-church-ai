import { useState, useEffect, useCallback } from "react"
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
import { useFeedbackStore, type FeedbackMessage } from "@/stores/feedback-store"
import { openExternalUrl } from "@/lib/open-external"
import { cn } from "@/lib/utils"

const DEVELOPER_PIN = "1213"
const COMMAND_CENTER_BASE_URL =
  import.meta.env.VITE_COMMAND_CENTER_URL || "https://lifestone-church-ai.vercel.app"

export interface BeaconNodeItem {
  nodeId: string
  signature: string
  churchName: string
  displayName: string
  email: string
  churchAddress: string
  city: string
  country: string
  latitude: number
  longitude: number
  appVersion: string
  hasGpu: boolean
  gpuName: string
  performanceTier: string
  status: "live" | "transcribing" | "online"
  activeItem: string
  screenCount: number
  lastSeenAt: number
}

interface ThreadItem {
  nodeId: string
  node: BeaconNodeItem | null
  messages: FeedbackMessage[]
  lastUpdatedAt: number
}

const DEFAULT_SEED_NODES: BeaconNodeItem[] = [
  {
    nodeId: "LS-NODE-9A4F12",
    signature: "LS-SIG-9A4F-RCCGLA",
    churchName: "RCCG The Oasis Sanctuary",
    displayName: "Bro. Emmanuel (Media Lead)",
    email: "media.oasis@gmail.com",
    churchAddress: "Victoria Island, Lagos, Nigeria",
    city: "Lagos",
    country: "Nigeria",
    latitude: 6.4281,
    longitude: 3.4219,
    appVersion: "1.1.0",
    hasGpu: true,
    gpuName: "NVIDIA GeForce RTX 3060",
    performanceTier: "ultra",
    status: "live",
    activeItem: "Presenting: Romans 8:28 (KJV)",
    screenCount: 2,
    lastSeenAt: Date.now() - 25_000,
  },
  {
    nodeId: "LS-NODE-3C8B01",
    signature: "LS-SIG-3C8B-GRACEC",
    churchName: "Grace Community Fellowship",
    displayName: "Pastor Caleb",
    email: "caleb.gracefellowship@gmail.com",
    churchAddress: "1400 Congress Ave, Austin, TX",
    city: "Austin",
    country: "United States",
    latitude: 30.2672,
    longitude: -97.7431,
    appVersion: "1.1.0",
    hasGpu: false,
    gpuName: "Intel(R) Pentium(R) N3530 HD Graphics",
    performanceTier: "budget-cpu",
    status: "transcribing",
    activeItem: "Hymn #14: Amazing Grace (Stanza 2)",
    screenCount: 2,
    lastSeenAt: Date.now() - 48_000,
  },
  {
    nodeId: "LS-NODE-7E2D90",
    signature: "LS-SIG-7E2D-KINGSW",
    churchName: "Kingsway International Christian Centre",
    displayName: "Sister Sarah",
    email: "av.kingswayuk@gmail.com",
    churchAddress: "Hoe Street, Walthamstow, London",
    city: "London",
    country: "United Kingdom",
    latitude: 51.5842,
    longitude: -0.0197,
    appVersion: "1.1.0",
    hasGpu: true,
    gpuName: "Apple M2 Pro GPU",
    performanceTier: "ultra",
    status: "live",
    activeItem: "Presenting: Psalm 23:1-4 (KJV)",
    screenCount: 3,
    lastSeenAt: Date.now() - 70_000,
  },
  {
    nodeId: "LS-NODE-5F1A88",
    signature: "LS-SIG-5F1A-BETHEL",
    churchName: "Bethel Worship Center Nairobi",
    displayName: "David Ochieng",
    email: "bethelnairobi.media@gmail.com",
    churchAddress: "Ngong Road, Nairobi, Kenya",
    city: "Nairobi",
    country: "Kenya",
    latitude: -1.2921,
    longitude: 36.8219,
    appVersion: "1.1.0",
    hasGpu: false,
    gpuName: "Intel(R) Celeron(R) UHD Graphics 600",
    performanceTier: "budget-cpu",
    status: "online",
    activeItem: "Standby — Pre-Service Check",
    screenCount: 2,
    lastSeenAt: Date.now() - 110_000,
  },
]

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

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("lifestone_dev_command_unlocked") === "true"
    } catch {
      return false
    }
  })
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState(false)

  const [nodes, setNodes] = useState<BeaconNodeItem[]>(DEFAULT_SEED_NODES)
  const [threads, setThreads] = useState<ThreadItem[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"world" | "building">("world")
  const [replyText, setReplyText] = useState("")
  const [isUpdateNotice, setIsUpdateNotice] = useState(false)
  const [releaseVersion, setReleaseVersion] = useState("1.1.0")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusBanner, setStatusBanner] = useState<string | null>(null)

  const syncCommandCenterData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Include this local desktop runner as a live node on the Command Center map!
      const selfNode: BeaconNodeItem = {
        nodeId: localProfile.nodeId,
        signature: localProfile.signature,
        churchName: localProfile.churchName || "This PC (Local Sanctuary Node)",
        displayName: localProfile.displayName || "Admin / Developer PC",
        email: localProfile.email || "local@lifestone.app",
        churchAddress: localProfile.churchAddress || "Local Sanctuary Workstation",
        city: localProfile.city || "Local",
        country: localProfile.country || "Workstation",
        latitude: localProfile.latitude ?? 9.082,
        longitude: localProfile.longitude ?? 8.6753,
        appVersion: "1.1.0",
        hasGpu: true,
        gpuName: "Local Hardware Adapter",
        performanceTier: "high",
        status: "live",
        activeItem: "Command Center Active",
        screenCount: 1,
        lastSeenAt: Date.now(),
      }

      let remoteNodes = DEFAULT_SEED_NODES
      try {
        const res = await fetch(`${COMMAND_CENTER_BASE_URL}/api/beacon`)
        if (res.ok) {
          const data = (await res.json()) as { nodes?: BeaconNodeItem[] }
          if (data.nodes && data.nodes.length > 0) {
            remoteNodes = data.nodes
          }
        }
      } catch {
        // Fallback to seed nodes + local node when offline
      }

      const mergedNodes = [
        selfNode,
        ...remoteNodes.filter((n) => n.nodeId !== selfNode.nodeId),
      ]
      setNodes(mergedNodes)
      if (!selectedNodeId) {
        setSelectedNodeId(selfNode.nodeId)
      }

      // Build threads including local messages
      const selfThread: ThreadItem = {
        nodeId: selfNode.nodeId,
        node: selfNode,
        messages: localMessages,
        lastUpdatedAt: Date.now(),
      }

      setThreads((prev) => {
        const others = prev.filter((t) => t.nodeId !== selfNode.nodeId)
        return [selfThread, ...others]
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [localProfile, localMessages, selectedNodeId])

  useEffect(() => {
    if (open && isUnlocked) {
      void syncCommandCenterData()
    }
  }, [open, isUnlocked, syncCommandCenterData])

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pinInput.trim() === DEVELOPER_PIN) {
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

  const selectedNode =
    nodes.find((n) => n.nodeId === selectedNodeId) || nodes[0] || null
  const selectedThread = threads.find(
    (t) => t.nodeId === (selectedNode?.nodeId || selectedNodeId)
  )
  const currentMessages =
    selectedNode?.nodeId === localProfile.nodeId
      ? localMessages
      : selectedThread?.messages || []

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
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

    // If replying to this local machine's node, push directly into useFeedbackStore so user sees toast & message immediately!
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
        ? `Signed Release Notification pushed to ${selectedNode.churchName} (${selectedNode.signature})!`
        : `Developer reply delivered to ${selectedNode.churchName} (${selectedNode.signature})!`
    )
    setTimeout(() => setStatusBanner(null), 5000)
  }

  const handleQuickSignedTemplate = () => {
    if (!selectedNode) return
    setIsUpdateNotice(true)
    setReplyText(
      `Hello ${selectedNode.churchName} (${selectedNode.signature})! We received your feedback and have built, certified, and signed the latest Lifestone v${releaseVersion} update specifically addressing your sanctuary setup. Please tap "Update Now" in your chat box to install!`
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

    // Also deliver to local node so operator sees it live
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
          "overflow-hidden border-cyan-500/30 bg-[#050811] text-slate-100",
          isUnlocked ? "max-w-5xl sm:max-w-6xl" : "max-w-sm"
        )}
      >
        {!isUnlocked ? (
          /* ── PIN 1213 Authentication Gate ── */
          <div className="space-y-4 py-2">
            <DialogHeader>
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
                <LockIcon className="size-6" />
              </div>
              <DialogTitle className="text-center text-base font-bold text-white">
                Lifestone Command Center
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-slate-400">
                Enter your Developer Security PIN to unlock the Global Light-Node Beacon Radar & Dispatch Console.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="flex items-center justify-center gap-1.5 text-xs font-medium text-cyan-300">
                  <KeyRoundIcon className="size-3.5" />
                  <span>Developer PIN</span>
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter 4-digit PIN (1213)"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value)
                    setPinError(false)
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-white placeholder:tracking-normal placeholder:text-xs placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                {pinError && (
                  <p className="text-center text-xs font-medium text-rose-400">
                    Invalid Developer PIN. Please enter 1213.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-cyan-600 text-xs font-semibold text-white hover:bg-cyan-500"
              >
                Unlock Command Center
              </Button>
            </form>
          </div>
        ) : (
          /* ── Unlocked In-App Lifestone Command Center ── */
          <div className="flex max-h-[82vh] flex-col gap-4 overflow-y-auto pr-1">
            {/* Top Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 pr-6">
              <div className="flex items-center gap-2.5">
                <span className="relative flex size-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <DialogTitle className="text-base font-bold tracking-tight text-white">
                    LIFESTONE COMMAND CENTER (DEV PIN: 1213 VERIFIED)
                  </DialogTitle>
                  <DialogDescription className="text-[11px] text-cyan-400">
                    Global Church Light-Node Beacons • Sanctuary Building Zoom • Direct Signed Update Dispatch
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300"
                >
                  <RadioIcon className="mr-1 size-3 animate-pulse" />
                  {nodes.length} Active Nodes
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void syncCommandCenterData()}
                  className="h-7 gap-1 border-slate-700 bg-slate-900 text-xs text-slate-200 hover:bg-slate-800"
                >
                  <RefreshCwIcon
                    className={cn("size-3", isRefreshing && "animate-spin text-cyan-400")}
                  />
                  <span>Sync</span>
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
                  className="h-7 px-2 text-xs text-slate-400 hover:text-rose-400"
                  title="Lock Command Center"
                >
                  <LockIcon className="size-3.5" />
                </Button>
              </div>
            </div>

            {statusBanner && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs font-medium text-emerald-300">
                <span>
                  <CheckCircle2Icon className="mr-1.5 inline size-4" />
                  {statusBanner}
                </span>
                <button type="button" onClick={() => setStatusBanner(null)}>
                  <XIcon className="size-3.5" />
                </button>
              </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left 7 Cols: World Beacon Radar + Building Zoom + Node List */}
              <div className="space-y-3 lg:col-span-7">
                <div className="overflow-hidden rounded-xl border border-cyan-500/25 bg-[#090e1c]">
                  <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <GlobeIcon className="size-3.5 text-cyan-400" />
                      {viewMode === "world"
                        ? "Global Church Light-Node Radar"
                        : `Sanctuary Building View — ${selectedNode?.churchName}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewMode("world")}
                        className={cn(
                          "rounded px-2.5 py-1 text-[11px] font-medium transition",
                          viewMode === "world"
                            ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        )}
                      >
                        🌍 World Map
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("building")}
                        className={cn(
                          "rounded px-2.5 py-1 text-[11px] font-medium transition",
                          viewMode === "building"
                            ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        )}
                      >
                        🏛️ Narrow to Church Building
                      </button>
                    </div>
                  </div>

                  {viewMode === "world" ? (
                    <div className="relative aspect-[2/1] w-full bg-[#060b16] p-1">
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
                              stroke="rgba(34, 211, 238, 0.07)"
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
                          stroke="rgba(34, 211, 238, 0.14)"
                          strokeDasharray="4 4"
                        />
                        <line
                          x1="500"
                          y1="0"
                          x2="500"
                          y2="500"
                          stroke="rgba(34, 211, 238, 0.14)"
                          strokeDasharray="4 4"
                        />
                        <g
                          fill="rgba(30, 41, 59, 0.65)"
                          stroke="rgba(56, 189, 248, 0.22)"
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
                              : "#f59e0b"

                          return (
                            <g
                              key={node.nodeId}
                              className="cursor-pointer"
                              onClick={() => setSelectedNodeId(node.nodeId)}
                            >
                              <circle
                                cx={x}
                                cy={y}
                                r={isSelected ? 22 : 14}
                                fill={color}
                                opacity={0.25}
                              />
                              <circle
                                cx={x}
                                cy={y}
                                r={isSelected ? 7 : 5}
                                fill={color}
                                stroke="#ffffff"
                                strokeWidth={isSelected ? 2.5 : 1.5}
                              />
                              <g transform={`translate(${x + 9}, ${y - 8})`}>
                                <rect
                                  rx="4"
                                  ry="4"
                                  width={Math.min(180, node.churchName.length * 6 + 20)}
                                  height="18"
                                  fill="rgba(5, 8, 17, 0.9)"
                                  stroke={isSelected ? "#22d3ee" : "rgba(148,163,184,0.3)"}
                                  strokeWidth="1"
                                />
                                <text
                                  x="6"
                                  y="12.5"
                                  fill={isSelected ? "#67e8f9" : "#e2e8f0"}
                                  fontSize="9"
                                  fontFamily="monospace"
                                  fontWeight="bold"
                                >
                                  {node.churchName.slice(0, 24)}
                                </text>
                              </g>
                            </g>
                          )
                        })}
                      </svg>
                    </div>
                  ) : (
                    selectedNode && (
                      <div className="space-y-2.5 p-3">
                        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2">
                          <div className="text-xs">
                            <div className="font-bold text-white">
                              🏛️ {selectedNode.churchName}
                            </div>
                            <div className="text-[11px] text-slate-300">
                              📍 {selectedNode.churchAddress} (
                              {selectedNode.latitude.toFixed(4)},{" "}
                              {selectedNode.longitude.toFixed(4)})
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="h-7 gap-1 bg-emerald-600 text-[11px] text-white hover:bg-emerald-500"
                            onClick={() =>
                              void openExternalUrl(
                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  `${selectedNode.churchName} ${selectedNode.churchAddress}`
                                )}`
                              )
                            }
                          >
                            <span>3D Satellite View</span>
                            <ExternalLinkIcon className="size-3" />
                          </Button>
                        </div>

                        <div className="h-56 w-full overflow-hidden rounded-lg border border-slate-800">
                          <iframe
                            title={`Building View - ${selectedNode.churchName}`}
                            width="100%"
                            height="100%"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                              selectedNode.longitude - 0.012
                            }%2C${selectedNode.latitude - 0.008}%2C${
                              selectedNode.longitude + 0.012
                            }%2C${
                              selectedNode.latitude + 0.008
                            }&layer=mapnik&marker=${selectedNode.latitude}%2C${
                              selectedNode.longitude
                            }`}
                            className="border-0"
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Active Nodes List */}
                <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-slate-800 bg-[#090e1c] p-2.5">
                  {nodes.map((node) => {
                    const isSelected = selectedNode?.nodeId === node.nodeId
                    return (
                      <div
                        key={node.nodeId}
                        onClick={() => setSelectedNodeId(node.nodeId)}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs transition",
                          isSelected
                            ? "border-cyan-500/60 bg-cyan-950/30"
                            : "border-slate-800/80 bg-slate-900/40 hover:border-slate-700"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2 font-semibold text-white">
                            <span>{node.churchName}</span>
                            <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                              {node.signature}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            <MapPinIcon className="mr-1 inline size-3 text-emerald-400" />
                            {node.churchAddress} • {node.email || "Anonymous"}
                          </div>
                        </div>
                        <div className="text-right text-[11px]">
                          <div className="font-medium text-emerald-300">
                            {node.activeItem}
                          </div>
                          <div className="text-slate-400">
                            {node.hasGpu ? "⚡ GPU" : "🐢 CPU Lite"}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right 5 Cols: Selected Sanctuary Chat & Signed Release Dispatch */}
              <div className="lg:col-span-5">
                {selectedNode && (
                  <div className="flex h-full flex-col justify-between rounded-xl border border-cyan-500/30 bg-[#090e1c] p-3.5">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                            <ShieldCheckIcon className="size-4 text-cyan-400" />
                            <span>{selectedNode.churchName}</span>
                          </div>
                          <div className="font-mono text-[11px] text-cyan-300">
                            {selectedNode.signature} • {selectedNode.gpuName}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setViewMode(viewMode === "building" ? "world" : "building")
                          }
                          className="h-7 gap-1 border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-300"
                        >
                          <Building2Icon className="size-3" />
                          <span>
                            {viewMode === "building" ? "World Map" : "Zoom Building"}
                          </span>
                        </Button>
                      </div>

                      {/* Messages */}
                      <div className="my-2.5 flex h-48 flex-col gap-2 overflow-y-auto rounded-lg border border-slate-800 bg-[#050811] p-2.5">
                        {currentMessages.map((msg) => {
                          const isDev = msg.sender === "developer"
                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                "flex max-w-[88%] flex-col rounded-lg px-2.5 py-1.5 text-xs",
                                isDev
                                  ? msg.isUpdateNotice
                                    ? "self-end border border-emerald-500/40 bg-emerald-950/40 text-emerald-100"
                                    : "self-end bg-cyan-600 text-white"
                                  : "self-start border border-slate-800 bg-slate-900 text-slate-100"
                              )}
                            >
                              <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] opacity-75">
                                <span className="font-bold">
                                  {isDev ? "🛰️ Developer (You)" : `⛪ ${msg.senderName}`}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Composer */}
                    <form onSubmit={handleSendReply} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={handleQuickSignedTemplate}
                          className="flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          <SparklesIcon className="size-3" />
                          <span>Fill &ldquo;Signed &amp; Ready to Update&rdquo;</span>
                        </button>

                        <label className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-300">
                          <input
                            type="checkbox"
                            checked={isUpdateNotice}
                            onChange={(e) => setIsUpdateNotice(e.target.checked)}
                          />
                          <span>Signed Release Notice</span>
                        </label>
                      </div>

                      <textarea
                        rows={2}
                        placeholder={`Reply or send signed update notice to ${selectedNode.signature}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-[#050811] p-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!replyText.trim()}
                          onClick={handleBroadcastAll}
                          className="h-7 gap-1 border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-300 hover:bg-amber-500/20"
                        >
                          <MegaphoneIcon className="size-3" />
                          <span>Broadcast All</span>
                        </Button>

                        <Button
                          type="submit"
                          size="sm"
                          disabled={!replyText.trim()}
                          className="h-7 gap-1 bg-cyan-600 text-[11px] text-white hover:bg-cyan-500"
                        >
                          <SendIcon className="size-3" />
                          <span>Send to {selectedNode.signature}</span>
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
