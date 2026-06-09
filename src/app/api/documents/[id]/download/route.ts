import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { verifyRequestAuth, unauthorized } from "@/lib/auth-server";
import { buildAuditEntry } from "@/lib/audit";
import { extractClientIp } from "@/lib/audit";
import { checkRateLimit, recipientEmailMatches } from "@/lib/security";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logApi } from "@/lib/api-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * Mint a fresh signed-PDF download URL for authorized sender or verified recipient.
 * Permanent artifact path is stored on the document; URLs are short-lived.
 */
export async function GET(req: Request, { params }: RouteCtx) {
  const { id } = await params;
  const ip = extractClientIp(req.headers);
  if (!(await checkRateLimit(`download:${ip}:${id}`)).allowed) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const token = new URL(req.url).searchParams.get("token");
  const auth = await verifyRequestAuth(req);

  try {
    const docSnap = await adminDb.collection("documents").doc(id).get();
    if (!docSnap.exists) return NextResponse.json({ error: "not-found" }, { status: 404 });
    const data = docSnap.data()!;

    let authorized = false;
    if (auth && auth.uid === data.ownerId) authorized = true;

    if (!authorized && token) {
      const reqSnap = await adminDb.collection("signingRequests").doc(token).get();
      if (
        reqSnap.exists &&
        reqSnap.data()!.documentId === id &&
        auth &&
        auth.emailVerified &&
        recipientEmailMatches(reqSnap.data()!.recipientEmail, auth.email)
      ) {
        authorized = true;
      }
    }

    if (!authorized) {
      if (!auth) return unauthorized();
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const signedPath = data.signedPdfPath as string | undefined;
    if (!signedPath) {
      return NextResponse.json({ error: "not-ready" }, { status: 404 });
    }

    const bucket = adminStorage.bucket();
    const [signedUrl] = await bucket.file(signedPath).getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    await docSnap.ref.update({
      auditTrail: FieldValue.arrayUnion(
        buildAuditEntry("downloaded", {
          ip,
          userAgent: req.headers.get("user-agent") ?? "",
          email: auth?.email,
        })
      ),
      lastActivityAt: Timestamp.now(),
      lastActivityLabel: "Downloaded signed PDF",
    });

    logApi({ route: "documents/download", message: "signed-pdf-download", documentId: id, userId: auth?.uid });

    return NextResponse.json({
      url: signedUrl,
      documentHash: data.signedPdfHash ?? null,
      name: data.name ?? "document.pdf",
    });
  } catch (e) {
    logApi({
      route: "documents/download",
      message: "download-failed",
      level: "error",
      documentId: id,
      error: e instanceof Error ? e.message : "unknown",
    });
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
