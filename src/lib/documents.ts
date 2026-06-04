import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
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
    formData: (data.formData as Record<string, string> | undefined) ?? undefined,
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
  callback: (docs: Document[]) => void
) {
  const q = query(
    collection(db, "documents"),
    where("ownerId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => docFromSnap({ id: d.id, data: d.data.bind(d) })));
  });
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
  userEmail: string
): Promise<Document> {
  if (template.kind !== "form") {
    throw new Error("PDF templates are not supported yet in createDocumentFromTemplate.");
  }
  const now = Timestamp.fromDate(new Date());
  const docData = {
    name: template.name,
    ownerId: userId,
    ownerEmail: userEmail,
    status: "draft" as const,
    fields: [],
    kind: "form" as const,
    templateId: template.id,
    formData: {},
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, "documents"), docData);
  return {
    ...docData,
    id: docRef.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
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
  signatureDataUrl: string
): Promise<void> {
  const now = Timestamp.fromDate(new Date());
  const signatureField: DocumentField = {
    id: "form-signature",
    type: "signature",
    page: 1,
    x: 0, y: 0, width: 0, height: 0,
    value: signatureDataUrl,
    label: "Signature",
  };
  await updateDoc(doc(db, "documents", documentId), {
    formData,
    fields: [signatureField],
    signerName,
    status: "signed",
    signedAt: now,
    updatedAt: now,
  });
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
  const reqRef = await addDoc(collection(db, "signingRequests"), data);
  return {
    id: reqRef.id,
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

/** Look up a signing request by its public token (for the /sign/[token] route). */
export async function getSigningRequestByToken(token: string): Promise<SigningRequest | null> {
  const q = query(collection(db, "signingRequests"), where("token", "==", token));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
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
