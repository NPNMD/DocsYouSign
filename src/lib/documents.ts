import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  arrayUnion,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import type { Document, DocumentField, SigningRequest } from "./types";
import type { Template } from "./types";

function docFromSnap(d: { id: string; data: () => Record<string, unknown> }): Document {
  const data = d.data();
  return {
    id: d.id,
    name: data.name as string,
    ownerId: data.ownerId as string,
    ownerEmail: data.ownerEmail as string,
    storageUrl: data.storageUrl as string,
    storagePath: data.storagePath as string,
    status: (data.status as Document["status"]) ?? "draft",
    fields: (data.fields as DocumentField[]) ?? [],
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    signedAt: data.signedAt ? (data.signedAt as Timestamp).toDate() : undefined,
    signerName: data.signerName as string | undefined,
    pageCount: data.pageCount as number | undefined,
    fileSize: data.fileSize as number | undefined,
    kind: (data.kind as Document["kind"]) ?? "pdf",
    templateId: data.templateId as string | undefined,
    templateVersion: data.templateVersion as string | undefined,
    templateRiskLevel: data.templateRiskLevel as Document["templateRiskLevel"],
    templateAcknowledgedAt: data.templateAcknowledgedAt ? (data.templateAcknowledgedAt as Timestamp).toDate() : undefined,
    templateSnapshotHtml: data.templateSnapshotHtml as string | undefined,
    templateSnapshotHash: data.templateSnapshotHash as string | undefined,
    formData: (data.formData as Record<string, string> | undefined) ?? undefined,
    pendingSignerEmail: data.pendingSignerEmail as string | undefined,
    signingRequestId: data.signingRequestId as string | undefined,
  };
}

