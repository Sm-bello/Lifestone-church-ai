/**
 * use-hdmi-monitor.ts
 *
 * Polls Tauri's availableMonitors() to detect when a new display (e.g. a
 * projector via HDMI) is connected or disconnected while the app is open.
 *
 * Returns:
 *  - monitors        : current list of monitors
 *  - prevMonitorCount: count before the last change (for detecting plug-in)
 *  - hdmiDetected    : true when a *new* display just appeared
 *  - projectorMonitor: the most-likely projector monitor (index ≥ 1, or null)
 *  - dismissHdmi     : call this to clear the hdmiDetected flag
 *  - refresh         : manually re-poll
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { availableMonitors, type Monitor } from "@tauri-apps/api/window"

export interface HdmiMonitorState {
  monitors: Monitor[]
  prevMonitorCount: number
  hdmiDetected: boolean
  projectorMonitor: { monitor: Monitor; index: number } | null
  dismissHdmi: () => void
  refresh: () => Promise<void>
}

const POLL_INTERVAL_MS = 3000 // poll every 3 s

export function useHdmiMonitor(): HdmiMonitorState {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [prevMonitorCount, setPrevMonitorCount] = useState(0)
  const [hdmiDetected, setHdmiDetected] = useState(false)

  // Keep a ref to the last known count so the interval closure stays stable
  const lastCountRef = useRef(0)
  const initialLoadRef = useRef(true)

  const fetchMonitors = useCallback(async (): Promise<Monitor[]> => {
    try {
      return await availableMonitors()
    } catch {
      return []
    }
  }, [])

  const refresh = useCallback(async () => {
    const result = await fetchMonitors()
    const prev = lastCountRef.current

    if (!initialLoadRef.current && result.length > prev) {
      // A new display appeared → HDMI detected
      setHdmiDetected(true)
    }

    if (initialLoadRef.current && result.length > 1) {
      // Multiple monitors exist on startup → show the projector banner automatically
      setHdmiDetected(true)
    }

    if (result.length !== prev) {
      setPrevMonitorCount(prev)
      lastCountRef.current = result.length
    }

    setMonitors(result)
    initialLoadRef.current = false
  }, [fetchMonitors])

  // Initial load
  useEffect(() => {
    void refresh()
  }, [refresh])

  // Polling loop
  useEffect(() => {
    const id = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const dismissHdmi = useCallback(() => setHdmiDetected(false), [])

  // Best-guess projector monitor: prefer index 1+ (secondary), largest non-primary
  const projectorMonitor = (() => {
    if (monitors.length < 2) return null
    // Pick the monitor with the highest index (secondary / projector)
    const idx = monitors.length - 1
    return { monitor: monitors[idx], index: idx }
  })()

  return { monitors, prevMonitorCount, hdmiDetected, projectorMonitor, dismissHdmi, refresh }
}
