/**
 * HdmiProjectorBanner
 *
 * Appears automatically when a new monitor/projector is detected (HDMI plug-in).
 * Guides the user step-by-step:
 *   Step 1 – "New display detected – Accept HDMI connection"
 *   Step 2 – "Select your projector screen"
 *   Step 3 – "Project" button that opens the broadcast window fullscreen
 *             on the selected monitor, sized to match the display exactly.
 *
 * The banner is fully responsive and adapts its layout based on available space.
 */

import { useState, useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import {
  MonitorPlay,
  Plug,
  CheckCircle2,
  ChevronRight,
  X,
  Monitor,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useBroadcastStore } from "@/stores"
import type { HdmiMonitorState } from "@/hooks/use-hdmi-monitor"
import type { Monitor as TauriMonitor } from "@tauri-apps/api/window"

type Step = "notify" | "select" | "done"

interface Props extends HdmiMonitorState {
  /** Whether a broadcast window is currently open */
  projectorOpen: boolean
  onProjectorOpen: (open: boolean) => void
}

function MonitorCard({
  monitor,
  index,
  selected,
  onSelect,
}: {
  monitor: TauriMonitor
  index: number
  selected: boolean
  onSelect: () => void
}) {
  const { width, height } = monitor.size
  const isPrimary = index === 0
  const ratio = width / height

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-left transition-all",
        selected
          ? "border-lime-500/60 bg-lime-500/10 text-lime-300"
          : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-card/80 hover:text-foreground"
      )}
    >
      {/* Mini screen preview */}
      <div
        className={cn(
          "rounded border-2 flex items-center justify-center transition-colors",
          selected ? "border-lime-500/60 bg-lime-500/10" : "border-border bg-background"
        )}
        style={{
          width: Math.round(48 * Math.min(ratio, 2)),
          height: 48,
        }}
      >
        <Monitor
          className={cn(
            "size-5 transition-colors",
            selected ? "text-lime-400" : "text-muted-foreground group-hover:text-foreground"
          )}
        />
      </div>

      <div className="text-center">
        <p className="text-xs font-medium leading-tight">
          {isPrimary ? "Primary" : `Display ${index + 1}`}
        </p>
        <p className="text-[0.625rem] text-muted-foreground leading-tight">
          {width}×{height}
        </p>
        {monitor.name && (
          <p className="text-[0.6rem] text-muted-foreground/70 truncate max-w-[80px] leading-tight">
            {monitor.name}
          </p>
        )}
      </div>

      {selected && (
        <CheckCircle2 className="absolute top-1.5 right-1.5 size-3.5 text-lime-400" />
      )}
    </button>
  )
}

