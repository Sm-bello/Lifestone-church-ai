"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Radio,
  ShieldCheck,
  Send,
  Sparkles,
  Cpu,
  Monitor,
  MapPin,
  RefreshCw,
  Globe,
  MessageSquare,
  Zap,
  Building2,
  ExternalLink,
  CheckCircle2,
  ArrowLeft,
  Megaphone,
} from "lucide-react";
import type { BeaconNode, FeedbackMessage } from "../_lib/command-store";

interface ThreadItem {
  nodeId: string;
  node: BeaconNode | null;
  messages: FeedbackMessage[];
  lastUpdatedAt: number;
}

const LOCAL_THREADS_STORAGE_KEY = "lifestone_command_center_threads_v1";

/** Convert lat/lng to SVG x/y on a 1000x500 Equirectangular map */
function latLngToSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return {
    x: Math.max(20, Math.min(980, x)),
    y: Math.max(20, Math.min(480, y)),
  };
}

export default function CommandCenterPage() {
  const [nodes, setNodes] = useState<BeaconNode[]>([]);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isUpdateNotice, setIsUpdateNotice] = useState(false);
  const [releaseVersion, setReleaseVersion] = useState("1.1.0");
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"world" | "building">("world");
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const fetchCommandData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [beaconRes, feedbackRes] = await Promise.all([
        fetch("/api/beacon"),
        fetch("/api/feedback"),
      ]);

      if (beaconRes.ok) {
        const bData = (await beaconRes.json()) as { nodes: BeaconNode[] };
        setNodes(bData.nodes || []);
        if (!selectedNodeId && bData.nodes && bData.nodes.length > 0) {
          setSelectedNodeId(bData.nodes[0].nodeId);
        }
      }

      if (feedbackRes.ok) {
        const fData = (await feedbackRes.json()) as { threads: ThreadItem[] };
        let mergedThreads = fData.threads || [];

        // Merge with locally persisted developer dispatches
        try {
          const savedRaw = localStorage.getItem(LOCAL_THREADS_STORAGE_KEY);
          if (savedRaw) {
            const savedThreads = JSON.parse(savedRaw) as ThreadItem[];
            if (Array.isArray(savedThreads) && savedThreads.length > 0) {
              mergedThreads = savedThreads;
            }
          }
        } catch {
          // ignore
        }

        setThreads(mergedThreads);
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedNodeId]);

  useEffect(() => {
    void fetchCommandData();
  }, [fetchCommandData]);

  const selectedNode =
    nodes.find((n) => n.nodeId === selectedNodeId) || nodes[0] || null;

  const selectedThread = threads.find(
    (t) => t.nodeId === (selectedNode?.nodeId || selectedNodeId)
  );
  const currentMessages = selectedThread?.messages || [];

  const saveThreadsLocally = (nextThreads: ThreadItem[]) => {
    setThreads(nextThreads);
    try {
      localStorage.setItem(LOCAL_THREADS_STORAGE_KEY, JSON.stringify(nextThreads));
    } catch {
      // ignore
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode || !replyText.trim() || isSending) return;
    setIsSending(true);
    try {
      const newMsg: FeedbackMessage = {
        id: `dev-reply-${Date.now()}`,
        nodeId: selectedNode.nodeId,
        signature: selectedNode.signature,
        sender: "developer",
        senderName: "Lifestone Command Center",
        text: replyText.trim(),
        category: isUpdateNotice ? "update-notice" : "question",
        isUpdateNotice: Boolean(isUpdateNotice),
        releaseVersion: releaseVersion || "1.1.0",
        timestamp: Date.now(),
      };

      const existingIdx = threads.findIndex(
        (t) => t.nodeId === selectedNode.nodeId
      );
      let nextThreads: ThreadItem[];
      if (existingIdx >= 0) {
        nextThreads = threads.map((t, idx) =>
          idx === existingIdx
            ? {
                ...t,
                messages: [...t.messages, newMsg],
                lastUpdatedAt: Date.now(),
              }
            : t
        );
      } else {
        nextThreads = [
          {
            nodeId: selectedNode.nodeId,
            node: selectedNode,
            messages: [newMsg],
            lastUpdatedAt: Date.now(),
          },
          ...threads,
        ];
      }

      saveThreadsLocally(nextThreads);
      setReplyText("");
      setStatusBanner(
        isUpdateNotice
          ? `Signed release notice dispatched to ${selectedNode.churchName} (${selectedNode.signature})!`
          : `Reply sent directly to ${selectedNode.churchName} (${selectedNode.signature})!`
      );
      setTimeout(() => setStatusBanner(null), 5000);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickSignedTemplate = () => {
    if (!selectedNode) return;
    setIsUpdateNotice(true);
    setReplyText(
      `Hello ${selectedNode.churchName} (${selectedNode.signature})! We received your feedback and have built, certified, and signed the latest Lifestone v${releaseVersion} update specifically addressing your sanctuary setup. Please tap "Update Now" in your chat box to install!`
    );
  };

  const handleBroadcastAll = async () => {
    if (!replyText.trim() || isSending) return;
    setIsSending(true);
    try {
      const now = Date.now();
      const nextThreads: ThreadItem[] = nodes.map((node) => {
        const existing = threads.find((t) => t.nodeId === node.nodeId);
        const broadcastMsg: FeedbackMessage = {
          id: `dev-broadcast-${now}-${node.nodeId}`,
          nodeId: node.nodeId,
          signature: node.signature,
          sender: "developer",
          senderName: "Lifestone Command Center (Global Broadcast)",
          text: replyText.trim(),
          category: "update-notice",
          isUpdateNotice: true,
          releaseVersion: releaseVersion || "1.1.0",
          timestamp: now,
        };
        return {
          nodeId: node.nodeId,
          node,
          messages: [...(existing?.messages || []), broadcastMsg],
          lastUpdatedAt: now,
        };
      });

      saveThreadsLocally(nextThreads);
      setReplyText("");
      setStatusBanner(
        `Global update broadcast pushed to all ${nodes.length} active church light-nodes!`
      );
      setTimeout(() => setStatusBanner(null), 5000);
    } finally {
      setIsSending(false);
    }
  };

  const gpuNodesCount = nodes.filter((n) => n.hasGpu).length;
  const liveNodesCount = nodes.filter((n) => n.status === "live").length;

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100">
      {/* ── Top Command Bar ── */}
      <header className="sticky top-0 z-30 border-b border-cyan-500/20 bg-[#050811]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-500/40 hover:text-white"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Website</span>
            </Link>

            <div className="flex items-center gap-2.5">
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
              </span>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                  LIFESTONE COMMAND CENTER
                </h1>
                <p className="text-[11px] text-cyan-400/80">
                  Global Light-Node Beacon Telemetry • Sanctuary Building Zoom • Direct Developer Dispatch
                </p>
              </div>
            </div>
          </div>

          {/* Live Telemetry Counters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-1.5">
              <Radio className="size-3.5 text-emerald-400 animate-pulse" />
              <div className="text-xs">
                <span className="font-bold text-emerald-300">{nodes.length}</span>{" "}
                <span className="text-slate-400">Active Light Nodes</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-950/20 px-3 py-1.5">
              <Monitor className="size-3.5 text-cyan-400" />
              <div className="text-xs">
                <span className="font-bold text-cyan-300">{liveNodesCount}</span>{" "}
                <span className="text-slate-400">Projecting Live</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-purple-500/25 bg-purple-950/20 px-3 py-1.5">
              <Zap className="size-3.5 text-purple-400" />
              <div className="text-xs">
                <span className="font-bold text-purple-300">{gpuNodesCount}</span>{" "}
                <span className="text-slate-400">GPU / </span>
                <span className="font-bold text-amber-300">
                  {nodes.length - gpuNodesCount}
                </span>{" "}
                <span className="text-slate-400">CPU Lite</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void fetchCommandData()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:text-white"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`}
              />
              <span>Sync Beacons</span>
            </button>
          </div>
        </div>
      </header>

      {statusBanner && (
        <div className="border-b border-emerald-500/30 bg-emerald-950/40 px-6 py-2.5 text-center text-xs font-medium text-emerald-300">
          <CheckCircle2 className="mr-1.5 inline size-4" />
          {statusBanner}
        </div>
      )}

      {/* ── Main Mission Control Grid ── */}
      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 p-6 lg:grid-cols-12">
        {/* Left/Center 7 Cols: Global Beacon Map + Narrowing Sanctuary Building View */}
        <div className="space-y-6 lg:col-span-7">
          {/* Map Card */}
          <div className="overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#090e1c] shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">
                  {viewMode === "world"
                    ? "Global Church Light-Node Beacon Radar"
                    : `Sanctuary Building Narrowing View — ${selectedNode?.churchName}`}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode("world")}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    viewMode === "world"
                      ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                      : "bg-slate-800/60 text-slate-400 hover:text-white"
                  }`}
                >
                  🌍 World Radar
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("building")}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    viewMode === "building"
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                      : "bg-slate-800/60 text-slate-400 hover:text-white"
                  }`}
                >
                  🏛️ Narrow to Church Building
                </button>
              </div>
            </div>

            {viewMode === "world" ? (
              <div className="relative aspect-[2/1] w-full bg-[#060b16] p-2">
                <svg
                  viewBox="0 0 1000 500"
                  className="h-full w-full"
                  aria-label="Global Lifestone Beacons Map"
                >
                  <defs>
                    <pattern
                      id="radar-grid"
                      width="50"
                      height="50"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 50 0 L 0 0 0 50"
                        fill="none"
                        stroke="rgba(34, 211, 238, 0.07)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>

                  {/* Radar Coordinate Grid */}
                  <rect width="1000" height="500" fill="url(#radar-grid)" />

                  {/* Equator & Prime Meridian lines */}
                  <line
                    x1="0"
                    y1="250"
                    x2="1000"
                    y2="250"
                    stroke="rgba(34, 211, 238, 0.15)"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="500"
                    y1="0"
                    x2="500"
                    y2="500"
                    stroke="rgba(34, 211, 238, 0.15)"
                    strokeDasharray="4 4"
                  />

                  {/* Stylized Continental Silhouettes */}
                  <g fill="rgba(30, 41, 59, 0.65)" stroke="rgba(56, 189, 248, 0.22)" strokeWidth="1.2">
                    {/* North America */}
                    <path d="M 110,70 L 260,65 L 310,140 L 250,215 L 185,230 L 135,165 Z" />
                    {/* South America */}
                    <path d="M 245,250 L 335,275 L 350,360 L 295,455 L 260,395 Z" />
                    {/* Europe */}
                    <path d="M 455,75 L 575,65 L 595,145 L 470,160 Z" />
                    {/* Africa */}
                    <path d="M 455,180 L 585,185 L 615,285 L 560,405 L 495,380 L 450,260 Z" />
                    {/* Asia */}
                    <path d="M 595,65 L 865,75 L 895,215 L 775,265 L 620,210 Z" />
                    {/* Australia */}
                    <path d="M 765,335 L 885,330 L 895,415 L 780,420 Z" />
                  </g>

                  {/* Active Church Light-Node Beacons */}
                  {nodes.map((node) => {
                    const { x, y } = latLngToSvg(node.latitude, node.longitude);
                    const isSelected = selectedNode?.nodeId === node.nodeId;
                    const color =
                      node.status === "live"
                        ? "#10b981"
                        : node.status === "transcribing"
                        ? "#06b6d4"
                        : "#f59e0b";

                    return (
                      <g
                        key={node.nodeId}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedNodeId(node.nodeId);
                        }}
                      >
                        {/* Outer Radar Pulse */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isSelected ? 24 : 15}
                          fill={color}
                          opacity={isSelected ? 0.28 : 0.16}
                        >
                          <animate
                            attributeName="r"
                            from="8"
                            to={isSelected ? "28" : "20"}
                            dur="2.2s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            from="0.5"
                            to="0"
                            dur="2.2s"
                            repeatCount="indefinite"
                          />
                        </circle>

                        {/* Core Pin */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isSelected ? 7 : 5}
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />

                        {/* Label tag */}
                        <g transform={`translate(${x + 10}, ${y - 8})`}>
                          <rect
                            rx="4"
                            ry="4"
                            width={Math.min(185, node.churchName.length * 6.2 + 24)}
                            height="20"
                            fill="rgba(5, 8, 17, 0.88)"
                            stroke={isSelected ? "#22d3ee" : "rgba(148, 163, 184, 0.3)"}
                            strokeWidth="1"
                          />
                          <text
                            x="7"
                            y="13.5"
                            fill={isSelected ? "#67e8f9" : "#e2e8f0"}
                            fontSize="9.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {node.churchName.slice(0, 24)}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>

                {/* Legend Overlay */}
                <div className="absolute bottom-3 left-4 flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-[#050811]/90 px-3 py-1.5 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-emerald-500" />
                    Live Projecting
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-cyan-400" />
                    AI Voice Transcribing
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    Standby Light-Node
                  </span>
                </div>
              </div>
            ) : (
              /* ── Narrowed Sanctuary Building Street/Map View ── */
              selectedNode && (
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/15 px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="size-5 text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-white">
                          {selectedNode.churchName} — Sanctuary Building View
                        </div>
                        <div className="text-[11px] text-slate-300">
                          📍 {selectedNode.churchAddress} ({selectedNode.latitude.toFixed(4)},{" "}
                          {selectedNode.longitude.toFixed(4)})
                        </div>
                      </div>
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${selectedNode.churchName} ${selectedNode.churchAddress}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      <span>Open 3D Satellite Building View</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>

                  <div className="h-[340px] w-full overflow-hidden rounded-xl border border-slate-800">
                    <iframe
                      title={`Sanctuary Location - ${selectedNode.churchName}`}
                      width="100%"
                      height="100%"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                        selectedNode.longitude - 0.012
                      }%2C${selectedNode.latitude - 0.008}%2C${
                        selectedNode.longitude + 0.012
                      }%2C${
                        selectedNode.latitude + 0.008
                      }&layer=mapnik&marker=${selectedNode.latitude}%2C${
                        selectedNode.longitude
                      }`}
                      className="border-0"
                    />
                  </div>
                </div>
              )
            )}
          </div>

          {/* ── Active Church Light-Nodes Directory Table ── */}
          <div className="rounded-2xl border border-slate-800 bg-[#090e1c] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Active Sanctuary Light-Nodes ({nodes.length})
              </h2>
              <span className="text-xs text-slate-400">
                Click any sanctuary node to narrow onto their building & open their chat box
              </span>
            </div>

            <div className="space-y-2.5">
              {nodes.map((node) => {
                const isSelected = selectedNode?.nodeId === node.nodeId;
                return (
                  <div
                    key={node.nodeId}
                    onClick={() => setSelectedNodeId(node.nodeId)}
                    className={`flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/25"
                        : "border-slate-800/90 bg-slate-900/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 size-2.5 rounded-full ${
                          node.status === "live"
                            ? "bg-emerald-400 shadow-[0_0_8px_#10b981]"
                            : node.status === "transcribing"
                            ? "bg-cyan-400 shadow-[0_0_8px_#06b6d4]"
                            : "bg-amber-400"
                        }`}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {node.churchName}
                          </span>
                          <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                            {node.signature}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3 text-emerald-400" />
                            {node.churchAddress || `${node.city}, ${node.country}`}
                          </span>
                          <span>•</span>
                          <span>{node.displayName}</span>
                          {node.email && (
                            <>
                              <span>•</span>
                              <span className="text-slate-300">{node.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                        {node.activeItem}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span
                          className={
                            node.hasGpu ? "text-emerald-400" : "text-amber-400"
                          }
                        >
                          {node.hasGpu ? "⚡ GPU" : "🐢 CPU Lite"}: {node.gpuName}
                        </span>
                        <span>•</span>
                        <span>{node.screenCount} screens</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Selected Sanctuary Node Inspector + Direct Developer Chat & Release Signer */}
        <div className="space-y-6 lg:col-span-5">
          {selectedNode && (
            <div className="rounded-2xl border border-cyan-500/30 bg-[#090e1c] p-5 shadow-xl">
              {/* Node Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-cyan-400" />
                    <h2 className="text-base font-bold text-white">
                      {selectedNode.churchName}
                    </h2>
                  </div>
                  <p className="mt-1 font-mono text-xs text-cyan-300">
                    Digital Signature: {selectedNode.signature} • Node: {selectedNode.nodeId}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setViewMode(viewMode === "building" ? "world" : "building")
                  }
                  className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25"
                >
                  <Building2 className="size-3.5" />
                  <span>
                    {viewMode === "building" ? "Show World Map" : "Zoom Building"}
                  </span>
                </button>
              </div>

              {/* Sanctuary Telemetry Metadata */}
              <div className="my-4 grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                  <div className="text-[10px] uppercase text-slate-400">
                    Operator / Gmail
                  </div>
                  <div className="mt-0.5 font-medium text-white">
                    {selectedNode.displayName}
                  </div>
                  <div className="truncate text-[11px] text-cyan-300">
                    {selectedNode.email || "Anonymous Node"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                  <div className="text-[10px] uppercase text-slate-400">
                    Hardware / AI Engine
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 font-medium text-white">
                    <Cpu className="size-3.5 text-cyan-400" />
                    <span>
                      {selectedNode.hasGpu ? "GPU Accelerated" : "CPU Lite Mode"}
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-slate-400">
                    {selectedNode.gpuName}
                  </div>
                </div>
              </div>

              {/* Conversation Thread */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="size-3.5 text-cyan-400" />
                    Direct Sanctuary Chat Box ({selectedNode.signature})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {currentMessages.length} messages
                  </span>
                </div>

                <div className="flex h-72 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-800 bg-[#050811] p-3.5">
                  {currentMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-xs text-slate-500">
                      <p>No messages from {selectedNode.churchName} yet.</p>
                      <p className="mt-1">
                        You can send a proactive developer greeting or signed update notification below!
                      </p>
                    </div>
                  ) : (
                    currentMessages.map((msg) => {
                      const isDev = msg.sender === "developer";
                      return (
                        <div
                          key={msg.id}
                          className={`flex max-w-[88%] flex-col rounded-xl p-3 text-xs ${
                            isDev
                              ? msg.isUpdateNotice
                                ? "self-end border border-emerald-500/40 bg-emerald-950/40 text-emerald-100"
                                : "self-end bg-cyan-600 text-white"
                              : "self-start border border-slate-800 bg-slate-900 text-slate-100"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-3 text-[10px] opacity-75">
                            <span className="font-bold">
                              {isDev ? "🛰️ Developer (You)" : `⛪ ${msg.senderName}`}
                            </span>
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {msg.text}
                          </p>
                          {msg.isUpdateNotice && (
                            <div className="mt-2 rounded border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                              🚀 Targeted Signed Release Notification (v
                              {msg.releaseVersion || "1.1.0"})
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Developer Reply & Signed Release Notification Composer */}
              <form onSubmit={handleSendReply} className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleQuickSignedTemplate}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <Sparkles className="size-3.5" />
                    <span>Fill &ldquo;Signed &amp; Ready to Update&rdquo; Template</span>
                  </button>

                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={isUpdateNotice}
                      onChange={(e) => setIsUpdateNotice(e.target.checked)}
                      className="rounded border-slate-700"
                    />
                    <span>Flag as Signed Release Update</span>
                  </label>
                </div>

                {isUpdateNotice && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Target Release Version:</span>
                    <input
                      type="text"
                      value={releaseVersion}
                      onChange={(e) => setReleaseVersion(e.target.value)}
                      className="w-28 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                    />
                  </div>
                )}

                <textarea
                  rows={3}
                  placeholder={`Address ${selectedNode.churchName} (${selectedNode.signature}) directly...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#050811] p-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={!replyText.trim() || isSending}
                    onClick={() => void handleBroadcastAll()}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40"
                  >
                    <Megaphone className="size-3.5" />
                    <span>Broadcast to All {nodes.length} Churches</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
                  >
                    <Send className="size-3.5" />
                    <span>
                      {isSending
                        ? "Dispatching..."
                        : `Send to ${selectedNode.signature}`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
