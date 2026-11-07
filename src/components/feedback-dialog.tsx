import { useState, useRef, useEffect } from "react"
import {
  MessageSquareHeartIcon,
  SendIcon,
  ShieldCheckIcon,
  RadioIcon,
  MapPinIcon,
  SparklesIcon,
  CpuIcon,
  RefreshCwIcon,
  LogOutIcon,
  MailIcon,
  Building2Icon,
  DownloadIcon,
  LockIcon,
  Maximize2Icon,
  Minimize2Icon,
  LaptopIcon,
  FingerprintIcon,
  CheckCircle2Icon,
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
import { CommandCenterDialog } from "@/components/command-center-dialog"
import { useFeedbackStore, type FeedbackMessage } from "@/stores/feedback-store"
import { useGpuInfo } from "@/hooks/use-gpu-info"
import { detectMachineOs } from "@/lib/crypto-node"
import { openExternalUrl } from "@/lib/open-external"
import { cn } from "@/lib/utils"

export function FeedbackDialog({ screenCount = 1 }: { screenCount?: number }) {
  const isDialogOpen = useFeedbackStore((s) => s.isDialogOpen)
  const setDialogOpen = useFeedbackStore((s) => s.setDialogOpen)
  const profile = useFeedbackStore((s) => s.profile)
  const messages = useFeedbackStore((s) => s.messages)
  const isSending = useFeedbackStore((s) => s.isSending)
  const isSyncing = useFeedbackStore((s) => s.isSyncing)
  const isOnline = useFeedbackStore((s) => s.isOnline)
  const signInWithGmail = useFeedbackStore((s) => s.signInWithGmail)
  const signOut = useFeedbackStore((s) => s.signOut)
  const updateLocation = useFeedbackStore((s) => s.updateLocation)
  const refreshRealLocation = useFeedbackStore((s) => s.refreshRealLocation)
  const sendMessage = useFeedbackStore((s) => s.sendMessage)
  const syncWithCommandCenter = useFeedbackStore((s) => s.syncWithCommandCenter)

  const gpuInfo = useGpuInfo()
  const osInfo = detectMachineOs()

  // Sign-in form state
  const [email, setEmail] = useState(profile.email || "")
  const [displayName, setDisplayName] = useState(profile.displayName || "")
  const [churchName, setChurchName] = useState(profile.churchName || "")
  const [churchAddress, setChurchAddress] = useState(profile.churchAddress || "")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [locating, setLocating] = useState(false)
  const [commandCenterOpen, setCommandCenterOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [previewZoom, setPreviewZoom] = useState(17)

  // Chat composer state
  const [text, setText] = useState("")
  const [category, setCategory] = useState<FeedbackMessage["category"]>("feature")
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isDialogOpen])

  useEffect(() => {
    if (isDialogOpen && (profile.latitude === undefined || profile.longitude === undefined)) {
      void refreshRealLocation()
    }
  }, [isDialogOpen, profile.latitude, profile.longitude, refreshRealLocation])

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !churchName.trim()) return
    signInWithGmail({
      email,
      displayName: displayName || email.split("@")[0] || "Church Media Team",
      churchName,
      churchAddress,
    })
    setIsEditingProfile(false)
  }

  const handleDetectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      void refreshRealLocation()
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const coordsText = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        const nextAddress = churchAddress
          ? `${churchAddress.replace(/\s*\([^)]*\)\s*$/, "")} (${coordsText})`
          : `Sanctuary GPS: ${coordsText}`
        setChurchAddress(nextAddress)
        updateLocation({ latitude, longitude, address: nextAddress })
        setPreviewZoom(19)
        setLocating(false)
      },
      async () => {
        await refreshRealLocation()
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 7000 }
    )
  }

  const submitCurrentMessage = async () => {
    if (!text.trim() || isSending) return
    const toSend = text
    setText("")
    await sendMessage(toSend, category, includeDiagnostics, screenCount)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitCurrentMessage()
  }

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      void submitCurrentMessage()
    }
  }

  const showAuthForm = !profile.isAuthenticated || isEditingProfile
  const hasCoordinates =
    typeof profile.latitude === "number" &&
    typeof profile.longitude === "number" &&
    (profile.latitude !== 0 || profile.longitude !== 0)

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden border-cyan-500/30 bg-[#060a14] p-0 text-slate-100 shadow-2xl",
          isMaximized
            ? "h-screen w-screen max-w-none rounded-none sm:max-w-none"
            : "h-[90vh] w-[95vw] max-w-[95vw] rounded-2xl sm:max-w-[95vw] xl:max-w-[1480px]"
        )}
      >
        {/* ── Top Workroom Header Bar ── */}
        <DialogHeader className="shrink-0 border-b border-slate-800/90 bg-[#090f1e] px-6 py-4 pr-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/35">
                <MessageSquareHeartIcon className="size-6" />
              </div>
              <div>
                <DialogTitle className="flex flex-wrap items-center gap-2.5 text-xl font-bold tracking-tight text-white">
                  <span>Talk to the Developer — Sanctuary Workroom</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5 px-2.5 py-0.5 text-xs font-semibold",
                      isOnline
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    )}
                  >
                    <RadioIcon className="size-3.5 animate-pulse" />
                    {isOnline ? "Light-Node Beacon Live" : "Offline Queue Mode"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-300"
                  >
                    <LaptopIcon className="mr-1.5 size-3.5" />
                    {osInfo.platform === "macOS"
                      ? "🍎 macOS"
                      : osInfo.platform === "Linux"
                      ? "🐧 Linux"
                      : "🪟 Windows"}{" "}
                    • v1.1.0
                  </Badge>
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-300">
                  Relaxed direct communication studio with the Lifestone engineering team •
                  Receive custom signed releases &amp; real-time sanctuary support on{" "}
                  {osInfo.label}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void syncWithCommandCenter(false)}
                disabled={isSyncing}
                className="h-9 gap-2 border-slate-700 bg-slate-900 px-3.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                <RefreshCwIcon className={cn("size-4", isSyncing && "animate-spin text-cyan-400")} />
                <span>{isSyncing ? "Syncing..." : "Check Replies"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCommandCenterOpen(true)}
                className="h-9 gap-2 border-emerald-500/40 bg-emerald-500/10 px-3.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20"
              >
                <LockIcon className="size-4" />
                <span>Command Center</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsMaximized((v) => !v)}
                className="h-9 px-2.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                title={isMaximized ? "Restore Window Size" : "Maximize Workroom"}
              >
                {isMaximized ? (
                  <Minimize2Icon className="size-4" />
                ) : (
                  <Maximize2Icon className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Main Two-Column Relaxed Workroom Body ── */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
          {/* LEFT PANEL (4 Cols): Church Digital Signature, Hardware Telemetry & Google Map Vicinity */}
          <div className="flex flex-col justify-between gap-4 overflow-y-auto border-b border-slate-800/80 bg-[#080d1a] p-6 lg:col-span-4 lg:border-r lg:border-b-0">
            <div className="space-y-5">
              {/* Digital Signature / Gmail Identity Card */}
              {showAuthForm ? (
                <form
                  onSubmit={handleSignIn}
                  className="space-y-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/15 p-5 shadow-inner"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-base font-bold text-cyan-300">
                      <ShieldCheckIcon className="size-5 text-cyan-400" />
                      <span>Church Gmail &amp; Digital Signature</span>
                    </div>
                    {profile.isAuthenticated && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-slate-300"
                        onClick={() => setIsEditingProfile(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-slate-300">
                    Connect with your Gmail and church name so Lifestone issues your sanctuary a
                    permanent <strong className="text-white">Digital Signature</strong> and links
                    your chat room directly to the developer.
                  </p>

                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                        <MailIcon className="size-4 text-cyan-400" />
                        Gmail / Church Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="media.yourchurch@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                        <Building2Icon className="size-4 text-cyan-400" />
                        Church / Sanctuary Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Grace Assembly Sanctuary"
                        value={churchName}
                        onChange={(e) => setChurchName(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-200">
                        Your Name / Media Role
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pastor David / Media Lead"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                          <MapPinIcon className="size-4 text-emerald-400" />
                          Sanctuary Street / City Location
                        </label>
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          disabled={locating}
                          className="text-xs font-semibold text-cyan-400 hover:underline disabled:opacity-50"
                        >
                          {locating ? "Pinpointing GPS..." : "📍 Pin Exact GPS"}
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Street Address, City, Country"
                        value={churchAddress}
                        onChange={(e) => setChurchAddress(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="h-11 w-full gap-2 rounded-xl bg-cyan-600 text-base font-semibold text-white hover:bg-cyan-500"
                  >
                    <SparklesIcon className="size-4" />
                    Activate Church Digital Signature
                  </Button>
                </form>
              ) : (
                <div className="space-y-3 rounded-2xl border border-emerald-500/35 bg-emerald-950/15 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2Icon className="size-6 shrink-0 text-emerald-400" />
                      <div>
                        <div className="text-lg font-bold text-white">{profile.churchName}</div>
                        <div className="text-sm text-slate-300">
                          {profile.displayName} • {profile.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-slate-300 hover:text-white"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-slate-400 hover:text-rose-400"
                        title="Sign out"
                        onClick={signOut}
                      >
                        <LogOutIcon className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-cyan-500/30 bg-slate-950/80 p-3">
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Assigned Church Digital Signature
                    </div>
                    <div className="mt-1 font-mono text-base font-bold text-cyan-300">
                      {profile.signature}
                    </div>
                    <div className="mt-1 truncate font-mono text-xs text-slate-400">
                      ECDSA Key: {profile.publicKeyFingerprint || "Active P-256 Node"}
                    </div>
                  </div>
                </div>
              )}

              {/* Live Sanctuary Google Map & Real Telemetry Preview */}
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-[#0b1224] p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-bold text-white">
                    <MapPinIcon className="size-4 text-emerald-400" />
                    Live Sanctuary Vicinity (Google Maps)
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                  >
                    {locating ? "Locating..." : "📍 Refine GPS"}
                  </button>
                </div>

                <div className="text-xs text-slate-300">
                  {profile.churchAddress ||
                    [profile.city, profile.region, profile.country].filter(Boolean).join(", ") ||
                    "Detecting live sanctuary location..."}
                </div>

                {hasCoordinates ? (
                  <div className="space-y-2">
                    <div className="h-44 w-full overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950">
                      <iframe
                        title="Sanctuary Google Map Vicinity"
                        width="100%"
                        height="100%"
                        src={`https://maps.google.com/maps?ll=${profile.latitude},${profile.longitude}&q=${profile.latitude},${profile.longitude}&z=${previewZoom}&t=h&output=embed`}
                        className="border-0"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-mono text-slate-400">
                        {profile.latitude?.toFixed(4)}, {profile.longitude?.toFixed(4)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewZoom(13)}
                          className={cn(
                            "rounded px-2 py-0.5 text-xs",
                            previewZoom === 13
                              ? "bg-cyan-500/25 text-cyan-300"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          )}
                        >
                          City
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewZoom(18)}
                          className={cn(
                            "rounded px-2 py-0.5 text-xs",
                            previewZoom >= 17
                              ? "bg-emerald-500/25 text-emerald-300"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          )}
                        >
                          Church Vicinity
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-400">
                    Connect to the internet or click &ldquo;Refine GPS&rdquo; to preview map
                  </div>
                )}
              </div>

              {/* Real Hardware & Cryptographic Node Card */}
              <div className="space-y-2 rounded-2xl border border-slate-800 bg-[#0b1224] p-4 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5 font-semibold text-white">
                    <FingerprintIcon className="size-4 text-cyan-400" />
                    Light-Node Telemetry ({osInfo.platform})
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400">
                    ECDSA-P256-SHA256
                  </span>
                </div>
                <div className="text-slate-300">
                  <span className="font-medium text-white">GPU / AI Engine:</span>{" "}
                  {gpuInfo.hasGpu ? `⚡ ${gpuInfo.gpuName}` : `💡 ${gpuInfo.gpuName} (CPU Mode)`}
                </div>
                <div className="font-mono text-slate-400">
                  Node: {profile.nodeId} • Displays: {screenCount}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCommandCenterOpen(true)}
                className="h-10 w-full gap-2 rounded-xl border-cyan-500/30 bg-cyan-950/20 text-sm font-semibold text-cyan-300 hover:bg-cyan-900/30"
              >
                <LockIcon className="size-4" />
                <span>Developer Command Center (PIN Protected)</span>
              </Button>
            </div>
          </div>

          {/* RIGHT PANEL (8 Cols): Spacious, Relaxed Conversation & Composer Studio */}
          <div className="flex min-h-0 flex-col justify-between bg-[#050811] p-6 lg:col-span-8">
            {/* Conversation Stream */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Direct Conversation with Lifestone Developer
                </h3>
                <p className="text-xs text-slate-400">
                  Signed with your church identity:{" "}
                  <span className="font-mono font-semibold text-cyan-300">
                    {profile.signature}
                  </span>
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-300"
              >
                {messages.length} Message{messages.length === 1 ? "" : "s"}
              </Badge>
            </div>

            <div
              ref={scrollRef}
              className="custom-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-2xl border border-slate-800/90 bg-[#080d1a]/90 p-5"
            >
              {messages.map((msg) => {
                const isDev = msg.sender === "developer"
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex max-w-[85%] flex-col rounded-2xl px-5 py-4 shadow-md",
                      isDev
                        ? msg.isUpdateNotice
                          ? "self-start border border-emerald-500/45 bg-emerald-950/35 text-slate-100"
                          : "self-start border border-slate-700/80 bg-slate-900/95 text-slate-100"
                        : "self-end bg-cyan-600 text-white"
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-4 text-xs opacity-85">
                      <span className="font-bold tracking-wide">
                        {isDev ? `🛰️ ${msg.senderName}` : `⛪ ${msg.senderName}`}
                      </span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-base leading-relaxed">{msg.text}</p>

                    {msg.isUpdateNotice && (
                      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3">
                        <div>
                          <div className="text-sm font-bold text-emerald-300">
                            ✅ Custom Signed Release Ready (v{msg.releaseVersion || "1.1.0"})
                          </div>
                          <div className="text-xs text-emerald-200/80">
                            Certified for Windows &amp; macOS Sanctuary Systems
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="h-9 gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"
                          onClick={() =>
                            void openExternalUrl("https://lifestone-church-ai.vercel.app/#download")
                          }
                        >
                          <DownloadIcon className="size-4" />
                          Update Now
                        </Button>
                      </div>
                    )}

                    {msg.diagnostics && !isDev && (
                      <div className="mt-2.5 border-t border-white/20 pt-2 font-mono text-xs opacity-85">
                        {msg.diagnostics.hasGpu ? "⚡ GPU" : "🐢 CPU"}: {msg.diagnostics.gpuName} •{" "}
                        {osInfo.platform} • v{msg.diagnostics.appVersion}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Relaxed Multi-Line Message Composer ── */}
            <form onSubmit={handleSend} className="mt-4 shrink-0 space-y-3">
              {/* Category Selector + Hardware Diagnostics Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      { id: "feature", label: "💡 Feature Request" },
                      { id: "bug", label: "🐛 Bug / Audio Delay" },
                      { id: "question", label: "❓ Sanctuary Help" },
                      { id: "praise", label: "🙌 Church Testimony" },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                        category === cat.id
                          ? "bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400/50"
                          : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeDiagnostics}
                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                    className="size-4 rounded border-slate-600 accent-cyan-500"
                  />
                  <CpuIcon className="size-4 text-cyan-400" />
                  <span>
                    Include {osInfo.platform} &amp; GPU Specs (
                    {gpuInfo.hasGpu ? "GPU Accelerated" : "CPU Mode"})
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <textarea
                  rows={3}
                  placeholder={
                    isOnline
                      ? `Relax and write your message to the Lifestone developer as ${profile.signature}... (Press ${osInfo.sendShortcut} to send)`
                      : "Write your message here (it will automatically sync when internet reconnects)..."
                  }
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  className="min-h-[108px] flex-1 resize-y rounded-2xl border border-slate-700 bg-[#090f1e] px-4 py-3.5 text-base leading-relaxed text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
                />
                <Button
                  type="submit"
                  disabled={!text.trim() || isSending}
                  className="h-14 shrink-0 gap-2.5 rounded-2xl bg-cyan-600 px-6 text-base font-bold text-white shadow-lg hover:bg-cyan-500"
                >
                  <SendIcon className="size-5" />
                  <span>{isSending ? "Sending..." : "Send Message"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>

      <CommandCenterDialog
        open={commandCenterOpen}
        onOpenChange={setCommandCenterOpen}
      />
    </Dialog>
  )
}
