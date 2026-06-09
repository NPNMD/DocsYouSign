import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyRequestAuth } from "@/lib/auth-server";
import { extractClientIp, buildAuditEntry } from "@/lib/audit";
import { checkRateLimit, recipientEmailMatches } from "@/lib/security";
import { isTokenExpired } from "@/lib/signing-tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ token: string }> };

/** Recipient declines to sign. */
export async function POST(req: Request, { params }: RouteCtx) {
  const { token } = await params;
  const auth = await verifyRequestAuth(req);
  if (!auth?.emailVerified) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = extractClientIp(req.headers);
  if (!(await checkRateLimit(`decline:${ip}:${token}`)).allowed) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const reqRef = adminDb.collection("signingRequests").doc(token);
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const request = reqSnap.data()!;

  if (!recipientEmailMatches(request.recipientEmail, auth.email)) {
    return NextResponse.json({ error: "email-mismatch" }, { status: 403 });
  }
  if (isTokenExpired(request.expiresAt?.toDate?.())) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  await reqRef.update({
    status: "voided",
    audit: FieldValue.arrayUnion(buildAuditEntry("declined", { ip, email: auth.email })),
  });

  if (request.envelopeId) {
    await adminDb.collection("envelopes").doc(request.envelopeId).update({
      status: "declined",
      audit: FieldValue.arrayUnion(buildAuditEntry("declined", { ip, email: auth.email })),
    });
  }

  return NextResponse.json({ ok: true });
}
