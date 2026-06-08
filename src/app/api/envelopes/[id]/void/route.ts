import { NextResponse } from "next/server";
import { voidEnvelope } from "@/lib/envelopes";
import { extractClientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteCtx) {
  const { id } = await params;
  let body: { senderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (!body.senderId) return NextResponse.json({ error: "missing-fields" }, { status: 400 });

  const ok = await voidEnvelope(id, body.senderId, {
    ip: extractClientIp(req.headers),
    userAgent: req.headers.get("user-agent") ?? "",
  });
  if (!ok) return NextResponse.json({ error: "not-found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
