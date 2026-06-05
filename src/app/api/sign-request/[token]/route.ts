import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createHash } from "crypto";
import { getFormTemplate } from "@/lib/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ token: string }> };

/**
 * GET /api/sign-request/[token]
 * Token-gated read for unauthenticated recipients. Returns the signing request
 * metadata plus the linked form document (no PDF/Storage involved). Runs through
 * the Admin SDK, so Firestore security rules are bypassed and never exposed to
 * the public client.
 */
export async function GET(_req: Request, { params }: RouteCtx) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "missing-token" }, { status: 400 });
  }

  try {
    const reqSnap = await adminDb.collection("signingRequests").doc(token).get();
    if (!reqSnap.exists) {
      return NextResponse.json({ error: "not-found" }, { status: 404 });
    }
    const req = reqSnap.data()!;

    const docSnap = await adminDb.collection("documents").doc(req.documentId).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "document-missing" }, { status: 404 });
    }
    const docData = docSnap.data()!;

    // Audit: mark viewed the first time it's opened (non-fatal).
    if (req.status === "sent") {
      reqSnap.ref
        .update({
          status: "viewed",
          viewedAt: Timestamp.now(),
          audit: FieldValue.arrayUnion({ event: "viewed", at: new Date().toISOString() }),
        })
        .catch(() => {});
    }

    return NextResponse.json({
      request: {
        senderEmail: req.senderEmail ?? "",
        recipientName: req.recipientName ?? "",
        status: req.status ?? "sent",
      },
      document: {
        id: docSnap.id,
        name: docData.name ?? "Document",
        templateId: docData.templateId ?? null,
        formData: docData.formData ?? {},
        status: docData.status ?? "sent",
        signatureDataUrl:
          docData.status === "signed" ? (docData.fields?.[0]?.value ?? null) : null,
        signerName: docData.signerName ?? null,
        signedAt: docData.signedAt?.toDate?.()?.toISOString?.() ?? null,
      },
    });
  } catch (e) {
    console.error("sign-request GET failed:", e);
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}

/**
 * POST /api/sign-request/[token]
 * Records the recipient's signature against the linked document and completes
 * the signing request. Same-origin call from the recipient page.
 */
export async function POST(req: Request, { params }: RouteCtx) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "missing-token" }, { status: 400 });
  }

  let body: { printName?: string; signatureDataUrl?: string; consent?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const printName = (body.printName ?? "").trim();
  const signatureDataUrl = body.signatureDataUrl ?? "";
  if (!printName || !signatureDataUrl || body.consent !== true) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }
  if (!signatureDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }

  try {
    const reqRef = adminDb.collection("signingRequests").doc(token);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) {
      return NextResponse.json({ error: "not-found" }, { status: 404 });
    }
    const request = reqSnap.data()!;
    if (request.status === "signed") {
      return NextResponse.json({ error: "already-signed" }, { status: 409 });
    }

    const docRef = adminDb.collection("documents").doc(request.documentId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "document-missing" }, { status: 404 });
    }
    const docData = docSnap.data()!;

    const now = Timestamp.now();
    const finalValues = { ...(docData.formData ?? {}), _printedName: printName };
    const template = docData.templateId ? getFormTemplate(docData.templateId) : undefined;
    const templateSnapshotHtml = template ? template.renderBody(finalValues) : undefined;
    const templateSnapshotHash = templateSnapshotHtml
      ? createHash("sha256").update(templateSnapshotHtml).digest("hex")
      : undefined;
    const signatureField = {
      id: "form-signature",
      type: "signature",
      page: 1,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      value: signatureDataUrl,
      label: "Signature",
    };

    const docUpdate: Record<string, unknown> = {
      formData: finalValues,
      fields: [signatureField],
      signerName: printName,
      status: "signed",
      signedAt: now,
      updatedAt: now,
    };
    if (templateSnapshotHtml) docUpdate.templateSnapshotHtml = templateSnapshotHtml;
    if (templateSnapshotHash) docUpdate.templateSnapshotHash = templateSnapshotHash;
    if (template?.version) docUpdate.templateVersion = template.version;
    if (template?.riskLevel) docUpdate.templateRiskLevel = template.riskLevel;

    await docRef.update(docUpdate);

    await reqRef.update({
      status: "signed",
      signedAt: now,
      audit: FieldValue.arrayUnion({
        event: "signed",
        at: new Date().toISOString(),
        userAgent: req.headers.get("user-agent") ?? "",
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("sign-request POST failed:", e);
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
