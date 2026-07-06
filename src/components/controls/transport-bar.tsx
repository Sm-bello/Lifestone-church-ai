import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { LevelMeter } from "@/components/ui/level-meter"
import { LiveIndicator } from "@/components/ui/live-indicator"
import { Badge } from "@/components/ui/badge"
import { MicIcon, PaletteIcon, CastIcon, SunIcon, MoonIcon, MonitorPlay } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsDialog } from "@/components/settings-dialog"
import { ThemeDesigner } from "@/components/broadcast/theme-designer"
import { BroadcastSettings } from "@/components/broadcast/broadcast-settings"
import { useAudioStore, useTranscriptStore, useBroadcastStore } from "@/stores"
import { useTheme } from "@/components/theme-provider"

export function TransportBar() {
  const { theme, setTheme } = useTheme()
  const audioLevel = useAudioStore((s) => s.level)
  const isTranscribing = useTranscriptStore((s) => s.isTranscribing)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [projectorOpen, setProjectorOpen] = useState(false)

  const openProjector = async () => {
    try {
      const monitors = await invoke<Array<{ name: string; width: number; height: number }>>("list_monitors")
      // Use monitor 1 if available (secondary/projector), otherwise monitor 0
      const monitorIndex = monitors.length > 1 ? 1 : 0
      await invoke("open_broadcast_window", { outputId: "main", monitorIndex })
      setProjectorOpen(true)
    } catch (e) {
      console.error("Failed to open projector:", e)
    }
  }

  const closeProjector = async () => {
    try {
      await invoke("close_broadcast_window", { outputId: "main" })
      setProjectorOpen(false)
    } catch (e) {
      console.error("Failed to close projector:", e)
    }
  }

  return (
    <div
      data-slot="transport-bar"
      className="col-span-4 flex h-14 items-center justify-between border-b border-border bg-card px-3"
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
        
        {/* Projector Toggle Button */}
        <Button
          variant={projectorOpen ? "default" : "ghost"}
          size="icon-sm"
          title={projectorOpen ? "Close Projector" : "Open Projector"}
          onClick={projectorOpen ? closeProjector : openProjector}
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
  )
}