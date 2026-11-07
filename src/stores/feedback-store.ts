import { create } from "zustand"
import { toast } from "sonner"
import { detectGpuSpecs } from "@/hooks/use-gpu-info"

const COMMAND_CENTER_BASE_URL =
  import.meta.env.VITE_COMMAND_CENTER_URL || "https://lifestone-church-ai.vercel.app"

const STORAGE_PROFILE_KEY = "lifestone_node_profile_v1"
const STORAGE_MESSAGES_KEY = "lifestone_feedback_messages_v1"

export interface NodeDiagnostics {
  appVersion: string
  gpuName: string
  hasGpu: boolean
  performanceTier: string
  os: string
  screenCount: number
}

export interface FeedbackMessage {
  id: string
  nodeId: string
  signature: string
  sender: "user" | "developer"
  senderName: string
  text: string
  category?: "bug" | "feature" | "praise" | "question" | "update-notice"
  isUpdateNotice?: boolean
  releaseVersion?: string
  diagnostics?: NodeDiagnostics
  timestamp: number
  read?: boolean
}

export interface NodeProfile {
  nodeId: string
  signature: string
  email: string
  displayName: string
  churchName: string
  churchAddress: string
  city: string
  country: string
  latitude?: number
  longitude?: number
  isAuthenticated: boolean
  createdAt: number
}

interface FeedbackState {
  profile: NodeProfile
  messages: FeedbackMessage[]
  unreadCount: number
  isDialogOpen: boolean
  isSending: boolean
  isSyncing: boolean
  isOnline: boolean
  lastBeaconAt: number | null

  // Actions
  setDialogOpen: (open: boolean) => void
  signInWithGmail: (params: {
    email: string
    displayName: string
    churchName: string
    churchAddress?: string
    city?: string
    country?: string
  }) => void
  signOut: () => void
  updateLocation: (coords: { latitude: number; longitude: number; address?: string }) => void
  sendMessage: (
    text: string,
    category?: FeedbackMessage["category"],
    includeDiagnostics?: boolean,
    screenCount?: number
  ) => Promise<boolean>
  syncWithCommandCenter: (silent?: boolean) => Promise<void>
  sendBeaconHeartbeat: (statusInfo?: {
    status: "live" | "transcribing" | "online"
    activeItem?: string
    screenCount?: number
  }) => Promise<void>
  markAllRead: () => void
  init: () => void
}

/** Generate a deterministic, human-readable Digital Signature for a church/user node */
export function generateDigitalSignature(email: string, churchName: string, nodeId: string): string {
  const cleanEmail = email.trim().toLowerCase()
  const cleanChurch = churchName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6) || "CHURCH"

  let hash = 2166136261
  const input = `${cleanEmail}:${churchName}:${nodeId}`
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 4)
  return `LS-SIG-${hex}-${cleanChurch}`
}

function getOrCreateNodeId(): string {
  try {
    if (typeof localStorage !== "undefined") {
      const existing = localStorage.getItem("lifestone_Install_node_id")
      if (existing) return existing
      const randomHex = Array.from({ length: 6 }, () =>
        Math.floor(Math.random() * 16)
          .toString(16)
          .toUpperCase()
      ).join("")
      const created = `LS-NODE-${randomHex}`
      localStorage.setItem("lifestone_Install_node_id", created)
      return created
    }
  } catch {
    // Fallback
  }
  return "LS-NODE-LOCAL01"
}

function loadProfile(): NodeProfile {
  const nodeId = getOrCreateNodeId()
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_PROFILE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as NodeProfile
        return { ...parsed, nodeId: parsed.nodeId || nodeId }
      }
    }
  } catch {
    // ignore
  }
  return {
    nodeId,
    signature: `LS-ANON-${nodeId.slice(-4)}`,
    email: "",
    displayName: "",
    churchName: "",
    churchAddress: "",
    city: "",
    country: "",
    isAuthenticated: false,
    createdAt: Date.now(),
  }
}

function saveProfile(profile: NodeProfile) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile))
    }
  } catch {
    // ignore
  }
}

function loadMessages(nodeId: string, signature: string): FeedbackMessage[] {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_MESSAGES_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as FeedbackMessage[]
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    }
  } catch {
    // ignore
  }

  // Default welcome message from Lifestone Command Center
  return [
    {
      id: "welcome-msg-1",
      nodeId,
      signature,
      sender: "developer",
      senderName: "Lifestone Command Center",
      text: "Welcome to Lifestone Direct Line! Sign in with your Gmail & Church name to get your unique Lifestone Digital Signature. You can message us directly here for features, bug fixes, or custom signed updates for your sanctuary.",
      category: "update-notice",
      timestamp: Date.now() - 60_000,
      read: true,
    },
  ]
}

