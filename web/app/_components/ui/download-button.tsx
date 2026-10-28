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

const DEFAULT_URLS: Record<"windows" | "mac" | "linux" | "other", string> = {
  windows:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_x64-setup.exe",
  mac: "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_aarch64.dmg",
  linux:
    "https://github.com/Sm-bello/Lifestone-church-ai/releases/download/v1.1.0/Lifestone_1.1.0_amd64.deb",
  other: "https://github.com/Sm-bello/Lifestone-church-ai/releases/latest",
};

const COPY: Record<
  Platform,
  { label: string; icon: TablerIcon }
> = {
  mac: { label: "Download for macOS (v1.1.0)", icon: IconBrandApple },
  windows: { label: "Download for Windows (v1.1.0)", icon: IconBrandWindows },
  linux: { label: "Download for Linux (v1.1.0)", icon: IconDownload },
  mobile: { label: "Works on PC & Mac", icon: IconDeviceLaptop },
  other: { label: "Download Lifestone v1.1.0", icon: IconDownload },
};

export function DownloadButton({
  size = "md",
  className,
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  const platform = usePlatform();
  const activePlatform: Platform = platform ?? "other";
  const copy = COPY[activePlatform] ?? COPY.other;
  const Icon = copy.icon;

  const [downloadUrl, setDownloadUrl] = useState<string>(() => {
    if (activePlatform === "windows") return DEFAULT_URLS.windows;
    if (activePlatform === "mac") return DEFAULT_URLS.mac;
    if (activePlatform === "linux") return DEFAULT_URLS.linux;
    return DEFAULT_URLS.other;
  });

  const [showMobileModal, setShowMobileModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update default URL as soon as platform is resolved on client
  useEffect(() => {
    if (platform === "windows") setDownloadUrl(DEFAULT_URLS.windows);
    else if (platform === "mac") setDownloadUrl(DEFAULT_URLS.mac);
    else if (platform === "linux") setDownloadUrl(DEFAULT_URLS.linux);
  }, [platform]);

  // Dynamically verify latest asset from GitHub Releases API
  useEffect(() => {
    let isCancelled = false;

    async function fetchLatestRelease() {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${SITE.repo.owner}/${SITE.repo.name}/releases/latest`
        );
        if (response.ok && !isCancelled) {
          const data = await response.json();
          const assets = data.assets || [];
          let targetAsset = null;

          if (platform === "windows") {
            targetAsset =
              assets.find((a: any) => a.name.endsWith("setup.exe")) ||
              assets.find((a: any) => a.name.endsWith(".exe"));
          } else if (platform === "mac") {
            targetAsset = assets.find((a: any) => a.name.endsWith(".dmg"));
          } else if (platform === "linux") {
            targetAsset =
              assets.find((a: any) => a.name.endsWith(".deb")) ||
              assets.find((a: any) => a.name.endsWith(".AppImage"));
          }

          if (targetAsset && targetAsset.browser_download_url) {
            setDownloadUrl(targetAsset.browser_download_url);
          }
        }
      } catch {
        // Fallbacks are already hardcoded to v1.1.0 assets
      }
    }

    if (platform && platform !== "mobile") {
      void fetchLatestRelease();
    }

    return () => {
      isCancelled = true;
    };
  }, [platform]);

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

  if (activePlatform === "mobile") {
    return (
      <>
        <Button
          onClick={() => setShowMobileModal(true)}
          variant="primary"
          size={size}
          className={className}
        >
          <Icon size={16} aria-hidden stroke={2} />
          <span suppressHydrationWarning>{copy.label}</span>
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
                  <p className="text-xs text-accent-gold font-medium">Lifestone v1.1.0 • Windows & macOS</p>
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
      variant="primary"
      size={size}
      className={className}
    >
      <Icon size={16} aria-hidden stroke={2} />
      <span suppressHydrationWarning>{copy.label}</span>
    </Button>
  );
}
