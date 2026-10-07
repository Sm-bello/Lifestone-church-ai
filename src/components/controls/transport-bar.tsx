import { useState, useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import { LevelMeter } from "@/components/ui/level-meter"
import { LiveIndicator } from "@/components/ui/live-indicator"
import { Badge } from "@/components/ui/badge"
import { MicIcon, PaletteIcon, CastIcon, SunIcon, MoonIcon, MonitorPlay } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsDialog } from "@/components/settings-dialog"
import { ThemeDesigner } from "@/components/broadcast/theme-designer"
import { BroadcastSettings } from "@/components/broadcast/broadcast-settings"
import { HdmiProjectorBanner } from "@/components/broadcast/hdmi-projector-banner"
import { useAudioStore, useTranscriptStore, useBroadcastStore } from "@/stores"
import { useTheme } from "@/components/theme-provider"
import { useHdmiMonitor } from "@/hooks/use-hdmi-monitor"
import { cn } from "@/lib/utils"

export function TransportBar() {
  const { theme, setTheme } = useTheme()
  const audioLevel = useAudioStore((s) => s.level)
  const isTranscribing = useTranscriptStore((s) => s.isTranscribing)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [projectorOpen, setProjectorOpen] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(false)

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
        {/* Left: Logo + Plan Badge */}
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Lifestone
          </span>
          <Badge variant="outline" className="text-[0.5625rem] uppercase">
            Free
          </Badge>
        </div>

        {/* Right: Audio + Status + Projector + Settings */}
        <div className="flex items-center gap-3">
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
          <SettingsDialog />
        </div>
      </div>

      {/* ── HDMI / Projector guidance banner (slides in below the bar) ── */}
      {showBanner && (
        <div className="border-t border-border px-3 pb-3 pt-2">
          <HdmiProjectorBanner
            {...hdmiState}
            dismissHdmi={handleBannerDismiss}
            projectorOpen={projectorOpen}
            onProjectorOpen={setProjectorOpen}
          />
        </div>
      )}
    </div>
  )
}