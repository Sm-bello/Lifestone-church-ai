/**
 * Lifestone Cryptographic Light-Node Identity & Signing Engine
 *
 * Uses the native Web Crypto API (`crypto.subtle`) to generate a persistent
 * asymmetric ECDSA P-256 (secp256r1) keypair per Lifestone installation.
 *
 * - Node ID & Fingerprint: Derived from the SHA-256 digest of the SPKI Public Key.
 * - Digital Signature: Every beacon heartbeat and feedback message payload is
 *   cryptographically signed using ECDSA with SHA-256 (`ECDSA-P256-SHA256`) and
 *   can be independently verified against the node's public key.
 */

const CRYPTO_KEYPAIR_STORAGE_KEY = "lifestone_ecdsa_p256_keypair_v1"
const DEV_PIN_SALTSHA256 =
  "22f757233717a14761147eb1e2f77785f7402450feaabb97087565e267bf856f"
let memoryIdentityCache: StoredCryptoIdentity | null = null

/**
 * Cryptographically verify the Developer Command Center PIN using a salted SHA-256 digest.
 * The raw PIN is never stored in source code or UI strings.
 */
export async function verifyDeveloperPin(pin: string): Promise<boolean> {
  try {
    const encoded = new TextEncoder().encode(`lifestone-command-salt-v1:${pin.trim()}`)
    const digest = await crypto.subtle.digest("SHA-256", encoded)
    return bufferToHex(digest) === DEV_PIN_SALTSHA256
  } catch {
    return false
  }
}

export interface StoredCryptoIdentity {
  nodeId: string
  publicKeyHex: string
  publicKeyFingerprint: string
  algorithm: "ECDSA-P256-SHA256"
  publicJwk: JsonWebKey
  privateJwk: JsonWebKey
  createdAt: number
}

export interface SignedPayloadEnvelope {
  algorithm: "ECDSA-P256-SHA256"
  publicKeyFingerprint: string
  publicKeyHex: string
  signatureHex: string
  signedAt: number
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

function hexToBuffer(hex: string): ArrayBuffer {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "")
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16)
  }
  return bytes.buffer
}

/**
 * Load or generate the persistent ECDSA P-256 cryptographic identity for this node.
 */
export async function getOrCreateCryptoIdentity(): Promise<StoredCryptoIdentity> {
  if (memoryIdentityCache) {
    return memoryIdentityCache
  }
  try {
    if (typeof localStorage !== "undefined") {
      const existingRaw = localStorage.getItem(CRYPTO_KEYPAIR_STORAGE_KEY)
      if (existingRaw) {
        const parsed = JSON.parse(existingRaw) as StoredCryptoIdentity
        if (parsed.publicKeyHex && parsed.privateJwk && parsed.publicJwk) {
          memoryIdentityCache = parsed
          return parsed
        }
      }
    }
  } catch {
    // Regenerate if corrupted
  }

  // Generate a real asymmetric ECDSA P-256 keypair via WebCrypto
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  )

  const spkiBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey)
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey)
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey)

  // Compute SHA-256 hash of the SPKI public key
  const sha256Buffer = await crypto.subtle.digest("SHA-256", spkiBuffer)
  const sha256Hex = bufferToHex(sha256Buffer).toUpperCase()
  const publicKeyHex = bufferToHex(spkiBuffer)

  // Format verifiable fingerprint: e.g. 0x9F8A... (first 16 hex chars of SHA-256)
  const publicKeyFingerprint = `0x${sha256Hex.slice(0, 16)}`
  const nodeId = `LS-NODE-${sha256Hex.slice(0, 8)}`

  const identity: StoredCryptoIdentity = {
    nodeId,
    publicKeyHex,
    publicKeyFingerprint,
    algorithm: "ECDSA-P256-SHA256",
    publicJwk,
    privateJwk,
    createdAt: Date.now(),
  }

  memoryIdentityCache = identity

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CRYPTO_KEYPAIR_STORAGE_KEY, JSON.stringify(identity))
    }
  } catch {
    // Non-fatal in restricted storage environments
  }

  return identity
}

/**
 * Cryptographically sign a canonical string payload using this node's ECDSA P-256 private key.
 */
export async function signNodePayload(payloadText: string): Promise<SignedPayloadEnvelope> {
  const identity = await getOrCreateCryptoIdentity()
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    identity.privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  )

  const signedAt = Date.now()
  const canonical = `${identity.nodeId}:${signedAt}:${payloadText}`
  const encoded = new TextEncoder().encode(canonical)

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privateKey,
    encoded
  )

  return {
    algorithm: "ECDSA-P256-SHA256",
    publicKeyFingerprint: identity.publicKeyFingerprint,
    publicKeyHex: identity.publicKeyHex,
    signatureHex: bufferToHex(signatureBuffer),
    signedAt,
  }
}

/**
 * Cryptographically verify a signed node payload against its SPKI public key.
 */
export async function verifyNodePayload(
  nodeId: string,
  payloadText: string,
  envelope: SignedPayloadEnvelope
): Promise<boolean> {
  try {
    const spkiBuffer = hexToBuffer(envelope.publicKeyHex)
    const publicKey = await crypto.subtle.importKey(
      "spki",
      spkiBuffer,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    )

    const canonical = `${nodeId}:${envelope.signedAt}:${payloadText}`
    const encoded = new TextEncoder().encode(canonical)
    const sigBuffer = hexToBuffer(envelope.signatureHex)

    return await crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      publicKey,
      sigBuffer,
      encoded
    )
  } catch {
    return false
  }
}

/**
 * Resolve real geographic location of this PC using live IP Geolocation APIs.
 */
export interface RealGeoLocation {
  latitude: number
  longitude: number
  city: string
  region: string
  country: string
  isp: string
  ip: string
}

export async function fetchRealMachineLocation(): Promise<RealGeoLocation | null> {
  // Primary: ipwho.is (HTTPS, CORS-enabled, no API key required, returns real city/country/lat/lng/ISP)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch("https://ipwho.is/", { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean
        ip?: string
        city?: string
        region?: string
        country?: string
        latitude?: number
        longitude?: number
        connection?: { isp?: string; org?: string }
      }
      if (
        data.success !== false &&
        typeof data.latitude === "number" &&
        typeof data.longitude === "number"
      ) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || "Unknown City",
          region: data.region || "",
          country: data.country || "Unknown Country",
          isp: data.connection?.isp || data.connection?.org || "Direct Network",
          ip: data.ip || "",
        }
      }
    }
  } catch {
    // Fallback to secondary provider
  }

  // Secondary fallback: ipapi.co/json
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) {
      const data = (await res.json()) as {
        ip?: string
        city?: string
        region?: string
        country_name?: string
        latitude?: number
        longitude?: number
        org?: string
      }
      if (typeof data.latitude === "number" && typeof data.longitude === "number") {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || "Unknown City",
          region: data.region || "",
          country: data.country_name || "Unknown Country",
          isp: data.org || "Direct Network",
          ip: data.ip || "",
        }
      }
    }
  } catch {
    // Offline
  }

  return null
}
