import { NextResponse } from "next/server";
import {
  getCommandStore,
  CORS_HEADERS,
  type FeedbackMessage,
  type BeaconNode,
} from "../../_lib/command-store";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  const store = getCommandStore();
  const threads: Array<{
    nodeId: string;
    node: BeaconNode | null;
    messages: FeedbackMessage[];
    lastUpdatedAt: number;
  }> = [];

  for (const [id, messages] of store.messagesByNode.entries()) {
    const lastMsg = messages[messages.length - 1];
    threads.push({
      nodeId: id,
      node: store.nodes.get(id) || null,
      messages,
      lastUpdatedAt: lastMsg ? lastMsg.timestamp : 0,
    });
  }

  threads.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);

  return NextResponse.json(
    { threads },
    { headers: CORS_HEADERS }
  );
}
