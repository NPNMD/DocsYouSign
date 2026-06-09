import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { verifyRequestAuth, unauthorized } from "@/lib/auth-server";
import { logApi } from "@/lib/api-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Export all user documents metadata + audit as JSON (GDPR/CCPA data export). */
export async function GET(req: Request) {
  const auth = await verifyRequestAuth(req);
  if (!auth) return unauthorized();

  try {
    const docsSnap = await adminDb.collection("documents").where("ownerId", "==", auth.uid).get();
    const documents = docsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const billingSnap = await adminDb.collection("billing").doc(auth.uid).get();

    logApi({ route: "account/export", message: "data-export", userId: auth.uid });

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      userId: auth.uid,
      email: auth.email,
      billing: billingSnap.data() ?? null,
      documents,
    });
  } catch {
    logApi({ route: "account/export", message: "export-failed", level: "error", userId: auth.uid });
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}

/** Delete account data: documents, signatures, billing reference (Admin SDK). */
export async function DELETE(req: Request) {
  const auth = await verifyRequestAuth(req);
  if (!auth) return unauthorized();

  let body: { confirm?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: "confirmation-required" }, { status: 400 });
  }

  try {
    const bucket = adminStorage.bucket();
    const docsSnap = await adminDb.collection("documents").where("ownerId", "==", auth.uid).get();
    for (const docSnap of docsSnap.docs) {
      const data = docSnap.data();
      const paths = [data.storagePath, data.signedPdfPath].filter(Boolean) as string[];
      for (const p of paths) {
        await bucket.file(p).delete({ ignoreNotFound: true }).catch(() => {});
      }
      await docSnap.ref.delete();
    }

    const sigSnap = await adminDb.collection("signatures").where("userId", "==", auth.uid).get();
    for (const s of sigSnap.docs) await s.ref.delete();

    await adminDb.collection("billing").doc(auth.uid).delete().catch(() => {});

    logApi({ route: "account/delete", message: "account-deleted", userId: auth.uid });

    return NextResponse.json({ ok: true });
  } catch {
    logApi({ route: "account/delete", message: "delete-failed", level: "error", userId: auth.uid });
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
