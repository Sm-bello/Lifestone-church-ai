import { create } from "zustand"
import { toast } from "sonner"
import { detectGpuSpecs } from "@/hooks/use-gpu-info"
import {
  getOrCreateCryptoIdentity,
  signNodePayload,
  fetchRealMachineLocation,
  type SignedPayloadEnvelope,
} from "@/lib/crypto-node"

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
  cpuCores?: number
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
  cryptoEnvelope?: SignedPayloadEnvelope
  timestamp: number
  read?: boolean
}

export interface NodeProfile {
  nodeId: string
  signature: string
  publicKeyFingerprint: string
  publicKeyHex: string
  cryptoAlgorithm: "ECDSA-P256-SHA256"
  lastSignatureHex?: string
  email: string
  displayName: string
  churchName: string
  churchAddress: string
  city: string
  region: string
  country: string
  isp: string
  ip: string
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
  updateLocation: (coords: {
    latitude: number
    longitude: number
    address?: string
    city?: string
    country?: string
  }) => void
  refreshRealLocation: () => Promise<void>
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
  const cleanChurch =
    churchName
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
      const randomHex = Array.from({ length: 8 }, () =>
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
  return "LS-NODE-LOCAL001"
}

function loadProfile(): NodeProfile {
  const nodeId = getOrCreateNodeId()
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_PROFILE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as NodeProfile
        return {
          ...parsed,
          nodeId: parsed.nodeId || nodeId,
          cryptoAlgorithm: "ECDSA-P256-SHA256",
          publicKeyFingerprint: parsed.publicKeyFingerprint || "",
          publicKeyHex: parsed.publicKeyHex || "",
          region: parsed.region || "",
          isp: parsed.isp || "",
          ip: parsed.ip || "",
        }
      }
    }
  } catch {
    // ignore
  }
  return {
    nodeId,
    signature: `LS-ANON-${nodeId.slice(-4)}`,
    publicKeyFingerprint: "",
    publicKeyHex: "",
    cryptoAlgorithm: "ECDSA-P256-SHA256",
    email: "",
    displayName: "",
    churchName: "",
    churchAddress: "",
    city: "",
    region: "",
    country: "",
    isp: "",
    ip: "",
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

  return [
    {
      id: "welcome-msg-1",
      nodeId,
      signature,
      sender: "developer",
      senderName: "Lifestone Command Center",
      text: "Welcome to Lifestone Direct Line! Your app runs an ECDSA-P256-SHA256 cryptographic light-node. Sign in with your Gmail & Sanctuary name to bind your Church Digital Signature and chat directly with us.",
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
      void get().syncWithCommandCenter(true)
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
      churchAddress: churchAddress.trim() || current.churchAddress,
      city: city.trim() || current.city,
      country: country.trim() || current.country,
      signature,
      isAuthenticated: true,
    }
    saveProfile(nextProfile)

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
        text: `Cryptographic Digital Signature [${nextProfile.signature}] bound to ECDSA P-256 key (${
          nextProfile.publicKeyFingerprint || "active"
        }) for ${nextProfile.churchName} (${nextProfile.email}).`,
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
      description: `Cryptographic Signature: ${nextProfile.signature}`,
    })

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

  updateLocation: ({ latitude, longitude, address, city, country }) => {
    const current = get().profile
    const updated: NodeProfile = {
      ...current,
      latitude,
      longitude,
      churchAddress: address !== undefined ? address : current.churchAddress,
      city: city !== undefined ? city : current.city,
      country: country !== undefined ? country : current.country,
    }
    saveProfile(updated)
    set({ profile: updated })
    void get().sendBeaconHeartbeat({ status: "online" })
  },

  refreshRealLocation: async () => {
    const geo = await fetchRealMachineLocation()
    if (!geo) return

    const current = get().profile
    const autoAddress =
      current.churchAddress ||
      [geo.city, geo.region, geo.country].filter(Boolean).join(", ")

    const updated: NodeProfile = {
      ...current,
      latitude: current.latitude ?? geo.latitude,
      longitude: current.longitude ?? geo.longitude,
      city: current.city || geo.city,
      region: geo.region,
      country: current.country || geo.country,
      isp: geo.isp,
      ip: geo.ip,
      churchAddress: autoAddress,
    }
    saveProfile(updated)
    set({ profile: updated })
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
          cpuCores:
            typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4,
        }
      : undefined

    // Cryptographically sign the message payload with ECDSA-P256-SHA256
    let cryptoEnvelope: SignedPayloadEnvelope | undefined
    try {
      cryptoEnvelope = await signNodePayload(`MSG:${profile.signature}:${cleanText}`)
    } catch {
      // Fallback if SubtleCrypto unavailable in test runner
    }

    const newMsg: FeedbackMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nodeId: profile.nodeId,
      signature: profile.signature,
      sender: "user",
      senderName: profile.churchName || profile.displayName || "Church Operator",
      text: cleanText,
      category,
      diagnostics,
      cryptoEnvelope,
      timestamp: Date.now(),
      read: true,
    }

    const updatedMessages = [...messages, newMsg]
    saveMessages(updatedMessages)
    set({ messages: updatedMessages })

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 7000)
      const res = await fetch(`${COMMAND_CENTER_BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_feedback",
          profile: get().profile,
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
      // Offline or unreachable
    } finally {
      set({ isSyncing: false })
    }
  },

  sendBeaconHeartbeat: async (statusInfo) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ isOnline: false })
      return
    }

    const gpu = detectGpuSpecs()

    // Ensure cryptographic identity is initialized
    let currentProfile = get().profile
    try {
      const cryptoId = await getOrCreateCryptoIdentity()
      const envelope = await signNodePayload(
        `BEACON:${cryptoId.nodeId}:${statusInfo?.status || "online"}`
      )
      currentProfile = {
        ...currentProfile,
        nodeId: cryptoId.nodeId,
        publicKeyFingerprint: cryptoId.publicKeyFingerprint,
        publicKeyHex: cryptoId.publicKeyHex,
        cryptoAlgorithm: "ECDSA-P256-SHA256",
        lastSignatureHex: envelope.signatureHex,
        signature: currentProfile.isAuthenticated
          ? currentProfile.signature
          : `LS-SIG-${cryptoId.publicKeyFingerprint.slice(2, 8)}`,
      }
      saveProfile(currentProfile)
      set({ profile: currentProfile })
    } catch {
      // Fallback if WebCrypto unavailable
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      await fetch(`${COMMAND_CENTER_BASE_URL}/api/beacon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: currentProfile.nodeId,
          signature: currentProfile.signature,
          publicKeyFingerprint: currentProfile.publicKeyFingerprint,
          publicKeyHex: currentProfile.publicKeyHex,
          cryptoAlgorithm: currentProfile.cryptoAlgorithm,
          lastSignatureHex: currentProfile.lastSignatureHex,
          churchName: currentProfile.churchName || "Live Lifestone Desktop Node",
          displayName: currentProfile.displayName || "Desktop Operator",
          email: currentProfile.email,
          churchAddress: currentProfile.churchAddress,
          city: currentProfile.city,
          region: currentProfile.region,
          country: currentProfile.country,
          isp: currentProfile.isp,
          ip: currentProfile.ip,
          latitude: currentProfile.latitude,
          longitude: currentProfile.longitude,
          appVersion: "1.1.0",
          hasGpu: gpu.hasGpu,
          gpuName: gpu.gpuName,
          performanceTier: gpu.performanceTier,
          status: statusInfo?.status || "online",
          activeItem: statusInfo?.activeItem || "Live Ready",
          screenCount: statusInfo?.screenCount || 1,
          timestamp: Date.now(),
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      set({ lastBeaconAt: Date.now(), isOnline: true })
    } catch {
      set({ lastBeaconAt: Date.now() })
    }
  },

  init: () => {
    if (typeof window === "undefined") return

    // 1. Initialize ECDSA-P256-SHA256 keypair and real IP geolocation immediately
    void (async () => {
      try {
        const cryptoId = await getOrCreateCryptoIdentity()
        const current = get().profile
        const next: NodeProfile = {
          ...current,
          nodeId: cryptoId.nodeId,
          publicKeyFingerprint: cryptoId.publicKeyFingerprint,
          publicKeyHex: cryptoId.publicKeyHex,
          cryptoAlgorithm: "ECDSA-P256-SHA256",
          signature: current.isAuthenticated
            ? current.signature
            : `LS-SIG-${cryptoId.publicKeyFingerprint.slice(2, 8)}`,
        }
        saveProfile(next)
        set({ profile: next })
      } catch {
        // ignore
      }

      await get().refreshRealLocation()
      await get().sendBeaconHeartbeat({ status: "online" })
      await get().syncWithCommandCenter(true)
    })()

    const handleOnline = () => {
      set({ isOnline: true })
      void get().refreshRealLocation()
      void get().sendBeaconHeartbeat({ status: "online" })
      void get().syncWithCommandCenter(true)
    }
    const handleOffline = () => {
      set({ isOnline: false })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    setInterval(() => {
      void get().sendBeaconHeartbeat({ status: "online" })
      void get().syncWithCommandCenter(true)
    }, 120_000)
  },
}))
