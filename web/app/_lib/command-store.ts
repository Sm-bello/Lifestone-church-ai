export interface BeaconNode {
  nodeId: string;
  signature: string;
  publicKeyFingerprint?: string;
  cryptoAlgorithm?: string;
  lastSignatureHex?: string;
  churchName: string;
  displayName: string;
  email: string;
  churchAddress: string;
  city: string;
  region?: string;
  country: string;
  isp?: string;
  ip?: string;
  latitude: number;
  longitude: number;
  appVersion: string;
  hasGpu: boolean;
  gpuName: string;
  performanceTier: string;
  status: "live" | "transcribing" | "online";
  activeItem: string;
  screenCount: number;
  cpuCores?: number;
  lastSeenAt: number;
}

export interface NodeDiagnostics {
  appVersion: string;
  gpuName: string;
  hasGpu: boolean;
  performanceTier: string;
  os: string;
  screenCount: number;
}

export interface FeedbackMessage {
  id: string;
  nodeId: string;
  signature: string;
  sender: "user" | "developer";
  senderName: string;
  text: string;
  category?: "bug" | "feature" | "praise" | "question" | "update-notice";
  isUpdateNotice?: boolean;
  releaseVersion?: string;
  diagnostics?: NodeDiagnostics;
  timestamp: number;
}

interface CommandCenterStore {
  nodes: Map<string, BeaconNode>;
  messagesByNode: Map<string, FeedbackMessage[]>;
}

declare global {
  var __lifestoneCommandStore: CommandCenterStore | undefined;
}

export function getCommandStore(): CommandCenterStore {
  if (!globalThis.__lifestoneCommandStore) {
    globalThis.__lifestoneCommandStore = {
      nodes: new Map<string, BeaconNode>(),
      messagesByNode: new Map<string, FeedbackMessage[]>(),
    };
  }
  return globalThis.__lifestoneCommandStore;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
