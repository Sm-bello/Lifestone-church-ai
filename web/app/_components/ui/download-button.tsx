"use client";

import { useState, useEffect } from "react";
import {
  IconBrandApple,
  IconBrandWindows,
  IconDownload,
  IconDeviceLaptop,
  IconCopy,
  IconCheck,
  IconX,
  IconBolt,
  IconFeather,
  IconCpu,
  IconHelpCircle,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import { Button } from "./button";
import { usePlatform, type Platform } from "../../_lib/use-platform";
import { SITE } from "../../_lib/site";
import { cn } from "../../_lib/utils";

export const CURRENT_VERSION = "v1.1.0";

export const DEFAULT_URLS: Record<"windows" | "windowsLite" | "mac" | "linux" | "other", string> = {
  windows:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_x64-setup.exe",
  windowsLite:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone.Lite_1.1.0_x64-setup.exe",
  mac:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_aarch64.dmg",
  linux:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_amd64.deb",
  other:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_x64-setup.exe",
};

// Direct browser download trigger via invisible anchor (pops up native download manager immediately without page navigation)
export function triggerDirectDownload(url: string) {
  if (typeof window === "undefined") return;
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "");
  link.setAttribute("target", "_self");
  link.setAttribute("rel", "noopener noreferrer");
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 150);
}