function saveMessages(messages: FeedbackMessage[]) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages))
    }
  } catch {
    // ignore
  }
}

const initialProfile = loadProfile()
const initialMessages = loadMessages(initialProfile.nodeId, initialProfile.signature)

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  profile: initialProfile,
  messages: initialMessages,
  unreadCount: initialMessages.filter((m) => m.sender === "developer" && !m.read).length,
  isDialogOpen: false,
  isSending: false,
  isSyncing: false,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  lastBeaconAt: null,

  setDialogOpen: (open) => {
    set({ isDialogOpen: open })
    if (open) {
      get().markAllRead()
      void get().syncWithCommandCenter( true)
    }
  },

  markAllRead: () => {
    const updated = get().messages.map((m) => ({ ...m, read: true }))
    saveMessages(updated)
    set({ messages: updated, unreadCount: 0 })
  },

  signInWithGmail: ({ email, displayName, churchName, churchAddress = "", city = "", country = "" }) => {
    const current = get().profile
    const signature = generateDigitalSignature(email, churchName, current.nodeId)
    const nextProfile: NodeProfile = {
      ...current,
      email: email.trim(),
      displayName: displayName.trim() || email.split("@")[0] || "Media Lead",
      churchName: churchName.trim() || "Lifestone Sanctuary",
      churchAddress: churchAddress.trim(),
      city: city.trim(),
      country: country.trim(),
      signature,
      isAuthenticated: true,
    }
    saveProfile(nextProfile)

    // Add system confirmation message in chat
    const existing = get().messages
    const hasAuthMsg = existing.some((m) => m.id.startsWith("sig-issued-"))
    let nextMessages = existing
    if (!hasAuthMsg) {
      const confirmMsg: FeedbackMessage = {
        id: `sig-issued-${Date.now()}`,
        nodeId: nextProfile.nodeId,
        signature: nextProfile.signature,
        sender: "developer",
        senderName: "Lifestone Command Center",
        text: `Digital Signature [${nextProfile.signature}] assigned to ${nextProfile.churchName} (${nextProfile.email}). Your church light-node beacon is now active on the Lifestone Global Command Center map!`,
        category: "update-notice",
        timestamp: Date.now(),
        read: get().isDialogOpen,
      }
      nextMessages = [...existing, confirmMsg]
      saveMessages(nextMessages)
    }

    set({
      profile: nextProfile,
      messages: nextMessages,
      unreadCount: nextMessages.filter((m) => m.sender === "developer" && !m.read).length,
    })

    toast.success(`Signed in as ${nextProfile.churchName}`, {
      description: `Digital Signature: ${nextProfile.signature}`,
    })

    // Immediately fire beacon heartbeat with authenticated church identity
    void get().sendBeaconHeartbeat({ status: "online" })
  },

  signOut: () => {
    const current = get().profile
    const resetProfile: NodeProfile = {
      ...current,
      isAuthenticated: false,
    }
    saveProfile(resetProfile)
    set({ profile: resetProfile })
  },

  updateLocation: ({ latitude, longitude, address }) => {
    const current = get().profile
    const updated: NodeProfile = {
      ...current,
      latitude,
      longitude,
      churchAddress: address !== undefined ? address : current.churchAddress,
    }
    saveProfile(updated)
    set({ profile: updated })
    void get().sendBeaconHeartbeat({ status: "online" })
  },

  sendMessage: async (text, category = "feature", includeDiagnostics = true, screenCount = 1) => {
    const cleanText = text.trim()
    if (!cleanText) return false

    const { profile, messages } = get()
    set({ isSending: true })

    const gpu = detectGpuSpecs()
    const diagnostics: NodeDiagnostics | undefined = includeDiagnostics
      ? {
          appVersion: "1.1.0",
          gpuName: gpu.gpuName,
          hasGpu: gpu.hasGpu,
          performanceTier: gpu.performanceTier,
          os: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 64) : "Windows x64",
          screenCount,
        }
      : undefined

    const newMsg: FeedbackMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nodeId: profile.nodeId,
      signature: profile.signature,
      sender: "user",
      senderName: profile.churchName || profile.displayName || "Church Operator",
      text: cleanText,
      category,
      diagnostics,
      timestamp: Date.now(),
      read: true,
    }

    const updatedMessages = [...messages, newMsg]
    saveMessages(updatedMessages)
    set({ messages: updatedMessages })

    // Attempt to push to Lifestone Command Center API
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 7000)
      const res = await fetch(`${COMMAND_CENTER_BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_feedback",
          profile,
          message: newMsg,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = (await res.json()) as { replies?: FeedbackMessage[] }
        if (data.replies && Array.isArray(data.replies) && data.replies.length > 0) {
          const existingIds = new Set(get().messages.map((m) => m.id))
          const newReplies = data.replies.filter((r) => !existingIds.has(r.id))
          if (newReplies.length > 0) {
            const merged = [...get().messages, ...newReplies]
            saveMessages(merged)
            set({ messages: merged })
          }
        }
      }
    } catch {
      // Saved locally; will sync when online
    } finally {
      set({ isSending: false })
    }

    return true
  },

  syncWithCommandCenter: async (silent = true) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ isOnline: false })
      return
    }
    set({ isSyncing: true, isOnline: true })

    const { profile } = get()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)
      const url = `${COMMAND_CENTER_BASE_URL}/api/feedback?nodeId=${encodeURIComponent(
        profile.nodeId
      )}&signature=${encodeURIComponent(profile.signature)}&_t=${Date.now()}`

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)

      if (res.ok) {
        const data = (await res.json()) as { messages?: FeedbackMessage[] }
        if (data.messages && Array.isArray(data.messages)) {
          const currentMessages = get().messages
          const existingIds = new Set(currentMessages.map((m) => m.id))
          const incomingDeveloperMsgs = data.messages.filter(
            (m) => m.sender === "developer" && !existingIds.has(m.id)
          )

          if (incomingDeveloperMsgs.length > 0) {
            const isOpen = get().isDialogOpen
            const marked = incomingDeveloperMsgs.map((m) => ({
              ...m,
              read: isOpen,
            }))
            const merged = [...currentMessages, ...marked].sort((a, b) => a.timestamp - b.timestamp)
            saveMessages(merged)

            const unreadCount = merged.filter((m) => m.sender === "developer" && !m.read).length
            set({ messages: merged, unreadCount })

            // Notify user with toast for the latest developer message!
            const latest = marked[marked.length - 1]
            if (latest) {
              if (latest.isUpdateNotice) {
                toast("🚀 Signed Update Notice from Command Center!", {
                  description: `${latest.text}`,
                  action: {
                    label: "View Message",
                    onClick: () => get().setDialogOpen(true),
                  },
                  duration: 10000,
                })
              } else if (!silent || !isOpen) {
                toast("💬 Developer Reply — Lifestone Command Center", {
                  description: latest.text,
                  action: {
                    label: "Open Chat",
                    onClick: () => get().setDialogOpen(true),
                  },
                  duration: 8000,
                })
              }
            }
          }
        }
      }
    } catch {
      // Offline or unreachable — non-fatal
    } finally {
      set({ isSyncing: false })
    }
  },

  sendBeaconHeartbeat: async (statusInfo) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ isOnline: false })
      return
    }

    const { profile } = get()
    const gpu = detectGpuSpecs()

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      await fetch(`${COMMAND_CENTER_BASE_URL}/api/beacon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: profile.nodeId,
          signature: profile.signature,
          churchName: profile.churchName || "Anonymous Sanctuary Node",
          displayName: profile.displayName || "Media Operator",
          email: profile.email,
          churchAddress: profile.churchAddress,
          city: profile.city,
          country: profile.country,
          latitude: profile.latitude,
          longitude: profile.longitude,
          appVersion: "1.1.0",
          hasGpu: gpu.hasGpu,
          gpuName: gpu.gpuName,
          performanceTier: gpu.performanceTier,
          status: statusInfo?.status || "online",
          activeItem: statusInfo?.activeItem || "Standby",
          screenCount: statusInfo?.screenCount || 1,
          timestamp: Date.now(),
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      set({ lastBeaconAt: Date.now(), isOnline: true })
    } catch {
      // Non-fatal; church presentation continues 100% offline
    }
  },

  init: () => {
    if (typeof window === "undefined") return

    const handleOnline = () => {
      set({ isOnline: true })
      void get().sendBeaconHeartbeat({ status: "online" })
      void get().syncWithCommandCenter(true)
    }
    const handleOffline = () => {
      set({ isOnline: false })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Initial beacon heartbeat and message sync shortly after startup
    setTimeout(() => {
      void get().sendBeaconHeartbeat({ status: "online" })
      void get().syncWithCommandCenter(true)
    }, 3000)

    // Periodic heartbeat every 2 minutes to keep light-node live on Command Center map
    setInterval(() => {
      void get().sendBeaconHeartbeat({ status: "online" })
      void get().syncWithCommandCenter(true)
    }, 120_000)
  },
}))
