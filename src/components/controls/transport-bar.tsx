import { useState, useCallback, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { toast } from "sonner"
import { LevelMeter } from "@/components/ui/level-meter"
import { LiveIndicator } from "@/components/ui/live-indicator"
import { Badge } from "@/components/ui/badge"
import {
  MicIcon,
  PaletteIcon,
  CastIcon,
  SunIcon,
  MoonIcon,
  MonitorPlay,
  Music2,
  BellIcon,
  MessageSquareHeartIcon,
  ZapIcon,
  CpuIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsDialog } from "@/components/settings-dialog"
import { HymnConsole } from "@/components/hymn-console"
import { UpdateDialog } from "@/components/update-dialog"
import { FeedbackDialog } from "@/components/feedback-dialog"
import { ThemeDesigner } from "@/components/broadcast/theme-designer"
import { BroadcastSettings } from "@/components/broadcast/broadcast-settings"
import { HdmiProjectorBanner } from "@/components/broadcast/hdmi-projector-banner"
import {
  useAudioStore,
  useTranscriptStore,
  useBroadcastStore,
  useHymnStore,
  useUpdateStore,
  useFeedbackStore,
} from "@/stores"
import { useTutorialStore } from "@/stores/tutorial-store"
import { useTheme } from "@/components/theme-provider"
import { useHdmiMonitor } from "@/hooks/use-hdmi-monitor"
import { useGpuInfo } from "@/hooks/use-gpu-info"
import { cn } from "@/lib/utils"

export function TransportBar() {
  const { theme, setTheme } = useTheme()
  const audioLevel = useAudioStore((s) => s.level)
  const isTranscribing = useTranscriptStore((s) => s.isTranscribing)
  const isHymnOpen = useHymnStore((s) => s.isConsoleOpen)
  const activeStanzaId = useHymnStore((s) => s.activeStanzaId)
  const hasUpdate = useUpdateStore((s) => s.hasUpdate)
  const latestRelease = useUpdateStore((s) => s.latestRelease)
  const unreadFeedbackCount = useFeedbackStore((s) => s.unreadCount)
  const feedbackProfile = useFeedbackStore((s) => s.profile)
  const setFeedbackDialogOpen = useFeedbackStore((s) => s.setDialogOpen)

  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [projectorOpen, setProjectorOpen] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(false)

  const gpuInfo = useGpuInfo()

  const [hasSeenHymnNotification, setHasSeenHymnNotification] = useState<boolean>(() => {
    try {
      return localStorage.getItem("lifestone_hymn_announcement_seen_v1") === "true"
    } catch {
      return false
    }
  })

  const dismissHymnNotification = useCallback(() => {
    try {
      localStorage.setItem("lifestone_hymn_announcement_seen_v1", "true")
    } catch {
      // non-fatal
    }
    setHasSeenHymnNotification(true)
  }, [])

  // Initialize quiet background release listener & Command Center light-node beacon on startup
  useEffect(() => {
    void useUpdateStore.getState().init()
    useFeedbackStore.getState().init()
  }, [])

  // Trigger instant GPU / CPU recognition toast on startup
  useEffect(() => {
    const timer = setTimeout(() => {
      gpuInfo.triggerGpuStartupToast(false)
    }, 900)
    return () => clearTimeout(timer)
  }, [gpuInfo])

  // Flash a welcoming announcement toast on launch if not yet acknowledged
  useEffect(() => {
    if (!hasSeenHymnNotification) {
      const timer = setTimeout(() => {
        toast("🎵 Church Hymnal & HDMI Auto-Detect Are Live!", {
          description:
            "Over 2,000 hymns ready for worship. The interactive tutorial guide has been updated with full projector, GPU, and developer chat walkthroughs.",
          action: {
            label: "Take Tour",
            onClick: () => {
              dismissHymnNotification()
              useTutorialStore.getState().startTutorial()
            },
          },
          duration: 9000,
        })
      }, 2800)
      return () => clearTimeout(timer)
    }
  }, [hasSeenHymnNotification, dismissHymnNotification])

  const hdmiState = useHdmiMonitor()

  // Show banner whenever HDMI is detected or projector is active
  const showBanner = hdmiState.hdmiDetected || projectorOpen || bannerVisible

  const openProjector = useCallback(async () => {
    try {
      const { monitors } = hdmiState
      // Prefer secondary monitor (index 1), else primary (index 0)
      const monitorIndex = monitors.length > 1 ? 1 : 0
      await invoke("open_broadcast_window", { outputId: "main", monitorIndex })
      setProjectorOpen(true)
      useBroadcastStore.getState().syncBroadcastOutputFor("main")
      setTimeout(() => {
        useBroadcastStore.getState().syncBroadcastOutputFor("main")
      }, 200)
    } catch (e) {
      console.error("Failed to open projector:", e)
    }
  }, [hdmiState])

  const closeProjector = useCallback(async () => {
    try {
      await invoke("close_broadcast_window", { outputId: "main" })
      setProjectorOpen(false)
    } catch (e) {
      console.error("Failed to close projector:", e)
    }
  }, [])

  const handleProjectorButtonClick = () => {
    if (projectorOpen) {
      void closeProjector()
    } else if (hdmiState.monitors.length > 1) {
      // Multiple monitors available – show the guided banner
      setBannerVisible(true)
    } else {
      // Single monitor fallback
      void openProjector()
    }
  }

  const handleBannerDismiss = () => {
    hdmiState.dismissHdmi()
    setBannerVisible(false)
  }

  return (
    <div className="col-span-4 flex flex-col border-b border-border bg-card">
      {/* ── Main bar ── */}
      <div
        data-slot="transport-bar"
        className="flex h-14 items-center justify-between px-3"
      >
        {/* Left: Logo + Plan Badge + Hardware GPU Indicator */}
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Lifestone
          </span>
          <Badge variant="outline" className="text-[0.5625rem] uppercase">
            Free
          </Badge>

          {/* Hardware GPU / CPU Status Badge */}
          <button
            type="button"
            data-tour="gpu-status"
            onClick={() => gpuInfo.triggerGpuStartupToast(true)}
            title={
              gpuInfo.hasGpu
                ? `yay! there GPU lets fly — ${gpuInfo.gpuName} (${gpuInfo.latencyHint})`
                : `i notice there is no GPU here, well the ai voice recognition will still work but expect it to have some delay (${gpuInfo.gpuName})`
            }
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-medium transition-colors",
              gpuInfo.hasGpu
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            )}
          >
            {gpuInfo.hasGpu ? (
              <>
                <ZapIcon className="size-2.5 fill-current" />
                <span>GPU Ready</span>
              </>
            ) : (
              <>
                <CpuIcon className="size-2.5" />
                <span>CPU Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Audio + Status + Projector + Hymnal + Talk to Developer + Settings */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <MicIcon className="size-3.5 text-muted-foreground" />
            <LevelMeter level={audioLevel.rms} bars={4} />
          </div>
          <LiveIndicator active={isTranscribing} />

          {/* HDMI / Monitor badge when external display detected */}
          {hdmiState.monitors.length > 1 && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.55rem] font-medium uppercase tracking-wide transition-colors",
                projectorOpen
                  ? "bg-lime-500/15 text-lime-400"
                  : "bg-amber-500/12 text-amber-400"
              )}
              title={`${hdmiState.monitors.length} displays detected`}
            >
              {hdmiState.monitors.length} screens
            </span>
          )}

          {/* Projector Toggle Button */}
          <Button
            variant={projectorOpen ? "default" : "ghost"}
            size="icon-sm"
            data-tour="projector-toggle"
            title={
              projectorOpen
                ? "Projector active – click to close"
                : hdmiState.monitors.length > 1
                ? "External display detected – click to project"
                : "Open Projector"
            }
            onClick={handleProjectorButtonClick}
            className={cn(
              projectorOpen && "bg-lime-600 hover:bg-lime-500 text-white",
              !projectorOpen &&
                hdmiState.hdmiDetected &&
                "animate-pulse text-amber-400"
            )}
          >
            <MonitorPlay className="size-3.5" />
          </Button>

          {/* Hymnal / Worship Console Toggle with Pulsating Announcement Badge */}
          <div className="relative flex items-center">
            <Button
              variant={isHymnOpen || activeStanzaId ? "default" : "ghost"}
              size="icon-sm"
              data-tour="hymnal-toggle"
              title={
                activeStanzaId
                  ? "Hymn presenting – click to view console"
                  : !hasSeenHymnNotification
                  ? "🎵 New: Church Hymnal (2,000+ Hymns) – Click to explore"
                  : "Hymnal & Worship Songs"
              }
              onClick={() => {
                dismissHymnNotification()
                useHymnStore.getState().openConsole()
              }}
              className={cn(
                activeStanzaId && "bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse"
              )}
            >
              <Music2 className="size-3.5" />
            </Button>
            {!hasSeenHymnNotification && !activeStanzaId && (
              <span
                className="pointer-events-none absolute -top-1 -right-1 flex h-2.5 w-2.5"
                title="New Feature: Church Hymnal is live!"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500 ring-2 ring-card" />
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            title="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <SunIcon className="size-3.5" />
            ) : (
              <MoonIcon className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Broadcast Settings"
            data-tour="broadcast"
            onClick={() => setBroadcastOpen(true)}
          >
            <CastIcon className="size-3.5" />
          </Button>
          <BroadcastSettings open={broadcastOpen} onOpenChange={setBroadcastOpen} />
          <Button
            variant="ghost"
            size="icon-sm"
            title="Theme Designer"
            data-tour="theme"
            onClick={() => useBroadcastStore.getState().setDesignerOpen(true)}
          >
            <PaletteIcon className="size-3.5" />
          </Button>
          <ThemeDesigner />

          {/* Release Notification Bell with Persistent Notification Badge */}
          <div className="relative flex items-center">
            <Button
              variant="ghost"
              size="icon-sm"
              title={
                hasUpdate
                  ? `New update available: v${latestRelease?.version}`
                  : !hasSeenHymnNotification
                  ? "New Features: Church Hymnal & HDMI Auto-Detect"
                  : "Notifications & Updates"
              }
              onClick={() => {
                dismissHymnNotification()
                useUpdateStore.getState().openDialog()
              }}
            >
              <BellIcon className="size-3.5" />
            </Button>
            {(hasUpdate || !hasSeenHymnNotification) && (
              <span
                className={cn(
                  "pointer-events-none absolute top-1.5 right-1.5 size-2 rounded-full ring-2 ring-card animate-pulse",
                  hasUpdate ? "bg-rose-500" : "bg-cyan-400"
                )}
                title={
                  hasUpdate
                    ? `New release available: v${latestRelease?.version}`
                    : "New feature: Church Hymnal & HDMI guide"
                }
              />
            )}
          </div>

          {/* ── Top Corner "Talk to the Developer" Button ── */}
          <div className="relative flex items-center">
            <Button
              variant="outline"
              size="sm"
              data-tour="developer-feedback"
              onClick={() => setFeedbackDialogOpen(true)}
              title={
                feedbackProfile.isAuthenticated
                  ? `Talk to the Developer (${feedbackProfile.signature})`
                  : "Talk to the Developer — Connect with Lifestone Command Center"
              }
              className="h-7 gap-1.5 border-cyan-500/35 bg-cyan-500/10 px-2.5 text-[0.68rem] font-medium text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200"
            >
              <MessageSquareHeartIcon className="size-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Talk to the Developer</span>
              <span className="inline sm:hidden">Developer</span>
            </Button>
            {unreadFeedbackCount > 0 && (
              <span className="pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.55rem] font-bold text-white ring-2 ring-card">
                {unreadFeedbackCount}
              </span>
            )}
          </div>

          <UpdateDialog />
          <FeedbackDialog screenCount={hdmiState.monitors.length || 1} />
          <SettingsDialog />
          <HymnConsole />
        </div>
      </div>

      {/* ── HDMI / Projector guidance banner (slides in below the bar) ── */}
      {showBanner && (
        <div className="border-t border-border/60 bg-muted/30 px-3 py-1.5">
          <HdmiProjectorBanner
            monitors={hdmiState.monitors}
            projectorOpen={projectorOpen}
            openProjector={openProjector}
            closeProjector={closeProjector}
            dismissHdmi={handleBannerDismiss}
          />
        </div>
      )}
    </div>
  )
}
