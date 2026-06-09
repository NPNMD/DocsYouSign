import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createEnvelopeWithSigner } from "@/lib/envelopes";
import { sendInviteEmail } from "@/lib/email";
import { extractClientIp } from "@/lib/audit";
import { checkRateLimit, hashApiKey, normalizeEmail } from "@/lib/security";
import { canSendEnvelope, trialEndDate } from "@/lib/usage";
import type { BillingPlan } from "@/lib/types";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ApiKeyOwner {
  userId: string;
  email: string;
}

/**
 * Resolve an API key from the `x-api-key` header. Keys are stored hashed
 * (`keyHash`), never in plaintext, so we look up by the SHA-256 of the
 * presented key.
 */
async function resolveApiKey(req: Request): Promise<ApiKeyOwner | null> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return null;
  const keyHash = hashApiKey(apiKey);
  const snap = await adminDb.collection("apiKeys").where("keyHash", "==", keyHash).limit(1).get();
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return { userId: data.userId, email: data.email };
}

/** Public API: create and send an envelope (requires API key). */
export async function POST(req: Request) {
  const ip = extractClientIp(req.headers);
  if (!(await checkRateLimit(`v1-send:${ip}`)).allowed) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const owner = await resolveApiKey(req);
  if (!owner) return NextResponse.json({ error: "invalid-api-key" }, { status: 401 });

  let body: {
    documentId?: string;
    documentName?: string;
    recipientName?: string;
    recipientEmail?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const { documentId, documentName, recipientName, recipientEmail } = body;
  if (!documentId || !documentName || !recipientName || !recipientEmail) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  // The API caller can only send documents they own.
  const docSnap = await adminDb.collection("documents").doc(documentId).get();
  if (!docSnap.exists || docSnap.data()!.ownerId !== owner.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const billingSnap = await adminDb.collection("billing").doc(owner.userId).get();
  const billing = billingSnap.data();
  const plan = (billing?.plan as BillingPlan) ?? "trial";
  const envelopesUsed = (billing?.envelopesUsed as number) ?? 0;
  const trialEndsAt = billing?.trialEndsAt?.toDate?.() ?? trialEndDate();
  const quota = canSendEnvelope(plan, envelopesUsed, trialEndsAt);
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.reason }, { status: 402 });
  }

  const result = await createEnvelopeWithSigner({
    senderId: owner.userId,
    senderEmail: owner.email,
    documentId,
    documentName,
    recipientName,
    recipientEmail: normalizeEmail(recipientEmail),
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const signingUrl = `${appUrl}/sign-request?token=${result.token}&e=${encodeURIComponent(normalizeEmail(recipientEmail))}`;
  await sendInviteEmail({
    recipientEmail: normalizeEmail(recipientEmail),
    recipientName,
    senderEmail: owner.email,
    documentName,
    signingUrl,
  });

  await adminDb.collection("billing").doc(owner.userId).set(
    {
      userId: owner.userId,
      plan,
      envelopesUsed: envelopesUsed + 1,
      trialEndsAt: billing?.trialEndsAt ?? Timestamp.fromDate(trialEndDate()),
      periodStart: billing?.periodStart ?? Timestamp.now(),
    },
    { merge: true }
  );

  return NextResponse.json({ envelopeId: result.envelope.id, signingUrl });
}

/** List envelopes for API key owner. */
export async function GET(req: Request) {
  const ip = extractClientIp(req.headers);
  if (!(await checkRateLimit(`v1-list:${ip}`)).allowed) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const owner = await resolveApiKey(req);
  if (!owner) return NextResponse.json({ error: "invalid-api-key" }, { status: 401 });

  const snap = await adminDb.collection("envelopes").where("senderId", "==", owner.userId).limit(50).get();
  const envelopes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ envelopes });
}
