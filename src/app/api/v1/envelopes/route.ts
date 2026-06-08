import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { createEnvelopeWithSigner } from "@/lib/envelopes";
import { sendInviteEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public API: create and send an envelope (requires API key). */
export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return NextResponse.json({ error: "missing-api-key" }, { status: 401 });

  const keySnap = await adminDb.collection("apiKeys").where("key", "==", apiKey).limit(1).get();
  if (keySnap.empty) return NextResponse.json({ error: "invalid-api-key" }, { status: 401 });
  const keyData = keySnap.docs[0].data();

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

  const result = await createEnvelopeWithSigner({
    senderId: keyData.userId,
    senderEmail: keyData.email,
    documentId,
    documentName,
    recipientName,
    recipientEmail,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const signingUrl = `${appUrl}/sign-request?token=${result.token}&e=${encodeURIComponent(recipientEmail)}`;
  await sendInviteEmail({
    recipientEmail,
    recipientName,
    senderEmail: keyData.email,
    documentName,
    signingUrl,
  });

  return NextResponse.json({ envelopeId: result.envelope.id, signingUrl });
}

/** List envelopes for API key owner. */
export async function GET(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return NextResponse.json({ error: "missing-api-key" }, { status: 401 });

  const keySnap = await adminDb.collection("apiKeys").where("key", "==", apiKey).limit(1).get();
  if (keySnap.empty) return NextResponse.json({ error: "invalid-api-key" }, { status: 401 });
  const userId = keySnap.docs[0].data().userId;

  const snap = await adminDb.collection("envelopes").where("senderId", "==", userId).limit(50).get();
  const envelopes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ envelopes });
}
