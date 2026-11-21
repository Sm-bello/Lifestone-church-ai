import { useState } from "react"
import { openExternalUrl } from "@/lib/open-external"
import {
  SparklesIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  DownloadIcon,
  ExternalLinkIcon,
  InfoIcon,
  GraduationCapIcon,
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
import { useTutorialStore } from "@/stores/tutorial-store"

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
    const targetUrl =
      latestRelease?.releaseUrl ||
      "https://github.com/calvaryarmies/Lifestone-church-ai/releases/latest"
    await openExternalUrl(targetUrl)
  }

  const handleManualCheck = async () => {
    setFeedback(null)
    const update = await checkForUpdates()
    if (!update) {
      setFeedback("You're on the latest version!")
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {hasUpdate ? (
                <SparklesIcon className="size-4 animate-spin text-rose-500" />
              ) : (
                <CheckCircle2Icon className="size-4 text-emerald-500" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {hasUpdate ? "New Release Available" : "Notifications & Updates"}
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
          <div className="space-y-4 pt-2">
            {/* Feature Spotlight Card */}
            <div className="space-y-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-left">
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  What&apos;s New in v1.2.0 • Spanish Bible Update
                </span>
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                Nueva Traducción BibliaTodo (NTBT), 2,900+ Hymns &amp; HDMI Auto-Detect
              </h4>
              <ul className="text-xs text-muted-foreground space-y-2 pt-1">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400">🇪🇸</span>
                  <span><strong>New Spanish Bible (NTBT):</strong> Full offline <em>Santa Biblia, Nueva Traducción BibliaTodo (NTBT)</em> with Spanish book recognition (<em>Juan 3:16</em>, <em>Salmos 23</em>, <em>Génesis 1:1</em>) and one-click translation toggle.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">🎵</span>
                  <span><strong>Church Hymnal:</strong> Over 2,900 hymns from Gospel Hymn Book (GHS), CAC &amp; classic hymnals with instant lyric search and live projection.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">⚡</span>
                  <span><strong>Plug-and-Play HDMI:</strong> Automatic display detection for church projectors and TVs. Just plug in and Lifestone asks which screen to use.</span>
                </li>
              </ul>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 text-xs border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                  onClick={() => {
                    closeDialog()
                    useTutorialStore.getState().startTutorial()
                  }}
                >
                  <GraduationCapIcon className="size-3.5" />
                  Start Interactive Tutorial Guide
                </Button>
              </div>
            </div>

            <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">
                You are currently running the latest official release: <strong>v{currentVersion}</strong>
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

            <div className="flex items-center justify-between gap-2 pt-1">
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
