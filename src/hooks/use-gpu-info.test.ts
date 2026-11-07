import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { detectGpuSpecs } from "./use-gpu-info"

describe("detectGpuSpecs", () => {
  const originalDocument = globalThis.document

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.document = originalDocument
  })

  it("detects dedicated NVIDIA GPU correctly", () => {
    const mockGetExtension = vi.fn().mockReturnValue({
      UNMASKED_RENDERER_WEBGL: 0x9246,
      UNMASKED_VENDOR_WEBGL: 0x9245,
    })
    const mockGetParameter = vi.fn((param: number) => {
      if (param === 0x9246) return "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11, D3D11)"
      if (param === 0x9245) return "Google Inc. (NVIDIA)"
      return ""
    })

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue({
        getExtension: mockGetExtension,
        getParameter: mockGetParameter,
      }),
    }

    globalThis.document = {
      createElement: vi.fn().mockReturnValue(mockCanvas),
    } as unknown as Document

    const info = detectGpuSpecs()
    expect(info.hasGpu).toBe(true)
    expect(info.isDedicated).toBe(true)
    expect(info.performanceTier).toBe("ultra")
    expect(info.gpuName).toContain("GeForce RTX 3060")
  })

  it("flags budget Intel Pentium N3530 / software rasterizer as CPU mode", () => {
    const mockGetExtension = vi.fn().mockReturnValue({
      UNMASKED_RENDERER_WEBGL: 0x9246,
      UNMASKED_VENDOR_WEBGL: 0x9245,
    })
    const mockGetParameter = vi.fn((param: number) => {
      if (param === 0x9246) return "Intel(R) HD Graphics (Pentium N3530 Bay Trail)"
      if (param === 0x9245) return "Intel"
      return ""
    })

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue({
        getExtension: mockGetExtension,
        getParameter: mockGetParameter,
      }),
    }

    globalThis.document = {
      createElement: vi.fn().mockReturnValue(mockCanvas),
    } as unknown as Document

    const info = detectGpuSpecs()
    expect(info.hasGpu).toBe(false)
    expect(info.isDedicated).toBe(false)
    expect(info.performanceTier).toBe("budget-cpu")
    expect(info.latencyHint).toContain("CPU Optimized")
  })
})
