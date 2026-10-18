import { describe, expect, it } from "vitest"
import { compareVersions, normalizeVersion } from "./semver"

describe("semver utility", () => {
  it("normalizes version strings", () => {
    expect(normalizeVersion("v1.0.6")).toBe("1.0.6")
    expect(normalizeVersion("1.0.6")).toBe("1.0.6")
    expect(normalizeVersion("V2.0.0")).toBe("2.0.0")
  })

  it("detects newer version correctly", () => {
    expect(compareVersions("1.0.7", "1.0.6")).toBe(1)
    expect(compareVersions("v1.0.7", "v1.0.6")).toBe(1)
    expect(compareVersions("1.1.0", "1.0.6")).toBe(1)
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1)
    expect(compareVersions("1.0.6.1", "1.0.6")).toBe(1)
  })

  it("detects older version correctly", () => {
    expect(compareVersions("1.0.5", "1.0.6")).toBe(-1)
    expect(compareVersions("v1.0.4", "v1.0.6")).toBe(-1)
    expect(compareVersions("0.9.9", "1.0.0")).toBe(-1)
  })

  it("detects equal versions correctly", () => {
    expect(compareVersions("1.0.6", "1.0.6")).toBe(0)
    expect(compareVersions("v1.0.6", "1.0.6")).toBe(0)
    expect(compareVersions("1.0.6", "v1.0.6")).toBe(0)
  })
})
