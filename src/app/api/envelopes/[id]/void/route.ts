import { NextResponse } from "next/server";
import { voidEnvelope } from "@/lib/envelopes";
import { extractClientIp } from "@/lib/audit";
import { verifyRequestAuth, unauthorized } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteCtx) {
  const { id } = await params;
  const auth = await verifyRequestAuth(req);
  if (!auth) return unauthorized();

  const ok = await voidEnvelope(id, auth.uid, {
    ip: extractClientIp(req.headers),
    userAgent: req.headers.get("user-agent") ?? "",
  });
  if (!ok) return NextResponse.json({ error: "not-found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
