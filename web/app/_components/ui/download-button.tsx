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
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import { Button } from "./button";
import { usePlatform, type Platform } from "../../_lib/use-platform";
import { SITE } from "../../_lib/site";

const CURRENT_VERSION = "v1.1.0";

const DEFAULT_URLS: Record<"windows" | "mac" | "linux" | "other", string> = {
  windows:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_x64-setup.exe",
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
}

export function DownloadButton({
  size = "md",
  className,
  label,
  showIcon = true,
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
  const [copied, setCopied] = useState(false);

  // Update default URL whenever platform changes
  useEffect(() => {
    if (activePlatform === "windows") setDownloadUrl(DEFAULT_URLS.windows);
    else if (activePlatform === "mac") setDownloadUrl(DEFAULT_URLS.mac);
    else if (activePlatform === "linux") setDownloadUrl(DEFAULT_URLS.linux);
    else setDownloadUrl(DEFAULT_URLS.other);
  }, [activePlatform]);

  // Dynamically verify latest asset directly from GitHub Releases API
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
          // Windows and desktop fallbacks
          targetAsset =
            assets.find((a: any) => a.name?.endsWith("setup.exe")) ||
            assets.find((a: any) => a.name?.endsWith(".exe"));
        }

        if (targetAsset && targetAsset.browser_download_url) {
          setDownloadUrl(targetAsset.browser_download_url);
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [activePlatform]);

  // Handle ESC key to close mobile dialog
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowMobileModal(false);
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
                    <strong>v1.1.0 Ready:</strong> Sub-second voice control (say &quot;next verse&quot;) and 100% offline Scripture AI.
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
  );
}
