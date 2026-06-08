import { adminDb } from "./firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  generateSigningToken,
  hashSigningToken,
  tokenExpiresAt,
} from "./signing-tokens";
import { buildAuditEntry } from "./audit";
import type { Envelope, EnvelopeSigner, EnvelopeStatus } from "./types";

function envelopeFromSnap(id: string, data: FirebaseFirestore.DocumentData): Envelope {
  return {
    id,
    senderId: data.senderId,
    senderEmail: data.senderEmail,
    documentId: data.documentId,
    documentName: data.documentName,
    status: data.status as EnvelopeStatus,
    subject: data.subject,
    message: data.message,
    signers: (data.signers ?? []) as EnvelopeSigner[],
    audit: ((data.audit ?? []) as { event: string; at: string }[]).map((e) => ({
      event: e.event as Envelope["audit"][0]["event"],
      at: new Date(e.at),
    })),
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    sentAt: data.sentAt?.toDate?.(),
    expiresAt: data.expiresAt?.toDate?.(),
    completedAt: data.completedAt?.toDate?.(),
  };
}

export interface CreateEnvelopeInput {
  senderId: string;
  senderEmail: string;
  documentId: string;
  documentName: string;
  recipientName: string;
  recipientEmail: string;
  subject?: string;
  message?: string;
  auditMeta?: { ip?: string; userAgent?: string };
}

export interface CreateEnvelopeResult {
  envelope: Envelope;
  token: string;
  signingRequestId: string;
}

/** Create envelope + signing request for a single recipient (Phase 1 compat). */
export async function createEnvelopeWithSigner(
  input: CreateEnvelopeInput
): Promise<CreateEnvelopeResult> {
  const token = generateSigningToken();
  const tokenHash = hashSigningToken(token);
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(tokenExpiresAt());
  const recipientEmail = input.recipientEmail.trim().toLowerCase();

  const signerId = `signer_${Date.now()}`;
  const signer: EnvelopeSigner = {
    id: signerId,
    email: recipientEmail,
    name: input.recipientName.trim(),
    order: 1,
    status: "pending",
    tokenHash,
    signingRequestId: token,
  };

  const envelopeRef = adminDb.collection("envelopes").doc();
  const envelopeData = {
    senderId: input.senderId,
    senderEmail: input.senderEmail,
    documentId: input.documentId,
    documentName: input.documentName,
    status: "sent" as EnvelopeStatus,
    subject: input.subject ?? input.documentName,
    message: input.message ?? "",
    signers: [signer],
    audit: [buildAuditEntry("sent", input.auditMeta)],
    createdAt: now,
    sentAt: now,
    expiresAt,
  };
  await envelopeRef.set(envelopeData);

  const signingData = {
    documentId: input.documentId,
    senderId: input.senderId,
    senderEmail: input.senderEmail,
    recipientName: input.recipientName.trim(),
    recipientEmail,
    token,
    tokenHash,
    envelopeId: envelopeRef.id,
    status: "sent",
    audit: [buildAuditEntry("sent", input.auditMeta)],
    createdAt: now,
    sentAt: now,
    expiresAt,
  };
  await adminDb.collection("signingRequests").doc(token).set(signingData);

  await adminDb.collection("documents").doc(input.documentId).update({
    pendingSignerEmail: recipientEmail,
    signingRequestId: token,
    envelopeId: envelopeRef.id,
    status: "sent",
    updatedAt: now,
  });

  return {
    envelope: envelopeFromSnap(envelopeRef.id, envelopeData),
    token,
    signingRequestId: token,
  };
}

export async function getEnvelopeById(id: string): Promise<Envelope | null> {
  const snap = await adminDb.collection("envelopes").doc(id).get();
  if (!snap.exists) return null;
  return envelopeFromSnap(snap.id, snap.data()!);
}

export async function voidEnvelope(
  envelopeId: string,
  senderId: string,
  meta?: { ip?: string; userAgent?: string }
): Promise<boolean> {
  const ref = adminDb.collection("envelopes").doc(envelopeId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.senderId !== senderId) return false;
  const now = Timestamp.now();
  await ref.update({
    status: "voided",
    audit: FieldValue.arrayUnion(buildAuditEntry("voided", meta)),
    updatedAt: now,
  });
  const signers = (snap.data()!.signers ?? []) as EnvelopeSigner[];
  for (const s of signers) {
    if (s.signingRequestId) {
      await adminDb.collection("signingRequests").doc(s.signingRequestId).update({
        status: "voided",
        audit: FieldValue.arrayUnion(buildAuditEntry("voided", meta)),
      });
    }
  }
  return true;
}

/** Advance to next signer in sequential multi-signer flow. */
export async function advanceSequentialSigner(envelopeId: string): Promise<EnvelopeSigner | null> {
  const snap = await adminDb.collection("envelopes").doc(envelopeId).get();
  if (!snap.exists) return null;
  const signers = (snap.data()!.signers ?? []) as EnvelopeSigner[];
  const sorted = [...signers].sort((a, b) => a.order - b.order);
  const next = sorted.find((s) => s.status === "pending" || s.status === "viewed");
  return next ?? null;
}

/** Add a second signer to an existing envelope (sequential). */
export async function addSequentialSigner(
  envelopeId: string,
  senderId: string,
  recipient: { name: string; email: string }
): Promise<{ token: string; signer: EnvelopeSigner } | null> {
  const ref = adminDb.collection("envelopes").doc(envelopeId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.senderId !== senderId) return null;

  const signers = (snap.data()!.signers ?? []) as EnvelopeSigner[];
  const token = generateSigningToken();
  const tokenHash = hashSigningToken(token);
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(tokenExpiresAt());

  const newSigner: EnvelopeSigner = {
    id: `signer_${Date.now()}`,
    email: recipient.email.trim().toLowerCase(),
    name: recipient.name.trim(),
    order: signers.length + 1,
    status: "pending",
    tokenHash,
    signingRequestId: token,
  };

  await ref.update({
    signers: [...signers, newSigner],
    status: "partially_signed",
    updatedAt: now,
  });

  await adminDb.collection("signingRequests").doc(token).set({
    documentId: snap.data()!.documentId,
    senderId,
    senderEmail: snap.data()!.senderEmail,
    recipientName: newSigner.name,
    recipientEmail: newSigner.email,
    token,
    tokenHash,
    envelopeId,
    status: "sent",
    audit: [buildAuditEntry("sent")],
    createdAt: now,
    sentAt: now,
    expiresAt,
  });

  return { token, signer: newSigner };
}
