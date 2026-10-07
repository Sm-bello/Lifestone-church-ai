"use client";

import { useState, useEffect } from "react";
import {
  IconBrandApple,
  IconBrandWindows,
  IconDownload,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import { Button } from "./button";
import { usePlatform } from "../../_lib/use-platform";
import { SITE } from "../../_lib/site";

const COPY: Record<
  "mac" | "windows" | "linux" | "other" | "default",
  { label: string; icon: TablerIcon }
> = {
  mac: { label: "Download for macOS", icon: IconBrandApple },
  windows: { label: "Download for Windows", icon: IconBrandWindows },
  linux: { label: "Download", icon: IconDownload },
  other: { label: "Download", icon: IconDownload },
  default: { label: "Download", icon: IconDownload },
};

export function DownloadButton({
  size = "md",
  className,
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  const platform = usePlatform();
  const copy = COPY[platform ?? "default"];
  const Icon = copy.icon;

  const [downloadUrl, setDownloadUrl] = useState<string>(SITE.repo.releasesLatest);
  
  useEffect(() => {
    async function fetchLatestRelease() {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${SITE.repo.owner}/${SITE.repo.name}/releases/latest`
        );
        if (response.ok) {
          const data = await response.json();
          const assets = data.assets || [];
          let targetAsset = null;

          if (platform === "windows") {
            targetAsset = assets.find((a: any) => a.name.endsWith("setup.exe"));
          } else if (platform === "mac") {
            targetAsset = assets.find((a: any) => a.name.endsWith(".dmg"));
          } else if (platform === "linux") {
            targetAsset = assets.find((a: any) => a.name.endsWith(".deb"));
          }

          if (targetAsset && targetAsset.browser_download_url) {
            setDownloadUrl(targetAsset.browser_download_url);
          }
        }
      } catch (error) {
        console.error("Failed to fetch GitHub release", error);
      }
    }
    fetchLatestRelease();
  }, [platform]);

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
