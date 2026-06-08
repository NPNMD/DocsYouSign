import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Document,
  ProjectFolder,
  SavedContact,
  SendPreset,
  WorkspaceActivity,
  WorkspaceActivityType,
} from "./types";

export type AttentionKind = "needs-fields" | "ready-to-send" | "awaiting-signer" | "ready-to-download";

export interface AttentionItem {
  kind: AttentionKind;
  document: Document;
  label: string;
  detail: string;
  priority: number;
}

export interface WorkspaceFilters {
  projectId: string;
  status: "all" | Document["status"];
  query: string;
  sort: "newest" | "oldest" | "updated" | "name";
}

export const DEFAULT_SEND_PRESETS: Omit<SendPreset, "id" | "ownerId" | "createdAt" | "updatedAt">[] = [
  {
    name: "Standard signature request",
    subject: "Please review and sign",
    message: "Hi, please review and sign this document when you have a moment. Thank you.",
    reminderDays: 2,
    expiresDays: 7,
  },
  {
    name: "NDA request",
    subject: "NDA ready for signature",
    message: "Hi, this NDA is ready for your review and signature. Please let me know if you have any questions.",
    reminderDays: 2,
    expiresDays: 7,
  },
  {
    name: "Contractor onboarding",
    subject: "Onboarding document ready",
    message: "Hi, please complete this onboarding document so we can keep the process moving.",
    reminderDays: 3,
    expiresDays: 10,
  },
];

export const WORKFLOW_SHORTCUTS = [
  { id: "nda", name: "Send an NDA", templateHint: "NDA", icon: "🔐", desc: "Start from a confidentiality agreement and send it out." },
  { id: "contractor", name: "Contractor packet", templateHint: "Contractor", icon: "🧰", desc: "Prepare a contractor agreement for onboarding." },
  { id: "lease", name: "Lease packet", templateHint: "Lease", icon: "🏠", desc: "Group lease documents by tenant or property." },
  { id: "client", name: "Client agreement", templateHint: "Agreement", icon: "🤝", desc: "Create a project and keep client paperwork together." },
];

function timestampToDate(value: unknown): Date | undefined {
  return value instanceof Timestamp ? value.toDate() : undefined;
}

function dateOrNow(value: unknown): Date {
  return timestampToDate(value) ?? new Date();
}

function projectFromSnap(d: { id: string; data: () => Record<string, unknown> }): ProjectFolder {
  const data = d.data();
  return {
    id: d.id,
    ownerId: data.ownerId as string,
    name: data.name as string,
    description: data.description as string | undefined,
    color: data.color as string | undefined,
    createdAt: dateOrNow(data.createdAt),
    updatedAt: dateOrNow(data.updatedAt),
  };
}

function contactFromSnap(d: { id: string; data: () => Record<string, unknown> }): SavedContact {
  const data = d.data();
  return {
    id: d.id,
    ownerId: data.ownerId as string,
    name: data.name as string,
    email: data.email as string,
    company: data.company as string | undefined,
    role: data.role as string | undefined,
    notes: data.notes as string | undefined,
    lastUsedAt: timestampToDate(data.lastUsedAt),
    createdAt: dateOrNow(data.createdAt),
    updatedAt: dateOrNow(data.updatedAt),
  };
}

function presetFromSnap(d: { id: string; data: () => Record<string, unknown> }): SendPreset {
  const data = d.data();
  return {
    id: d.id,
    ownerId: data.ownerId as string,
    name: data.name as string,
    subject: data.subject as string,
    message: data.message as string,
    reminderDays: (data.reminderDays as number | undefined) ?? 2,
    expiresDays: (data.expiresDays as number | undefined) ?? 7,
    createdAt: dateOrNow(data.createdAt),
    updatedAt: dateOrNow(data.updatedAt),
  };
}

function activityFromSnap(d: { id: string; data: () => Record<string, unknown> }): WorkspaceActivity {
  const data = d.data();
  return {
    id: d.id,
    ownerId: data.ownerId as string,
    documentId: data.documentId as string | undefined,
    documentName: data.documentName as string | undefined,
    projectId: data.projectId as string | undefined,
    projectName: data.projectName as string | undefined,
    contactId: data.contactId as string | undefined,
    contactName: data.contactName as string | undefined,
    type: data.type as WorkspaceActivityType,
    label: data.label as string,
    createdAt: dateOrNow(data.createdAt),
  };
}

export function buildAttentionItems(documents: Document[]): AttentionItem[] {
  return documents
    .flatMap((document): AttentionItem[] => {
      if (document.status === "draft" && (document.fields?.length ?? 0) === 0) {
        return [{
          kind: "needs-fields",
          document,
          label: "Needs fields",
          detail: "Place signature, date, or text fields before sending.",
          priority: 1,
        }];
      }
      if (document.status === "prepared") {
        return [{
          kind: "ready-to-send",
          document,
          label: "Ready to send or sign",
          detail: "Fields are placed. Send it out or sign it yourself.",
          priority: 2,
        }];
      }
      if (document.status === "sent") {
        return [{
          kind: "awaiting-signer",
          document,
          label: "Awaiting signature",
          detail: document.pendingSignerEmail ? `Waiting on ${document.pendingSignerEmail}.` : "Waiting on recipient.",
          priority: 3,
        }];
      }
      if ((document.status === "signed" || document.status === "completed") && document.signedPdfUrl) {
        return [{
          kind: "ready-to-download",
          document,
          label: "Ready to download",
          detail: "Signed PDF is available for your records.",
          priority: 4,
        }];
      }
      return [];
    })
    .sort((a, b) => a.priority - b.priority || b.document.updatedAt.getTime() - a.document.updatedAt.getTime());
}

