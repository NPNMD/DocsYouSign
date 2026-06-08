import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendReminderEmail } from "@/lib/email";
import { buildAuditEntry } from "@/lib/audit";
import type { EnvelopeSigner } from "@/lib/types";

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

  const snap = await adminDb.collection("envelopes").doc(id).get();
  if (!snap.exists || snap.data()!.senderId !== body.senderId) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  const data = snap.data()!;
  const signers = (data.signers ?? []) as EnvelopeSigner[];
  const pending = signers.find((s) => s.status === "pending" || s.status === "viewed");
  if (!pending?.signingRequestId) {
    return NextResponse.json({ error: "no-pending-signer" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const signingUrl = `${appUrl}/sign-request?token=${pending.signingRequestId}&e=${encodeURIComponent(pending.email)}`;

  await sendReminderEmail({
    recipientEmail: pending.email,
    recipientName: pending.name,
    senderEmail: data.senderEmail,
    documentName: data.documentName,
    signingUrl,
  });

  await snap.ref.update({
    audit: FieldValue.arrayUnion(buildAuditEntry("reminded")),
  });

  return NextResponse.json({ ok: true });
}
