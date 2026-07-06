import { TransportBar } from "@/components/controls/transport-bar"
import { TranscriptPanel } from "@/components/panels/transcript-panel"
import { PreviewPanel } from "@/components/panels/preview-panel"
import { LiveOutputPanel } from "@/components/panels/live-output-panel"
import { MediaBucket } from "@/components/media-bucket"
import { QueuePanel } from "@/components/panels/queue-panel"
import { SearchPanel } from "@/components/panels/search-panel"
import { DetectionsPanel } from "@/components/panels/detections-panel"

export function Dashboard() {
  return (
    <div
      style={{
        position: "fixed",
        inset: "6px",
        display: "grid",
        gridTemplateColumns: "320px 1fr 1fr 320px",
        gridTemplateRows: "56px minmax(0, 2fr) minmax(0, 3fr)",
        gap: "12px",
        overflow: "hidden",
      }}
      className="bg-background"
    >
      {/* Row 1: Transport Bar — spans all 4 columns */}
      <div className="col-span-4">
        <TransportBar />
      </div>

      {/* Row 2: Top row */}
      <TranscriptPanel />
      <PreviewPanel />
      <LiveOutputPanel />
      <QueuePanel />

      {/* Row 3: Bottom row */}
      {/* Bottom-left: Media Bucket */}
      <div className="min-h-0 h-full overflow-hidden flex flex-col">
        <MediaBucket />
      </div>

      {/* Bottom-center: Search spans 2 columns */}
      <div className="col-span-2 min-h-0 h-full overflow-hidden flex flex-col">
        <SearchPanel />
      </div>

      {/* Bottom-right: DetectionsPanel */}
      <div className="min-h-0 h-full overflow-hidden flex flex-col">
        <DetectionsPanel />
      </div>
    </div>
  )
}