// Singleton promise for GitHub Releases API to avoid redundant network requests across multiple buttons
let releaseDataPromise: Promise<any> | null = null;
export function fetchLatestReleaseData() {
  if (!releaseDataPromise) {
    releaseDataPromise = fetch(
      `https://api.github.com/repos/${SITE.repo.owner}/${SITE.repo.name}/releases/latest`
    )
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return releaseDataPromise;
}

export interface DownloadButtonProps {
  size?: "md" | "lg";
  className?: string;
  label?: string;
  showIcon?: boolean;
  showCompatibilityNotice?: boolean;
}

export function DownloadButton({
  size = "md",
  className,
  label,
  showIcon = true,
  showCompatibilityNotice = false,
}: DownloadButtonProps) {
  const platform = usePlatform();
  const activePlatform: Platform = platform ?? "windows";

  const [version, setVersion] = useState<string>(CURRENT_VERSION);
  const [downloadUrl, setDownloadUrl] = useState<string>(() => {
    if (activePlatform === "windows") return DEFAULT_URLS.windows;
    if (activePlatform === "mac") return DEFAULT_URLS.mac;
    if (activePlatform === "linux") return DEFAULT_URLS.linux;
    return DEFAULT_URLS.other;
  });

  const [showMobileModal, setShowMobileModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update default URL whenever platform changes
  useEffect(() => {
    if (activePlatform === "windows") {
      setDownloadUrl(DEFAULT_URLS.windows);
    } else if (activePlatform === "mac") {
      setDownloadUrl(DEFAULT_URLS.mac);
    } else if (activePlatform === "linux") {
      setDownloadUrl(DEFAULT_URLS.linux);
    } else {
      setDownloadUrl(DEFAULT_URLS.other);
    }
  }, [activePlatform]);

  // Dynamically verify latest assets directly from GitHub Releases API
  useEffect(() => {
    let isCancelled = false;

    if (activePlatform !== "mobile") {
      fetchLatestReleaseData().then((data) => {
        if (isCancelled || !data) return;

        if (data.tag_name) {
          setVersion(data.tag_name);
        }

        const assets = data.assets || [];
        let targetAsset = null;

        if (activePlatform === "mac") {
          targetAsset = assets.find((a: any) => a.name?.endsWith(".dmg"));
        } else if (activePlatform === "linux") {
          targetAsset =
            assets.find((a: any) => a.name?.endsWith(".deb")) ||
            assets.find((a: any) => a.name?.endsWith(".AppImage"));
        } else {
          // Standard Windows
          targetAsset =
            assets.find(
              (a: any) =>
                !a.name?.toLowerCase().includes("lite") &&
                (a.name?.endsWith("setup.exe") || a.name?.endsWith(".exe"))
            ) ||
            assets.find((a: any) => a.name?.endsWith("setup.exe"));
        }

        if (targetAsset?.browser_download_url) {
          setDownloadUrl(targetAsset.browser_download_url);
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [activePlatform]);

  // Handle ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowMobileModal(false);
      }
    }
    if (showMobileModal) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMobileModal]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText("https://lifestone-church-ai.vercel.app");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleStandardDownloadClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (activePlatform === "mobile") {
      e.preventDefault();
      setShowMobileModal(true);
      return;
    }
    // Allow middle-click, ctrl+click, etc. to work natively
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    setDownloading(true);
    triggerDirectDownload(downloadUrl);
    setTimeout(() => setDownloading(false), 2500);
  };

  const getButtonContent = () => {
    let Icon: TablerIcon = IconDownload;
    let defaultLabel = `Download for Windows (${version})`;

    if (activePlatform === "mac") {
      Icon = IconBrandApple;
      defaultLabel = `Download for macOS (${version})`;
    } else if (activePlatform === "windows") {
      Icon = IconBrandWindows;
      defaultLabel = `Download for Windows (${version})`;
    } else if (activePlatform === "linux") {
      Icon = IconDownload;
      defaultLabel = `Download for Linux (${version})`;
    } else if (activePlatform === "mobile") {
      Icon = IconDeviceLaptop;
      defaultLabel = "Works on PC & Mac";
    }

    return {
      Icon,
      text: label ?? defaultLabel,
    };
  };

  const { Icon, text } = getButtonContent();

  if (activePlatform === "mobile") {
    return (
      <>
        <Button
          onClick={() => setShowMobileModal(true)}
          variant="primary"
          size={size}
          className={className}
        >
          {showIcon && <Icon size={16} aria-hidden stroke={2} />}
          <span suppressHydrationWarning>{text}</span>
        </Button>

        {showMobileModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-modal-title"
            onClick={() => setShowMobileModal(false)}
          >
            <div
              className="relative w-full max-w-sm sm:max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowMobileModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                aria-label="Close dialog"
              >
                <IconX size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                  <IconDeviceLaptop size={22} />
                </div>
                <div>
                  <h3 id="mobile-modal-title" className="text-base font-semibold text-foreground">
                    Desktop Church Software
                  </h3>
                  <p className="text-xs text-accent-gold font-medium">Lifestone {version} • Windows & macOS</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                Lifestone is presentation software designed for <strong>desktop computers (Windows & Mac)</strong> to control church projectors, HDMI screens, and live streams with offline speech AI.
              </p>

              <div className="rounded-xl border border-border bg-surface-strong/70 p-3.5 mb-5 text-xs text-foreground/90 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-accent-cyan text-base">💻</span>
                  <span>
                    <strong>Use your PC:</strong> Please open this website on your Windows or Mac PC to download your version.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 text-base">⚡</span>
                  <span>
                    <strong>Two Editions Ready:</strong> Standard (for Core i3/i5/i7 & Ryzen) and Lite (for Intel Pentium & Celeron budget PCs).
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-white/90 transition-colors cursor-pointer"
                >
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  <span>{copied ? "Link Copied!" : "Copy Website Link"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMobileModal(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <Button
        href={downloadUrl}
        target="_self"
        download=""
        variant="primary"
        size={size}
        className={className}
        onClick={handleStandardDownloadClick}
      >
        {downloading ? (
          <>
            <IconCheck size={16} className="animate-in zoom-in" stroke={2.5} />
            <span>Starting download...</span>
          </>
        ) : (
          <>
            {showIcon && <Icon size={16} aria-hidden stroke={2} />}
            <span suppressHydrationWarning>{text}</span>
          </>
        )}
      </Button>

      {showCompatibilityNotice && activePlatform === "windows" && (
        <WindowsCompatibilityNotice />
      )}
    </div>
  );
}

// Dedicated, bursting Windows Compatibility Hub & Lite Download Component
export function WindowsCompatibilityNotice({ className }: { className?: string }) {
  const platform = usePlatform();
  const activePlatform: Platform = platform ?? "windows";

  const [version, setVersion] = useState<string>(CURRENT_VERSION);
  const [liteUrl, setLiteUrl] = useState<string>(DEFAULT_URLS.windowsLite);
  const [standardUrl, setStandardUrl] = useState<string>(DEFAULT_URLS.windows);
  const [downloadingLite, setDownloadingLite] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    fetchLatestReleaseData().then((data) => {
      if (isCancelled || !data) return;

      if (data.tag_name) {
        setVersion(data.tag_name);
      }

      const assets = data.assets || [];
      const targetLite = assets.find(
        (a: any) =>
          a.name?.toLowerCase().includes("lite") &&
          (a.name?.endsWith(".exe") || a.name?.endsWith(".msi"))
      );
      const targetStandard = assets.find(
        (a: any) =>
          !a.name?.toLowerCase().includes("lite") &&
          (a.name?.endsWith("setup.exe") || a.name?.endsWith(".exe"))
      );

      if (targetLite?.browser_download_url) {
        setLiteUrl(targetLite.browser_download_url);
      }
      if (targetStandard?.browser_download_url) {
        setStandardUrl(targetStandard.browser_download_url);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowGuideModal(false);
      }
    }
    if (showGuideModal) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showGuideModal]);

  const handleLiteDownloadClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setDownloadingLite(true);
    triggerDirectDownload(liteUrl);
    setTimeout(() => setDownloadingLite(false), 2500);
  };

  if (activePlatform === "mobile") return null;

  return (
    <>
      <div
        className={cn(
          "relative w-full max-w-2xl mx-auto rounded-2xl border border-white/10 bg-gradient-to-r from-accent/10 via-surface-strong/60 to-accent-cyan/10 backdrop-blur-xl p-3 sm:px-5 sm:py-3.5 shadow-xl shadow-cyan-950/20 transition-all duration-300 hover:border-accent-cyan/40 hover:shadow-cyan-950/40 text-left",
          className
        )}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Left: Info & Processor Tag */}
          <div className="flex items-center gap-3 text-left w-full sm:w-auto">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan shadow-sm shadow-accent-cyan/20">
              <IconFeather size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">
                  Budget laptop?
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-cyan/15 border border-accent-cyan/30 px-2 py-0.5 text-[10px] font-bold text-accent-cyan uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan animate-pulse" />
                  Pentium / Celeron
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Lightweight SSE4 build • Safe graphics mode • Zero lag
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleLiteDownloadClick}
              className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-cyan via-sky-500 to-blue-600 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              aria-label="Download Lifestone Lite Edition for Windows"
            >
              {downloadingLite ? (
                <>
                  <IconCheck size={16} className="text-white animate-in zoom-in" stroke={2.5} />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <IconDownload size={15} className="text-white group-hover:-translate-y-0.5 transition-transform" />
                  <span>Download Lite</span>
                  <span className="hidden xs:inline-block rounded bg-black/25 px-1.5 py-0.2 text-[10px] font-mono text-white/90">
                    {version}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 hover:border-accent-gold/40 bg-white/5 hover:bg-accent-gold/10 px-3 py-2 text-xs sm:text-sm font-medium text-accent-gold transition-all duration-200 cursor-pointer"
              aria-label="Which Lifestone version do I need?"
            >
              <IconHelpCircle size={15} />
              <span className="hidden sm:inline">Which version?</span>
              <span className="sm:hidden">Help</span>
            </button>
          </div>
        </div>
      </div>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-modal-title"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="relative w-full max-w-xl rounded-2xl border border-border-strong bg-surface p-6 sm:p-8 shadow-2xl text-left overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              aria-label="Close dialog"
            >
              <IconX size={20} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                <IconCpu size={22} />
              </div>
              <div>
                <h3 id="guide-modal-title" className="text-lg font-semibold text-foreground">
                  Choosing the Right Lifestone Edition
                </h3>
                <p className="text-xs text-accent-gold font-medium">Both versions include all 31,102 verses & are 100% offline</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              To guarantee that Lifestone starts instantly and runs smoothly without lag on every church computer, we provide two specialized Windows builds:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Standard Edition Card */}
              <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-strong/60 p-4 relative">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <IconBolt size={18} />
                    <span className="font-semibold text-sm">Standard Edition</span>
                  </div>
                  <p className="text-xs font-medium text-foreground mb-2">
                    For Modern Core & Ryzen PCs
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1.5 mb-4">
                    <li>• Intel Core i3 / i5 / i7 / i9 (4th gen+)</li>
                    <li>• AMD Ryzen (all series)</li>
                    <li>• Dual Whisper AI (Base + Tiny)</li>
                    <li>• AVX2 vector acceleration</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerDirectDownload(standardUrl);
                    setShowGuideModal(false);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-white/90 transition-colors cursor-pointer"
                >
                  <IconDownload size={14} />
                  <span>Download Standard</span>
                </button>
              </div>

              {/* Lite Edition Card */}
              <div className="flex flex-col justify-between rounded-xl border border-accent-cyan/40 bg-accent-cyan/5 p-4 relative">
                <span className="absolute -top-2.5 right-3 bg-accent-cyan text-[10px] font-bold text-background px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Universal Safe
                </span>
                <div>
                  <div className="flex items-center gap-2 mb-2 text-accent-cyan">
                    <IconFeather size={18} />
                    <span className="font-semibold text-sm">Lite / Compatibility</span>
                  </div>
                  <p className="text-xs font-medium text-foreground mb-2">
                    For Budget & Older Laptops
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1.5 mb-4">
                    <li>• Intel Pentium (N3530, Gold, Silver)</li>
                    <li>• Intel Celeron, Atom, Core 2 Duo</li>
                    <li>• Pure SSE4 build (No AVX crashes)</li>
                    <li>• Safe GPU mode, &lt; 150 MB RAM</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerDirectDownload(liteUrl);
                    setShowGuideModal(false);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-cyan to-blue-600 px-3 py-2 text-xs font-semibold text-white hover:brightness-110 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  <IconDownload size={14} />
                  <span>Download Lite</span>
                </button>
              </div>
            </div>

            {/* How to check section */}
            <div className="rounded-xl border border-border bg-surface-strong/70 p-4 text-xs space-y-2 mb-6">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <span>🔍</span>
                <span>How to check your PC in 10 seconds:</span>
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Open Windows <strong>Settings</strong> (or press <strong>Win + I</strong>) → <strong>System</strong> → <strong>About</strong>. Look at your <strong>Processor</strong> line:
              </p>
              <div className="rounded-lg bg-black/40 p-2.5 font-mono text-[11px] text-foreground/90 border border-border space-y-1">
                <p>Processor: <span className="text-accent-cyan">Intel(R) Pentium(R) CPU N3530...</span> → <strong className="text-accent-cyan">Choose Lite</strong></p>
                <p>Processor: <span className="text-primary">Intel(R) Core(TM) i5-1135G7...</span> → <strong className="text-primary">Choose Standard</strong></p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="rounded-xl border border-border-strong px-5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
