export interface BeaconNode {
  nodeId: string;
  signature: string;
  churchName: string;
  displayName: string;
  email: string;
  churchAddress: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  appVersion: string;
  hasGpu: boolean;
  gpuName: string;
  performanceTier: string;
  status: "live" | "transcribing" | "online";
  activeItem: string;
  screenCount: number;
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

const SEED_NODES: BeaconNode[] = [
  {
    nodeId: "LS-NODE-9A4F12",
    signature: "LS-SIG-9A4F-RCCGLA",
    churchName: "RCCG The Oasis Sanctuary",
    displayName: "Bro. Emmanuel (Media Lead)",
    email: "media.oasis@gmail.com",
    churchAddress: "Victoria Island, Lagos, Nigeria",
    city: "Lagos",
    country: "Nigeria",
    latitude: 6.4281,
    longitude: 3.4219,
    appVersion: "1.1.0",
    hasGpu: true,
    gpuName: "NVIDIA GeForce RTX 3060",
    performanceTier: "ultra",
    status: "live",
    activeItem: "Presenting: Romans 8:28 (KJV)",
    screenCount: 2,
    lastSeenAt: Date.now() - 25_000,
  },
  {
    nodeId: "LS-NODE-3C8B01",
    signature: "LS-SIG-3C8B-GRACEC",
    churchName: "Grace Community Fellowship",
    displayName: "Pastor Caleb",
    email: "caleb.gracefellowship@gmail.com",
    churchAddress: "1400 Congress Ave, Austin, TX",
    city: "Austin",
    country: "United States",
    latitude: 30.2672,
    longitude: -97.7431,
    appVersion: "1.1.0",
    hasGpu: false,
    gpuName: "Intel(R) Pentium(R) N3530 HD Graphics",
    performanceTier: "budget-cpu",
    status: "transcribing",
    activeItem: "Hymn #14: Amazing Grace (Stanza 2)",
    screenCount: 2,
    lastSeenAt: Date.now() - 48_000,
  },
  {
    nodeId: "LS-NODE-7E2D90",
    signature: "LS-SIG-7E2D-KINGSW",
    churchName: "Kingsway International Christian Centre",
    displayName: "Sister Sarah",
    email: "av.kingswayuk@gmail.com",
    churchAddress: "Hoe Street, Walthamstow, London",
    city: "London",
    country: "United Kingdom",
    latitude: 51.5842,
    longitude: -0.0197,
    appVersion: "1.1.0",
    hasGpu: true,
    gpuName: "Apple M2 Pro GPU",
    performanceTier: "ultra",
    status: "live",
    activeItem: "Presenting: Psalm 23:1-4 (KJV)",
    screenCount: 3,
    lastSeenAt: Date.now() - 70_000,
  },
  {
    nodeId: "LS-NODE-5F1A88",
    signature: "LS-SIG-5F1A-BETHEL",
    churchName: "Bethel Worship Center Nairobi",
    displayName: "David Ochieng",
    email: "bethelnairobi.media@gmail.com",
    churchAddress: "Ngong Road, Nairobi, Kenya",
    city: "Nairobi",
    country: "Kenya",
    latitude: -1.2921,
    longitude: 36.8219,
    appVersion: "1.1.0",
    hasGpu: false,
    gpuName: "Intel(R) Celeron(R) UHD Graphics 600",
    performanceTier: "budget-cpu",
    status: "online",
    activeItem: "Standby — Pre-Service Check",
    screenCount: 2,
    lastSeenAt: Date.now() - 110_000,
  },
  {
    nodeId: "LS-NODE-2B9C44",
    signature: "LS-SIG-2B9C-NEWLIF",
    churchName: "New Life Cathedral Toronto",
    displayName: "Mark Jenkins",
    email: "newlifetoronto.tech@gmail.com",
    churchAddress: "Yonge St, Toronto, ON",
    city: "Toronto",
    country: "Canada",
    latitude: 43.6532,
    longitude: -79.3832,
    appVersion: "1.1.0",
    hasGpu: true,
    gpuName: "AMD Radeon RX 6700 XT",
    performanceTier: "ultra",
    status: "live",
    activeItem: "Presenting: John 3:16 (ASV)",
    screenCount: 2,
    lastSeenAt: Date.now() - 15_000,
  },
];

const SEED_MESSAGES: Record<string, FeedbackMessage[]> = {
  "LS-NODE-3C8B01": [
    {
      id: "seed-msg-1",
      nodeId: "LS-NODE-3C8B01",
      signature: "LS-SIG-3C8B-GRACEC",
      sender: "user",
      senderName: "Grace Community Fellowship",
      text: "Hello Developer! We downloaded Lifestone Lite on our church's budget Intel Pentium N3530 laptop. The new MSVCP140.dll bundle fixed our startup error and the CPU mode notification is super helpful!",
      category: "praise",
      diagnostics: {
        appVersion: "1.1.0",
        gpuName: "Intel(R) Pentium(R) N3530 HD Graphics",
        hasGpu: false,
        performanceTier: "budget-cpu",
        os: "Windows 10 x64",
        screenCount: 2,
      },
      timestamp: Date.now() - 3600_000,
    },
    {
      id: "seed-msg-2",
      nodeId: "LS-NODE-3C8B01",
      signature: "LS-SIG-3C8B-GRACEC",
      sender: "developer",
      senderName: "Lifestone Command Center",
      text: "God bless you Pastor Caleb! We have signed the latest release for your sanctuary. Tap 'Update Now' whenever you are ready.",
      category: "update-notice",
      isUpdateNotice: true,
      releaseVersion: "1.1.0",
      timestamp: Date.now() - 1800_000,
    },
  ],
  "LS-NODE-9A4F12": [
    {
      id: "seed-msg-3",
      nodeId: "LS-NODE-9A4F12",
      signature: "LS-SIG-9A4F-RCCGLA",
      sender: "user",
      senderName: "RCCG The Oasis Sanctuary",
      text: "The 2,000+ Church Hymnal and automatic HDMI detection worked flawlessly during Sunday service today. Could we also get Yoruba hymn titles in a future update?",
      category: "feature",
      diagnostics: {
        appVersion: "1.1.0",
        gpuName: "NVIDIA GeForce RTX 3060",
        hasGpu: true,
        performanceTier: "ultra",
        os: "Windows 11 x64",
        screenCount: 2,
      },
      timestamp: Date.now() - 900_000,
    },
  ],
};

declare global {
  var __lifestoneCommandStore: CommandCenterStore | undefined;
}

export function getCommandStore(): CommandCenterStore {
  if (!globalThis.__lifestoneCommandStore) {
    const nodes = new Map<string, BeaconNode>();
    for (const n of SEED_NODES) {
      nodes.set(n.nodeId, n);
    }

    const messagesByNode = new Map<string, FeedbackMessage[]>();
    for (const [nodeId, msgs] of Object.entries(SEED_MESSAGES)) {
      messagesByNode.set(nodeId, [...msgs]);
    }

    globalThis.__lifestoneCommandStore = {
      nodes,
      messagesByNode,
    };
  }
  return globalThis.__lifestoneCommandStore;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
