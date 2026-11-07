import { describe, it, expect } from "vitest"
import {
  getOrCreateCryptoIdentity,
  signNodePayload,
  verifyNodePayload,
} from "./crypto-node"

describe("ECDSA-P256-SHA256 Cryptographic Light-Node Engine", () => {
  it("generates a real ECDSA P-256 keypair, signs a payload, and verifies the cryptographic signature", async () => {
    const identity = await getOrCreateCryptoIdentity()
    expect(identity.algorithm).toBe("ECDSA-P256-SHA256")
    expect(identity.nodeId).toMatch(/^LS-NODE-[0-9A-F]{8}$/)
    expect(identity.publicKeyFingerprint).toMatch(/^0x[0-9A-F]{16}$/)
    expect(identity.publicKeyHex.length).toBeGreaterThan(64)

    const payload = "BEACON:Grace Tabernacle:Presenting John 3:16"
    const envelope = await signNodePayload(payload)

    expect(envelope.algorithm).toBe("ECDSA-P256-SHA256")
    expect(envelope.signatureHex.length).toBe(128) // 64-byte P-256 signature = 128 hex chars

    const isValid = await verifyNodePayload(identity.nodeId, payload, envelope)
    expect(isValid).toBe(true)

    // Verify tamper detection: changing a single character invalidates the ECDSA signature
    const isTamperedValid = await verifyNodePayload(
      identity.nodeId,
      "BEACON:Grace Tabernacle:Presenting John 3:17",
      envelope
    )
    expect(isTamperedValid).toBe(false)
  })
})