export function HdmiProjectorBanner({
  monitors,
  hdmiDetected,
  projectorMonitor,
  dismissHdmi,
  refresh,
  projectorOpen,
  onProjectorOpen,
}: Props) {
  const [step, setStep] = useState<Step>("notify")
  const [selectedMonitorIdx, setSelectedMonitorIdx] = useState<number>(
    projectorMonitor?.index ?? (monitors.length > 1 ? 1 : 0)
  )
  const [launching, setLaunching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Reset to notify step whenever a new HDMI event fires
  // (parent controls visibility via hdmiDetected)

  const handleAccept = () => {
    // Pre-select the projector monitor
    const idx = projectorMonitor?.index ?? (monitors.length > 1 ? 1 : 0)
    setSelectedMonitorIdx(idx)
    setStep("select")
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const handleProject = useCallback(async () => {
    setLaunching(true)
    try {
      if (projectorOpen) {
        await invoke("close_broadcast_window", { outputId: "main" })
        onProjectorOpen(false)
      } else {
        await invoke("open_broadcast_window", {
          outputId: "main",
          monitorIndex: selectedMonitorIdx,
        })
        onProjectorOpen(true)
        useBroadcastStore.getState().syncBroadcastOutputFor("main")
        setTimeout(() => {
          useBroadcastStore.getState().syncBroadcastOutputFor("main")
        }, 200)
      }
      setStep("done")
      setTimeout(() => {
        dismissHdmi()
      }, 1800)
    } catch (e) {
      console.error("[HdmiProjectorBanner] Failed to toggle projector:", e)
    } finally {
      setLaunching(false)
    }
  }, [projectorOpen, selectedMonitorIdx, onProjectorOpen, dismissHdmi])

  const handleDismiss = () => {
    setStep("notify")
    dismissHdmi()
  }

  if (!hdmiDetected && !projectorOpen) return null

  // ── Persistent compact bar when projector is already open ────────────────
  if (!hdmiDetected && projectorOpen) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-lime-500/30 bg-lime-500/5 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 text-lime-400">
          <MonitorPlay className="size-3.5 shrink-0" />
          <span className="font-medium">Projecting on Display {selectedMonitorIdx + 1}</span>
          {monitors[selectedMonitorIdx] && (
            <span className="text-muted-foreground">
              ({monitors[selectedMonitorIdx].size.width}×
              {monitors[selectedMonitorIdx].size.height})
            </span>
          )}
        </div>
        <Button
          size="xs"
          variant="ghost"
          className="h-6 gap-1 px-2 text-[0.625rem] text-muted-foreground hover:text-foreground"
          onClick={async () => {
            try {
              await invoke("close_broadcast_window", { outputId: "main" })
              onProjectorOpen(false)
            } catch {}
          }}
        >
          <X className="size-3" />
          Stop
        </Button>
      </div>
    )
  }

  // ── Step: done ────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-lime-500/30 bg-lime-500/8 px-3 py-2.5 text-xs text-lime-400">
        <CheckCircle2 className="size-4 shrink-0" />
        <span className="font-medium">
          {projectorOpen ? "Projector active!" : "Projector closed."}
        </span>
      </div>
    )
  }

  // ── Step: notify ─────────────────────────────────────────────────────────
  if (step === "notify") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/8 px-3 py-2.5 shadow-md"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
            <Plug className="size-3.5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight">
              New display detected
            </p>
            <p className="text-[0.625rem] text-muted-foreground leading-tight truncate">
              HDMI connected — ready to project your content
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="xs"
            variant="ghost"
            className="h-7 gap-1 px-2 text-[0.625rem] text-muted-foreground"
            onClick={handleDismiss}
          >
            <X className="size-3" />
            Dismiss
          </Button>
          <Button
            size="xs"
            className="h-7 gap-1 px-2.5 text-[0.625rem] bg-amber-500 text-black hover:bg-amber-400"
            onClick={handleAccept}
          >
            Accept HDMI
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </div>
    )
  }

  // ── Step: select ──────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-lime-500/15">
            <MonitorPlay className="size-3.5 text-lime-400" />
          </div>
          <span className="text-xs font-semibold text-foreground">
            Select projector screen
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="xs"
            disabled={refreshing}
            onClick={handleRefresh}
            className="h-6 gap-1 px-1.5 text-[0.625rem] text-muted-foreground"
          >
            <RefreshCw className={cn("size-3", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Monitor grid — adapts to however many displays are connected */}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(monitors.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {monitors.length === 0 ? (
          <p className="col-span-full text-center text-[0.625rem] text-muted-foreground py-3">
            No displays found — click Refresh
          </p>
        ) : (
          monitors.map((m, i) => (
            <MonitorCard
              key={i}
              monitor={m}
              index={i}
              selected={selectedMonitorIdx === i}
              onSelect={() => setSelectedMonitorIdx(i)}
            />
          ))
        )}
      </div>

      {/* Selected screen info */}
      {monitors[selectedMonitorIdx] && (
        <p className="text-[0.625rem] text-muted-foreground text-center">
          Will project on{" "}
          <span className="text-foreground font-medium">
            {selectedMonitorIdx === 0 ? "Primary" : `Display ${selectedMonitorIdx + 1}`}
          </span>{" "}
          — {monitors[selectedMonitorIdx].size.width}×
          {monitors[selectedMonitorIdx].size.height}
        </p>
      )}

      {/* Project button */}
      <Button
        className="w-full gap-2 bg-lime-600 hover:bg-lime-500 text-white text-xs h-8"
        disabled={monitors.length === 0 || launching}
        onClick={handleProject}
      >
        <MonitorPlay className="size-3.5" />
        {launching ? "Opening…" : projectorOpen ? "Close Projector" : "Project"}
        {!launching && monitors[selectedMonitorIdx] && (
          <span className="text-lime-200/70 text-[0.6rem]">
            ({monitors[selectedMonitorIdx].size.width}×
            {monitors[selectedMonitorIdx].size.height})
          </span>
        )}
      </Button>
    </div>
  )
}
