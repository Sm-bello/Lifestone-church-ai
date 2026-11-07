import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

export interface GpuInfo {
  hasGpu: boolean
  isDedicated: boolean
  gpuName: string
  rawRenderer: string
  vendor: string
  performanceTier: "ultra" | "high" | "budget-cpu"
  latencyHint: string
}

function cleanGpuName(raw: string, vendor: string): string {
  if (!raw) return "Standard Display Adapter"

  // Angle format: ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)
  const angleMatch = raw.match(/ANGLE \([^,]+,\s*([^,]+)/i)
  if (angleMatch && angleMatch[1]) {
    return angleMatch[1].trim()
  }

  // Direct3D or OpenGL strings
  if (raw.includes("GeForce") || raw.includes("Radeon") || raw.includes("Intel") || raw.includes("Apple")) {
    return raw
      .replace(/Direct3D\d+.*$/i, "")
      .replace(/vs_\d+_\d+.*$/i, "")
      .replace(/OpenGL.*$/i, "")
      .trim()
  }

  return raw.length > 40 ? `${raw.slice(0, 37)}...` : raw || vendor || "Display Adapter"
}

export function detectGpuSpecs(): GpuInfo {
  try {
    const canvas = document.createElement("canvas")
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null

    if (!gl) {
      return {
        hasGpu: false,
        isDedicated: false,
        gpuName: "Integrated CPU Rasterizer",
        rawRenderer: "No WebGL context",
        vendor: "Generic",
        performanceTier: "budget-cpu",
        latencyHint: "~1.5s - 2.5s (CPU mode)",
      }
    }

    const debugExt = gl.getExtension("WEBGL_debug_renderer_info")
    const rawRenderer = debugExt
      ? gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) || ""
      : gl.getParameter(gl.RENDERER) || ""
    const vendor = debugExt
      ? gl.getParameter(debugExt.UNMASKED_VENDOR_WEBGL) || ""
      : gl.getParameter(gl.VENDOR) || ""

    const rLower = (rawRenderer || "").toLowerCase()
    const vLower = (vendor || "").toLowerCase()

    // Dedicated GPUs: NVIDIA, AMD Radeon, Apple Silicon, Intel Arc / Iris Xe Max
    const isDedicated =
      rLower.includes("nvidia") ||
      rLower.includes("geforce") ||
      rLower.includes("rtx") ||
      rLower.includes("gtx") ||
      rLower.includes("quadro") ||
      rLower.includes("radeon") ||
      rLower.includes("rx ") ||
      rLower.includes("arc ") ||
      rLower.includes("apple m") ||
      vLower.includes("nvidia") ||
      vLower.includes("amd") ||
      vLower.includes("advanced micro devices")

    // Software/Fallback / CPU renderers:
    const isSoftware =
      rLower.includes("basic render driver") ||
      rLower.includes("swiftshader") ||
      rLower.includes("llvmpipe") ||
      rLower.includes("software rasterizer") ||
      rLower.includes("gdi generic") ||
      rLower.includes("subzero")

    // Budget integrated Intel graphics (e.g. Pentium N3530, Celeron, Atom, older HD Graphics):
    const isBudgetIntegrated =
      (rLower.includes("intel") &&
        (rLower.includes("pentium") ||
          rLower.includes("celeron") ||
          rLower.includes("atom") ||
          rLower.includes("hd graphics") ||
          rLower.includes("uhd graphics 600") ||
          rLower.includes("uhd graphics 605"))) ||
      isSoftware

    // hasGpu is true if we have a dedicated GPU or high-speed modern accelerated graphics
    const hasGpu = isDedicated || (!isSoftware && !isBudgetIntegrated)
    const gpuName = cleanGpuName(rawRenderer, vendor)

    const performanceTier: "ultra" | "high" | "budget-cpu" = isDedicated
      ? rLower.includes("rtx") || rLower.includes("rx 6") || rLower.includes("rx 7") || rLower.includes("apple m")
        ? "ultra"
        : "high"
      : hasGpu
      ? "high"
      : "budget-cpu"

    const latencyHint =
      performanceTier === "ultra"
        ? "< 250ms (Ultra Fast)"
        : performanceTier === "high"
        ? "~400ms - 700ms (High Speed)"
        : "~1.2s - 2.5s (CPU Optimized)"

    return {
      hasGpu,
      isDedicated,
      gpuName,
      rawRenderer,
      vendor,
      performanceTier,
      latencyHint,
    }
  } catch {
    return {
      hasGpu: false,
      isDedicated: false,
      gpuName: "Standard CPU Mode",
      rawRenderer: "Detection error fallback",
      vendor: "Generic",
      performanceTier: "budget-cpu",
      latencyHint: "~1.5s - 2.5s (CPU mode)",
    }
  }
}

export function useGpuInfo() {
  const [gpuInfo, setGpuInfo] = useState<GpuInfo>(() => detectGpuSpecs())

  useEffect(() => {
    const specs = detectGpuSpecs()
    setGpuInfo(specs)
  }, [])

  const triggerGpuStartupToast = useCallback(
    (force = false) => {
      try {
        const key = "lifestone_gpu_notification_shown_session"
        if (!force && sessionStorage.getItem(key)) {
          return
        }
        sessionStorage.setItem(key, "true")
      } catch {
        // non-fatal
      }

      if (gpuInfo.hasGpu) {
        toast("⚡ yay! there GPU lets fly", {
          description: `${gpuInfo.gpuName} detected. Real-time AI voice recognition and Scripture detection running at maximum performance!`,
          duration: 6500,
        })
      } else {
        toast("💡 i notice there is no GPU here, well the ai voice recognition will still work but expect it to have some delay", {
          description: `Active adapter: ${gpuInfo.gpuName}. Lifestone is running in CPU-optimized mode with a slight buffer for sermon transcription.`,
          duration: 8500,
        })
      }
    },
    [gpuInfo]
  )

  return {
    ...gpuInfo,
    triggerGpuStartupToast,
  }
}
