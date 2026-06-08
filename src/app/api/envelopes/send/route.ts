import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { createEnvelopeWithSigner } from "@/lib/envelopes";
import { sendInviteEmail } from "@/lib/email";
import { extractClientIp } from "@/lib/audit";
import { checkRateLimit, normalizeEmail } from "@/lib/security";
import { adminDb } from "@/lib/firebase-admin";
import { canSendEnvelope, trialEndDate } from "@/lib/usage";
import type { BillingPlan } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = extractClientIp(req.headers);
  const rate = checkRateLimit(`send:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  let body: {
    senderId?: string;
    senderEmail?: string;
    documentId?: string;
    documentName?: string;
    recipientName?: string;
    recipientEmail?: string;
    subject?: string;
    message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const { senderId, senderEmail, documentId, documentName, recipientName, recipientEmail } = body;
  if (!senderId || !senderEmail || !documentId || !documentName || !recipientName || !recipientEmail) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  const billingSnap = await adminDb.collection("billing").doc(senderId).get();
  const billing = billingSnap.data();
  const plan = (billing?.plan as BillingPlan) ?? "trial";
  const envelopesUsed = (billing?.envelopesUsed as number) ?? 0;
  const trialEndsAt = billing?.trialEndsAt?.toDate?.() ?? trialEndDate();

  const quota = canSendEnvelope(plan, envelopesUsed, trialEndsAt);
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.reason }, { status: 402 });
  }

  try {
    const result = await createEnvelopeWithSigner({
      senderId,
      senderEmail,
      documentId,
      documentName,
      recipientName,
      recipientEmail: normalizeEmail(recipientEmail),
      subject: body.subject,
      message: body.message,
      auditMeta: { ip, userAgent: req.headers.get("user-agent") ?? "" },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const signingUrl = `${appUrl}/sign-request?token=${result.token}&e=${encodeURIComponent(normalizeEmail(recipientEmail))}`;

    await sendInviteEmail({
      recipientEmail: normalizeEmail(recipientEmail),
      recipientName,
      senderEmail,
      documentName,
      signingUrl,
    });

    await adminDb.collection("billing").doc(senderId).set(
      {
        userId: senderId,
        plan,
        envelopesUsed: envelopesUsed + 1,
        trialEndsAt: billing?.trialEndsAt ?? Timestamp.fromDate(trialEndDate()),
        periodStart: billing?.periodStart ?? Timestamp.now(),
      },
      { merge: true }
    );

    return NextResponse.json({
      envelopeId: result.envelope.id,
      token: result.token,
      signingUrl,
    });
  } catch (e) {
    console.error("envelope send failed:", e);
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
