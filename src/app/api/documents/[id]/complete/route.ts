import { NextResponse } from "next/server";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { verifyRequestAuth, unauthorized } from "@/lib/auth-server";
import { extractClientIp, buildAuditEntry } from "@/lib/audit";
import { checkRateLimit, isValidSignatureDataUrl } from "@/lib/security";
import { finalizeDocument } from "@/lib/pdf-finalize";
import { ESIGN_CONSENT_TEXT, ESIGN_CONSENT_VERSION } from "@/lib/consent";
import { logApi } from "@/lib/api-logger";
import type { DocumentField } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/** Owner self-sign completion: consent, audit, flatten PDF, certificate. */
export async function POST(req: Request, { params }: RouteCtx) {
  const { id } = await params;
  const auth = await verifyRequestAuth(req);
  if (!auth) return unauthorized();

  const ip = extractClientIp(req.headers);
  if (!(await checkRateLimit(`owner-sign:${ip}:${auth.uid}`)).allowed) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  let body: {
    printName?: string;
    fields?: DocumentField[];
    consent?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const printName = (body.printName ?? "").trim();
  if (!printName || body.consent !== true || !Array.isArray(body.fields)) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  for (const f of body.fields) {
    if ((f.type === "signature" || f.type === "initials") && f.value && !isValidSignatureDataUrl(f.value)) {
      return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
    }
  }

  try {
    const docRef = adminDb.collection("documents").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists || docSnap.data()!.ownerId !== auth.uid) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const docData = docSnap.data()!;
    if (docData.status === "completed" || docData.status === "signed") {
      return NextResponse.json({ error: "already-signed" }, { status: 409 });
    }

    const now = Timestamp.now();
    const ua = req.headers.get("user-agent") ?? "";
    const fields = body.fields.map((f) => {
      if (f.type === "date" && !f.value) {
        return { ...f, value: new Date().toISOString().split("T")[0] };
      }
      return f;
    });

    await docRef.update({
      fields,
      signerName: printName,
      status: "signed",
      signedAt: now,
      updatedAt: now,
      consentText: ESIGN_CONSENT_TEXT,
      consentVersion: ESIGN_CONSENT_VERSION,
      consentAcceptedAt: now,
      auditTrail: FieldValue.arrayUnion(
        buildAuditEntry("consent", { ip, userAgent: ua, email: auth.email }),
        buildAuditEntry("signed", { ip, userAgent: ua, email: auth.email })
      ),
    });

    const finalResult = await finalizeDocument(id, {
      envelopeId: (docData.envelopeId as string) ?? id,
      signerName: printName,
      signerEmail: auth.email,
      senderEmail: (docData.ownerEmail as string) ?? auth.email,
      ip,
      userAgent: ua,
      consentText: ESIGN_CONSENT_TEXT,
      consentVersion: ESIGN_CONSENT_VERSION,
    });

    logApi({ route: "documents/complete", message: "owner-self-sign-complete", documentId: id, userId: auth.uid });

    return NextResponse.json({
      ok: true,
      signedPdfUrl: finalResult?.signedPdfUrl ?? null,
      downloadPath: `/api/documents/${id}/download`,
    });
  } catch (e) {
    logApi({
      route: "documents/complete",
      message: "owner-sign-failed",
      level: "error",
      documentId: id,
      error: e instanceof Error ? e.message : "unknown",
    });
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
