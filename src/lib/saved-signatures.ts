import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { SavedSignature } from "./types";

const MAX_SAVED = 5;

export async function listSavedSignatures(userId: string): Promise<SavedSignature[]> {
  const q = query(
    collection(db, "signatures"),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc"),
    limit(MAX_SAVED)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      dataUrl: data.dataUrl,
      label: data.label,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    };
  });
}

export async function saveSignature(userId: string, dataUrl: string, label?: string): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, "signatures"), {
    userId,
    dataUrl,
    label: label ?? "My signature",
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function deleteSavedSignature(id: string): Promise<void> {
  await deleteDoc(doc(db, "signatures", id));
}