export function filterDocumentsForWorkspace(
  documents: Document[],
  filters: WorkspaceFilters
): Document[] {
  const queryText = filters.query.trim().toLowerCase();
  return documents
    .filter((document) => filters.projectId === "all" || (filters.projectId === "unfiled" ? !document.projectId : document.projectId === filters.projectId))
    .filter((document) => filters.status === "all" || document.status === filters.status)
    .filter((document) => {
      if (!queryText) return true;
      return [
        document.name,
        document.pendingSignerEmail,
        document.projectName,
        document.contactName,
        document.templateId,
        document.workflowName,
      ].some((value) => value?.toLowerCase().includes(queryText));
    })
    .sort((a, b) => {
      if (filters.sort === "oldest") return a.createdAt.getTime() - b.createdAt.getTime();
      if (filters.sort === "updated") return b.updatedAt.getTime() - a.updatedAt.getTime();
      if (filters.sort === "name") return a.name.localeCompare(b.name);
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}

export function suggestDocumentName(input: {
  projectName?: string;
  contactName?: string;
  workflowName?: string;
  originalName?: string;
  date?: Date;
}): string {
  const date = (input.date ?? new Date()).toISOString().slice(0, 10);
  const fallbackName = input.originalName?.replace(/\.pdf$/i, "").trim();
  return [input.projectName, input.contactName, input.workflowName ?? fallbackName, date]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim().replace(/\s+/g, " "))
    .join(" - ");
}

export function subscribeToProjects(userId: string, callback: (projects: ProjectFolder[]) => void) {
  const q = query(collection(db, "projectFolders"), where("ownerId", "==", userId), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => projectFromSnap({ id: d.id, data: d.data.bind(d) }))));
}

export function subscribeToContacts(userId: string, callback: (contacts: SavedContact[]) => void) {
  const q = query(collection(db, "savedContacts"), where("ownerId", "==", userId), orderBy("name", "asc"));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => contactFromSnap({ id: d.id, data: d.data.bind(d) }))));
}

export function subscribeToSendPresets(userId: string, callback: (presets: SendPreset[]) => void) {
  const q = query(collection(db, "sendPresets"), where("ownerId", "==", userId), orderBy("updatedAt", "desc"));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => presetFromSnap({ id: d.id, data: d.data.bind(d) }))));
}

export function subscribeToActivity(userId: string, callback: (items: WorkspaceActivity[]) => void) {
  const q = query(collection(db, "workspaceActivity"), where("ownerId", "==", userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.slice(0, 20).map((d) => activityFromSnap({ id: d.id, data: d.data.bind(d) }))));
}

export async function createProjectFolder(userId: string, name: string, description = ""): Promise<string> {
  const now = Timestamp.fromDate(new Date());
  const ref = await addDoc(collection(db, "projectFolders"), {
    ownerId: userId,
    name: name.trim(),
    description: description.trim(),
    color: "gold",
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function deleteProjectFolder(projectId: string): Promise<void> {
  await deleteDoc(doc(db, "projectFolders", projectId));
}

export async function saveContact(
  userId: string,
  input: { name: string; email: string; company?: string; role?: string; notes?: string }
): Promise<string> {
  const now = Timestamp.fromDate(new Date());
  const ref = await addDoc(collection(db, "savedContacts"), {
    ownerId: userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    company: input.company?.trim() ?? "",
    role: input.role?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    lastUsedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function touchContact(contactId: string): Promise<void> {
  await updateDoc(doc(db, "savedContacts", contactId), {
    lastUsedAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  });
}

export async function saveSendPreset(
  userId: string,
  input: { name: string; subject: string; message: string; reminderDays: number; expiresDays: number }
): Promise<string> {
  const now = Timestamp.fromDate(new Date());
  const ref = await addDoc(collection(db, "sendPresets"), {
    ownerId: userId,
    name: input.name.trim(),
    subject: input.subject.trim(),
    message: input.message.trim(),
    reminderDays: input.reminderDays,
    expiresDays: input.expiresDays,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function assignDocumentToProject(
  documentId: string,
  project?: Pick<ProjectFolder, "id" | "name">
): Promise<void> {
  await updateDoc(doc(db, "documents", documentId), {
    projectId: project?.id ?? "",
    projectName: project?.name ?? "",
    updatedAt: Timestamp.fromDate(new Date()),
  });
}

export async function renameDocument(documentId: string, name: string): Promise<void> {
  await updateDoc(doc(db, "documents", documentId), {
    name: name.trim(),
    updatedAt: Timestamp.fromDate(new Date()),
  });
}

export async function recordActivity(
  ownerId: string,
  input: Omit<WorkspaceActivity, "id" | "ownerId" | "createdAt">
): Promise<void> {
  await addDoc(collection(db, "workspaceActivity"), {
    ownerId,
    ...input,
    createdAt: Timestamp.fromDate(new Date()),
  });
}
