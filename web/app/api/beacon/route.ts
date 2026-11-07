import { NextResponse } from "next/server";
import { getCommandStore, CORS_HEADERS } from "../../_lib/command-store";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  const store = getCommandStore();
  const nodes = Array.from(store.nodes.values()).sort(
    (a, b) => b.lastSeenAt - a.lastSeenAt
  );

  return NextResponse.json(
    {
      count: nodes.length,
      nodes,
      serverTime: Date.now(),
    },
    { headers: CORS_HEADERS }
  );
}
