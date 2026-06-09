import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyRequestAuth, unauthorized } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/** Return envelope audit trail for the sender (owner). */
export async function GET(req: Request, { params }: RouteCtx) {
  const auth = await verifyRequestAuth(req);
  if (!auth?.emailVerified) return unauthorized();

  const { id } = await params;
  const snap = await adminDb.collection("envelopes").doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const data = snap.data()!;
  if (data.senderId !== auth.uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const audit = ((data.audit ?? []) as { event: string; at: string; ip?: string; email?: string }[]).map(
    (e) => ({
      event: e.event,
      at: e.at,
      ip: e.ip,
      email: e.email,
    })
  );

  return NextResponse.json({
    id: snap.id,
    status: data.status,
    audit,
    signers: data.signers ?? [],
  });
}
