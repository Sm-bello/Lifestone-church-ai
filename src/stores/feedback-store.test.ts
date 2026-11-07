import { describe, it, expect, beforeEach } from "vitest"
import { generateDigitalSignature, useFeedbackStore } from "./feedback-store"

describe("feedback store & digital signature", () => {
  beforeEach(() => {
    useFeedbackStore.setState({
      isDialogOpen: false,
      unreadCount: 0,
    })
  })

  it("generates deterministic digital signature from email, church name, and nodeId", () => {
    const sig1 = generateDigitalSignature("pastor@gracechurch.org", "Grace Assembly", "LS-NODE-1234")
    const sig2 = generateDigitalSignature("pastor@gracechurch.org", "Grace Assembly", "LS-NODE-1234")
    expect(sig1).toBe(sig2)
    expect(sig1).toMatch(/^LS-SIG-[A-F0-9]{4}-GRACEA$/)
  })

  it("signs in user with Gmail and assigns verified church signature", () => {
    useFeedbackStore.getState().signInWithGmail({
      email: "media@bethel.com",
      displayName: "Brother John",
      churchName: "Bethel Tabernacle",
      churchAddress: "124 Worship Way, Lagos",
      city: "Lagos",
      country: "Nigeria",
    })

    const { profile } = useFeedbackStore.getState()
    expect(profile.isAuthenticated).toBe(true)
    expect(profile.email).toBe("media@bethel.com")
    expect(profile.churchName).toBe("Bethel Tabernacle")
    expect(profile.signature).toContain("-BETHEL")
  })
})
