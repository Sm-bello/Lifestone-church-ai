"use client";

import { useState, useEffect } from "react";

export type Platform = "mac" | "windows" | "linux" | "mobile" | "other";

export function detectPlatform(): Platform {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "windows";
  }

  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string; mobile?: boolean };
  };

  const userAgent = nav.userAgent || "";
  const platformStr = (nav.userAgentData?.platform ?? navigator.platform ?? "").toLowerCase();

  // 1. Mobile check (phones, tablets, iOS, Android, Windows Mobile, etc.)
  const isMobile =
    Boolean(nav.userAgentData?.mobile) ||
    /android|iphone|ipad|ipod|mobile|blackberry|iemobile|kindle|silk|opera mini/i.test(userAgent) ||
    // iPadOS on Safari reports as MacIntel with touch points
    (platformStr.includes("mac") && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1);

  if (isMobile) {
    return "mobile";
  }

  // 2. Desktop OS detection
  const combined = `${platformStr} ${userAgent}`.toLowerCase();
  if (/win/.test(combined)) return "windows";
  if (/mac|darwin/.test(combined)) return "mac";
  if (/linux|x11|cros/.test(combined)) return "linux";

  // Default desktop PC to windows installer
  return "windows";
}

export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("windows");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  return platform;
}