export async function uploadDocument(
  file: File,
  userId: string,
  userEmail: string
): Promise<Document> {
  const storagePath = `documents/${userId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const now = Timestamp.fromDate(new Date());
  const docData = {
    name: file.name,
    ownerId: userId,
    ownerEmail: userEmail,
    storageUrl: url,
    storagePath,
    status: "draft" as const,
    fields: [],
    createdAt: now,
    updatedAt: now,
    fileSize: file.size,
  };

  const docRef = await addDoc(collection(db, "documents"), docData);
  return {
    ...docData,
    id: docRef.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getDocument(documentId: string): Promise<Document | null> {
  const snap = await getDoc(doc(db, "documents", documentId));
  if (!snap.exists()) return null;
  return docFromSnap({ id: snap.id, data: snap.data.bind(snap) });
}

export function subscribeToUserDocuments(
  userId: string,
  callback: (docs: Document[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, "documents"),
    where("ownerId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => docFromSnap({ id: d.id, data: d.data.bind(d) })));
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

export async function saveFields(
  documentId: string,
  fields: DocumentField[],
  pageCount: number
): Promise<void> {
  await updateDoc(doc(db, "documents", documentId), {
    fields,
    pageCount,
    status: "prepared",
    updatedAt: Timestamp.fromDate(new Date()),
  });
}

export async function signDocument(
  documentId: string,
  fields: DocumentField[],
  signerName: string
): Promise<void> {
  const now = Timestamp.fromDate(new Date());
  await updateDoc(doc(db, "documents", documentId), {
    fields,
    signerName,
    status: "signed",
    signedAt: now,
    updatedAt: now,
  });
}

export async function deleteDocument(documentId: string, storagePath?: string): Promise<void> {
  await deleteDoc(doc(db, "documents", documentId));
  // Form-template documents have no stored file.
  if (storagePath) {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef).catch(() => {/* file may already be gone */});
  }
}

// ── Template-backed documents ─────────────────────────────────────

/** Create a new form-template document (no PDF upload) and return it. */
export async function createDocumentFromTemplate(
  template: Template,
  userId: string,
  userEmail: string,
  acknowledgment?: { acknowledgedAt: Date }
): Promise<Document> {
  if (template.kind !== "form") {
    throw new Error("PDF templates are not supported yet in createDocumentFromTemplate.");
  }
  const now = Timestamp.fromDate(new Date());
  const docData: Record<string, unknown> = {
    name: template.name,
    ownerId: userId,
    ownerEmail: userEmail,
    status: "draft" as const,
    fields: [],
    kind: "form" as const,
    templateId: template.id,
    templateVersion: template.version ?? "1.0.0",
    templateRiskLevel: template.riskLevel ?? "medium",
    formData: {},
    createdAt: now,
    updatedAt: now,
  };
  if (acknowledgment) {
    docData.templateAcknowledgedAt = Timestamp.fromDate(acknowledgment.acknowledgedAt);
  }
  const docRef = await addDoc(collection(db, "documents"), docData);
  return {
    name: template.name,
    ownerId: userId,
    ownerEmail: userEmail,
    status: "draft",
    fields: [],
    kind: "form",
    templateId: template.id,
    templateVersion: template.version ?? "1.0.0",
    templateRiskLevel: template.riskLevel ?? "medium",
    formData: {},
    id: docRef.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    templateAcknowledgedAt: acknowledgment?.acknowledgedAt,
  };
}

async function hashString(value: string): Promise<string | undefined> {
  if (typeof crypto === "undefined" || !crypto.subtle) return undefined;
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Persist progress on a form document (filled values), without completing it. */
export async function saveFormData(
  documentId: string,
  formData: Record<string, string>
): Promise<void> {
  await updateDoc(doc(db, "documents", documentId), {
    formData,
    status: "prepared",
    updatedAt: Timestamp.fromDate(new Date()),
  });
}

/** Complete + sign a form document: store answers, signer name, and signature image. */
export async function signFormDocument(
  documentId: string,
  formData: Record<string, string>,
  signerName: string,
  signatureDataUrl: string,
  templateSnapshot?: {
    html: string;
    version?: string;
    riskLevel?: Document["templateRiskLevel"];
  }
): Promise<void> {
  const now = Timestamp.fromDate(new Date());
  const snapshotHash = templateSnapshot?.html ? await hashString(templateSnapshot.html) : undefined;
  const signatureField: DocumentField = {
    id: "form-signature",
    type: "signature",
    page: 1,
    x: 0, y: 0, width: 0, height: 0,
    value: signatureDataUrl,
    label: "Signature",
  };
  const updateData: Record<string, unknown> = {
    formData,
    fields: [signatureField],
    signerName,
    status: "signed",
    signedAt: now,
    updatedAt: now,
  };
  if (templateSnapshot?.html) updateData.templateSnapshotHtml = templateSnapshot.html;
  if (snapshotHash) updateData.templateSnapshotHash = snapshotHash;
  if (templateSnapshot?.version) updateData.templateVersion = templateSnapshot.version;
  if (templateSnapshot?.riskLevel) updateData.templateRiskLevel = templateSnapshot.riskLevel;
  await updateDoc(doc(db, "documents", documentId), updateData);
}

// ── Signing requests (send-to-sign foundation) ────────────────────

function genToken(): string {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a signing request that routes a recipient (by unique token) to a
 * document. Email delivery + passwordless recipient verification are wired in
 * a later phase; this records the request and audit trail.
 */
export async function createSigningRequest(
  documentId: string,
  sender: { id: string; email: string },
  recipient: { name: string; email: string }
): Promise<SigningRequest> {
  const token = genToken();
  const now = Timestamp.fromDate(new Date());
  const data = {
    documentId,
    senderId: sender.id,
    senderEmail: sender.email,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    token,
    status: "sent" as const,
    audit: [{ event: "sent", at: new Date().toISOString() }],
    createdAt: now,
    sentAt: now,
  };
  // Token is the document ID so recipients can fetch via a single-doc get()
  // (security rules can authorize per-document; queries cannot).
  await setDoc(doc(db, "signingRequests", token), data);
  // Stamp the document so security rules can authorize the recipient and the
  // sender's dashboard reflects that it's out for signature.
  await updateDoc(doc(db, "documents", documentId), {
    pendingSignerEmail: recipient.email.trim().toLowerCase(),
    signingRequestId: token,
    status: "sent",
    updatedAt: now,
  });
  return {
    id: token,
    documentId,
    senderId: sender.id,
    senderEmail: sender.email,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    token,
    status: "sent",
    audit: [{ event: "sent", at: new Date() }],
    createdAt: new Date(),
    sentAt: new Date(),
  };
}

/** Record that the recipient opened the document (audit trail). */
export async function markSigningRequestViewed(requestId: string): Promise<void> {
  const now = Timestamp.fromDate(new Date());
  await updateDoc(doc(db, "signingRequests", requestId), {
    status: "viewed",
    viewedAt: now,
    audit: arrayUnion({ event: "viewed", at: new Date().toISOString() }),
  }).catch(() => {/* non-fatal */});
}

/** Mark a signing request signed and append the signing audit entry. */
export async function completeSigningRequest(
  requestId: string,
  meta?: { userAgent?: string }
): Promise<void> {
  const now = Timestamp.fromDate(new Date());
  await updateDoc(doc(db, "signingRequests", requestId), {
    status: "signed",
    signedAt: now,
    audit: arrayUnion({
      event: "signed",
      at: new Date().toISOString(),
      userAgent: meta?.userAgent ?? "",
    }),
  });
}

/** Look up a signing request by its public token (token == doc id). */
export async function getSigningRequestByToken(token: string): Promise<SigningRequest | null> {
  const snap = await getDoc(doc(db, "signingRequests", token));
  if (!snap.exists()) return null;
  const d = snap;
  const data = d.data();
  return {
    id: d.id,
    documentId: data.documentId,
    senderId: data.senderId,
    senderEmail: data.senderEmail,
    recipientName: data.recipientName,
    recipientEmail: data.recipientEmail,
    token: data.token,
    status: data.status ?? "sent",
    audit: ((data.audit as { event: string; at: string }[]) ?? []).map((e) => ({
      event: e.event as "sent" | "viewed" | "verified" | "signed",
      at: new Date(e.at),
    })),
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    sentAt: data.sentAt ? (data.sentAt as Timestamp).toDate() : undefined,
    viewedAt: data.viewedAt ? (data.viewedAt as Timestamp).toDate() : undefined,
    signedAt: data.signedAt ? (data.signedAt as Timestamp).toDate() : undefined,
  };
}
