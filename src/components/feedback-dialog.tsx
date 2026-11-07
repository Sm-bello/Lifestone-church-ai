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
  ExternalLinkIcon,
  LogOutIcon,
  MailIcon,
  Building2Icon,
  DownloadIcon,
  LockIcon,
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
  const sendMessage = useFeedbackStore((s) => s.sendMessage)
  const syncWithCommandCenter = useFeedbackStore((s) => s.syncWithCommandCenter)

  const gpuInfo = useGpuInfo()

  // Sign-in form state
  const [email, setEmail] = useState(profile.email || "")
  const [displayName, setDisplayName] = useState(profile.displayName || "")
  const [churchName, setChurchName] = useState(profile.churchName || "")
  const [churchAddress, setChurchAddress] = useState(profile.churchAddress || "")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [locating, setLocating] = useState(false)
  const [commandCenterOpen, setCommandCenterOpen] = useState(false)

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
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const coordsText = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        const nextAddress = churchAddress
          ? `${churchAddress} (${coordsText})`
          : `Sanctuary Coords: ${coordsText}`
        setChurchAddress(nextAddress)
        updateLocation({ latitude, longitude, address: nextAddress })
        setLocating(false)
      },
      () => {
        setLocating(false)
      },
      { timeout: 6000 }
    )
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isSending) return
    const toSend = text
    setText("")
    await sendMessage(toSend, category, includeDiagnostics, screenCount)
  }

  const showAuthForm = !profile.isAuthenticated || isEditingProfile

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
                <MessageSquareHeartIcon className="size-4" />
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                  <span>Talk to the Developer</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 px-1.5 py-0 text-[0.6rem] font-medium",
                      isOnline
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    )}
                  >
                    <RadioIcon className="size-2.5 animate-pulse" />
                    {isOnline ? "Beacon Live" : "Offline Queue"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Direct line to Lifestone Command Center • Receive custom signed updates & support
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ── Digital Signature / Gmail Identity Card ── */}
        {showAuthForm ? (
          <form
            onSubmit={handleSignIn}
            className="space-y-3 rounded-xl border border-cyan-500/25 bg-cyan-950/10 p-3.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <ShieldCheckIcon className="size-4 text-cyan-400" />
                <span>Connect with Gmail for Your Church Digital Signature</span>
              </div>
              {profile.isAuthenticated && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[0.65rem]"
                  onClick={() => setIsEditingProfile(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
            <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
              Sign in with your Gmail and sanctuary name so we can assign your app a unique{" "}
              <strong className="text-foreground">Digital Signature</strong>, see your church beacon
              live on the Command Center map, and push targeted updates directly to your chat box.
            </p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-[0.65rem] font-medium text-muted-foreground">
                  <MailIcon className="size-3" />
                  Gmail / Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="yourchurch@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-1 text-[0.65rem] font-medium text-muted-foreground">
                  <Building2Icon className="size-3" />
                  Church / Sanctuary Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grace Assembly Church"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[0.65rem] font-medium text-muted-foreground">
                  Your Name / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pastor David / Media Lead"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1 text-[0.65rem] font-medium text-muted-foreground">
                    <MapPinIcon className="size-3 text-emerald-400" />
                    Church Location / Building
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={locating}
                    className="text-[0.62rem] font-medium text-cyan-400 hover:underline disabled:opacity-50"
                  >
                    {locating ? "Pinpointing..." : "📍 Pin GPS"}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="City, Country or Street Address"
                  value={churchAddress}
                  onChange={(e) => setChurchAddress(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-[0.65rem] text-muted-foreground">
                Node ID: {profile.nodeId}
              </span>
              <Button
                type="submit"
                size="sm"
                className="h-7 gap-1.5 bg-cyan-600 text-xs text-white hover:bg-cyan-500"
              >
                <SparklesIcon className="size-3.5" />
                Activate Digital Signature
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 shrink-0 text-emerald-400" />
              <div className="text-xs">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <span>{profile.churchName}</span>
                  <Badge
                    variant="outline"
                    className="border-cyan-500/40 bg-cyan-500/10 font-mono text-[0.6rem] text-cyan-300"
                  >
                    {profile.signature}
                  </Badge>
                </div>
                <div className="text-[0.65rem] text-muted-foreground">
                  {profile.email} {profile.churchAddress ? `• 📍 ${profile.churchAddress}` : ""}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[0.65rem]"
                onClick={() => setIsEditingProfile(true)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-muted-foreground hover:text-destructive"
                title="Sign out"
                onClick={signOut}
              >
                <LogOutIcon className="size-3" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Live Two-Way Chat Thread with Developer ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[0.68rem] text-muted-foreground">
            <span className="font-medium">
              Direct Chat Box ({profile.signature})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void syncWithCommandCenter(false)}
                disabled={isSyncing}
                className="flex items-center gap-1 text-cyan-400 hover:underline disabled:opacity-50"
              >
                <RefreshCwIcon className={cn("size-2.5", isSyncing && "animate-spin")} />
                <span>{isSyncing ? "Syncing..." : "Check Replies"}</span>
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setCommandCenterOpen(true)}
                className="flex items-center gap-1 font-semibold text-emerald-400 hover:underline"
              >
                <LockIcon className="size-2.5" />
                <span>Dev Command Center (PIN)</span>
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() =>
                  void openExternalUrl("https://lifestone-church-ai.vercel.app/command-center")
                }
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <span>Web Map</span>
                <ExternalLinkIcon className="size-2.5" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="custom-scroll flex h-56 flex-col gap-2.5 overflow-y-auto rounded-lg border border-border bg-background/60 p-3"
          >
            {messages.map((msg) => {
              const isDev = msg.sender === "developer"
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[88%] rounded-xl px-3 py-2 text-xs",
                    isDev
                      ? msg.isUpdateNotice
                        ? "self-start border border-emerald-500/40 bg-emerald-950/25 text-foreground"
                        : "self-start border border-border bg-muted/50 text-foreground"
                      : "self-end bg-cyan-600 text-white"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-3 text-[0.6rem] opacity-80">
                    <span className="font-semibold">
                      {isDev ? "🛰️ " + msg.senderName : msg.senderName}
                    </span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                  {msg.isUpdateNotice && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
                      <span className="text-[0.65rem] font-medium text-emerald-300">
                        ✅ Signed & Ready for Your Sanctuary
                      </span>
                      <Button
                        size="sm"
                        className="h-6 gap-1 bg-emerald-600 px-2 text-[0.65rem] text-white hover:bg-emerald-500"
                        onClick={() =>
                          void openExternalUrl("https://lifestone-church-ai.vercel.app/#download")
                        }
                      >
                        <DownloadIcon className="size-3" />
                        Update Now
                      </Button>
                    </div>
                  )}

                  {msg.diagnostics && !isDev && (
                    <div className="mt-1.5 border-t border-white/15 pt-1 font-mono text-[0.58rem] opacity-75">
                      {msg.diagnostics.hasGpu ? "⚡ GPU" : "🐢 CPU"}: {msg.diagnostics.gpuName} • v
                      {msg.diagnostics.appVersion}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Message Composer ── */}
        <form onSubmit={handleSend} className="space-y-2.5">
          {/* Category Selector + Hardware Diagnostics Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: "feature", label: "💡 Feature" },
                  { id: "bug", label: "🐛 Bug / Lag" },
                  { id: "question", label: "❓ Help" },
                  { id: "praise", label: "🙌 Testimony" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[0.65rem] font-medium transition-colors",
                    category === cat.id
                      ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <label className="flex cursor-pointer items-center gap-1.5 text-[0.65rem] text-muted-foreground">
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                className="rounded border-border"
              />
              <CpuIcon className="size-3 text-cyan-400" />
              <span>
                Attach PC Specs ({gpuInfo.hasGpu ? "GPU Accelerated" : "No GPU / CPU Mode"})
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={
                isOnline
                  ? `Message Lifestone Developer as ${profile.signature}...`
                  : "Write message (will send when internet reconnects)..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-cyan-500 focus:outline-none"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!text.trim() || isSending}
              className="h-8 gap-1.5 bg-cyan-600 px-3 text-xs text-white hover:bg-cyan-500"
            >
              <SendIcon className="size-3.5" />
              <span>{isSending ? "Sending..." : "Send"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
      <CommandCenterDialog
        open={commandCenterOpen}
        onOpenChange={setCommandCenterOpen}
      />
    </Dialog>
  )
}
