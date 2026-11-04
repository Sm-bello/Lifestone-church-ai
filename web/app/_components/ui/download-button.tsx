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

const CURRENT_VERSION = "v1.1.0";

const DEFAULT_URLS: Record<"windows" | "windowsLite" | "mac" | "linux" | "other", string> = {
  windows:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_x64-setup.exe",
  windowsLite:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_Lite_1.1.0_x64-setup.exe",
  mac:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_aarch64.dmg",
  linux:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_amd64.deb",
  other:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_x64-setup.exe",
};

// Singleton promise for GitHub Releases API to avoid redundant network requests across multiple buttons
let releaseDataPromise: Promise<any> | null = null;
function fetchLatestReleaseData() {
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

  const [liteDownloadUrl, setLiteDownloadUrl] = useState<string>(DEFAULT_URLS.windowsLite);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update default URL whenever platform changes
  useEffect(() => {
    if (activePlatform === "windows") {
      setDownloadUrl(DEFAULT_URLS.windows);
      setLiteDownloadUrl(DEFAULT_URLS.windowsLite);
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
        let targetLite = null;

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

          // Lite / Compatibility Windows
          targetLite = assets.find(
            (a: any) =>
              a.name?.toLowerCase().includes("lite") &&
              (a.name?.endsWith(".exe") || a.name?.endsWith(".msi"))
          );
        }

        if (targetAsset?.browser_download_url) {
          setDownloadUrl(targetAsset.browser_download_url);
        }
        if (targetLite?.browser_download_url) {
          setLiteDownloadUrl(targetLite.browser_download_url);
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [activePlatform]);

  // Handle ESC key to close modals
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowMobileModal(false);
        setShowGuideModal(false);
      }
    }
    if (showMobileModal || showGuideModal) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMobileModal, showGuideModal]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText("https://lifestone-church-ai.vercel.app");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
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
    <>
      <div className="flex flex-col items-center gap-2">
        <Button
          href={downloadUrl}
          target="_self"
          download=""
          variant="primary"
          size={size}
          className={className}
        >
          {showIcon && <Icon size={16} aria-hidden stroke={2} />}
          <span suppressHydrationWarning>{text}</span>
        </Button>

        {showCompatibilityNotice && activePlatform === "windows" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>Budget laptop (Pentium / Celeron)?</span>
            <a
              href={liteDownloadUrl}
              target="_self"
              download=""
              className="text-accent-cyan hover:underline font-medium inline-flex items-center gap-1"
            >
              <IconFeather size={13} />
              <span>Download Lite Edition</span>
            </a>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="text-accent-gold hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <IconHelpCircle size={13} />
              <span>Which version do I need?</span>
            </button>
          </div>
        )}
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
                <a
                  href={downloadUrl}
                  target="_self"
                  download=""
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-white/90 transition-colors"
                >
                  <IconDownload size={14} />
                  <span>Download Standard</span>
                </a>
              </div>

              {/* Lite Edition Card */}
              <div className="flex flex-col justify-between rounded-xl border border-accent/40 bg-accent/5 p-4 relative">
                <span className="absolute -top-2.5 right-3 bg-accent text-[10px] font-bold text-background px-2 py-0.5 rounded-full uppercase tracking-wider">
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
                <a
                  href={liteDownloadUrl}
                  target="_self"
                  download=""
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-background hover:bg-accent-cyan transition-colors"
                >
                  <IconDownload size={14} />
                  <span>Download Lite</span>
                </a>
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
              <div className="rounded-lg bg-black/40 p-2.5 font-mono text-[11px] text-foreground/90 border border-border">
                <p>Processor: <span className="text-accent-cyan">Intel(R) Pentium(R) CPU N3530...</span> → <strong className="text-accent">Choose Lite</strong></p>
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
