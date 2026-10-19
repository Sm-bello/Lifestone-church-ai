import { useState } from "react"
import { openUrl } from "@tauri-apps/plugin-opener"
import {
  SparklesIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  DownloadIcon,
  ExternalLinkIcon,
  InfoIcon,
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
import { ReleaseNotesView } from "@/components/release-notes-view"
import { useUpdateStore } from "@/stores"

export function UpdateDialog() {
  const isDialogOpen = useUpdateStore((s) => s.isDialogOpen)
  const closeDialog = useUpdateStore((s) => s.closeDialog)
  const currentVersion = useUpdateStore((s) => s.currentVersion)
  const latestRelease = useUpdateStore((s) => s.latestRelease)
  const hasUpdate = useUpdateStore((s) => s.hasUpdate)
  const isChecking = useUpdateStore((s) => s.isChecking)
  const lastCheckedAt = useUpdateStore((s) => s.lastCheckedAt)
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates)

  const [feedback, setFeedback] = useState<string | null>(null)

  const handleOpenRelease = async () => {
    const url = "https://lifestone-church-ai.vercel.app"
    try {
      await openUrl(url)
    } catch {
      window.open(url, "_blank")
    }
  }

  const handleManualCheck = async () => {
    setFeedback(null)
    const found = await checkForUpdates(false)
    if (found) {
      setFeedback("A new release is available!")
    } else {
      setFeedback("You are already running the latest release.")
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="max-w-lg border-border bg-card p-6 sm:max-w-xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            {hasUpdate ? (
              <div className="flex size-8 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
                <SparklesIcon className="size-4 animate-pulse" />
              </div>
            ) : (
              <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <CheckCircle2Icon className="size-4" />
              </div>
            )}
            <div>
              <DialogTitle className="text-base font-semibold">
                {hasUpdate
                  ? "New Release Available"
                  : "Lifestone is Up to Date"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Current installed version: v{currentVersion}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {hasUpdate && latestRelease ? (
          <div className="space-y-4 pt-2">
            {/* Version announcement banner */}
            <div className="space-y-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <span className="size-2 animate-pulse rounded-full bg-rose-500" />
                  {latestRelease.title}
                </span>
                <Badge
                  variant="outline"
                  className="border-rose-500/40 font-mono text-[0.65rem] text-rose-400"
                >
                  v{latestRelease.version}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                A new version has been published. Download the latest installer
                from our website to upgrade your system.
              </p>
            </div>

            {/* Release notes scrollbox */}
            {latestRelease.notes && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <InfoIcon className="size-3.5" />
                  <span>What&apos;s New in this Release:</span>
                </div>
                <div className="custom-scroll h-52 w-full overflow-y-auto rounded-md border border-border bg-muted/20 p-3.5">
                  <ReleaseNotesView notes={latestRelease.notes} />
                </div>
              </div>
            )}

            {/* Persistent Red Dot Notice */}
            <div className="rounded-md bg-muted/40 px-3 py-2 text-[0.7rem] text-muted-foreground">
              💡 <strong>Note:</strong> The red notification dot on your toolbar
              will remain active until you install this update on your computer.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="gap-1.5 text-xs"
              >
                <RefreshCwIcon
                  className={`size-3.5 ${isChecking ? "animate-spin" : ""}`}
                />
                {isChecking ? "Checking..." : "Re-check"}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeDialog}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenRelease}
                  className="gap-1.5 bg-rose-600 text-xs font-medium text-white shadow-sm hover:bg-rose-500"
                >
                  <DownloadIcon className="size-3.5" />
                  Download Update
                  <ExternalLinkIcon className="size-3 opacity-70" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-3">
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4 text-center">
              <p className="text-xs text-muted-foreground">
                You are currently running the latest official release (v
                {currentVersion}). When a new version is published, a red alert
                dot will appear on your notification icon.
              </p>
              {lastCheckedAt && (
                <p className="text-[0.65rem] text-muted-foreground/70">
                  Last checked: {new Date(lastCheckedAt).toLocaleTimeString()}
                </p>
              )}
            </div>

            {feedback && (
              <div className="text-center text-xs text-emerald-400">
                {feedback}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="gap-1.5 text-xs"
              >
                <RefreshCwIcon
                  className={`size-3.5 ${isChecking ? "animate-spin" : ""}`}
                />
                {isChecking ? "Checking GitHub..." : "Check for Updates"}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={closeDialog}
                className="text-xs"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
