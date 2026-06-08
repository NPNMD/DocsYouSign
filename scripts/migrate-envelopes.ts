/**
 * Backfill envelopes from existing signingRequests + documents.
 * Run: npx tsx scripts/migrate-envelopes.ts
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { hashSigningToken, tokenExpiresAt } from "../src/lib/signing-tokens";

const PROJECT_ID = "docsyousign";

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  return initializeApp({ projectId: PROJECT_ID });
}

async function migrate() {
  const db = getFirestore(getAdminApp());
  const requests = await db.collection("signingRequests").get();
  let migrated = 0;

  for (const doc of requests.docs) {
    const data = doc.data();
    if (data.envelopeId) continue;

    const token = doc.id;
    const tokenHash = data.tokenHash ?? hashSigningToken(token);
    const now = Timestamp.now();
    const expiresAt = data.expiresAt ?? Timestamp.fromDate(tokenExpiresAt(data.createdAt?.toDate?.() ?? new Date()));

    const docSnap = await db.collection("documents").doc(data.documentId).get();
    const docName = docSnap.data()?.name ?? "Document";

    const envelopeRef = db.collection("envelopes").doc();
    await envelopeRef.set({
      senderId: data.senderId,
      senderEmail: data.senderEmail,
      documentId: data.documentId,
      documentName: docName,
      status: data.status === "signed" ? "completed" : data.status === "voided" ? "voided" : "sent",
      signers: [{
        id: "signer_1",
        email: data.recipientEmail,
        name: data.recipientName,
        order: 1,
        status: data.status === "signed" ? "signed" : "pending",
        tokenHash,
        signingRequestId: token,
      }],
      audit: data.audit ?? [],
      createdAt: data.createdAt ?? now,
      sentAt: data.sentAt ?? now,
      expiresAt,
      completedAt: data.signedAt ?? null,
    });

    await doc.ref.update({ envelopeId: envelopeRef.id, tokenHash, expiresAt });
    if (docSnap.exists) {
      await docSnap.ref.update({ envelopeId: envelopeRef.id });
    }
    migrated++;
  }

  console.log(`Migrated ${migrated} signing requests to envelopes.`);
}

migrate().catch(console.error);
