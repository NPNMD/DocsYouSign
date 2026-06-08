import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createHash } from "crypto";
import { getFormTemplate } from "@/lib/templates";
import { extractClientIp, buildAuditEntry } from "@/lib/audit";
import { checkRateLimit, recipientEmailMatches } from "@/lib/security";
import { isTokenExpired } from "@/lib/signing-tokens";
import { finalizeDocument } from "@/lib/pdf-finalize";
import { sendCompletionEmail } from "@/lib/email";
import { dispatchWebhook } from "@/lib/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ token: string }> };

export async function GET(req: Request, { params }: RouteCtx) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "missing-token" }, { status: 400 });

  const ip = extractClientIp(req.headers);
  const rate = checkRateLimit(`sign-get:${ip}:${token}`);
  if (!rate.allowed) return NextResponse.json({ error: "rate-limited" }, { status: 429 });

  try {
    const reqSnap = await adminDb.collection("signingRequests").doc(token).get();
    if (!reqSnap.exists) return NextResponse.json({ error: "not-found" }, { status: 404 });
    const request = reqSnap.data()!;

    if (request.status === "voided") return NextResponse.json({ error: "voided" }, { status: 410 });
    if (isTokenExpired(request.expiresAt?.toDate?.())) {
      return NextResponse.json({ error: "expired" }, { status: 410 });
    }

    const docSnap = await adminDb.collection("documents").doc(request.documentId).get();
    if (!docSnap.exists) return NextResponse.json({ error: "document-missing" }, { status: 404 });
    const docData = docSnap.data()!;

    if (request.status === "sent") {
      reqSnap.ref.update({
        status: "viewed",
        viewedAt: Timestamp.now(),
        audit: FieldValue.arrayUnion(buildAuditEntry("viewed", { ip, userAgent: req.headers.get("user-agent") ?? "" })),
      }).catch(() => {});
    }

    const isPdf = docData.kind !== "form" && !docData.templateId;

    return NextResponse.json({
      request: {
        senderEmail: request.senderEmail ?? "",
        recipientName: request.recipientName ?? "",
        recipientEmail: request.recipientEmail ?? "",
        status: request.status ?? "sent",
      },
      document: {
        id: docSnap.id,
        name: docData.name ?? "Document",
        kind: docData.kind ?? (docData.templateId ? "form" : "pdf"),
        templateId: docData.templateId ?? null,
        formData: docData.formData ?? {},
        fields: isPdf ? (docData.fields ?? []) : [],
        storageUrl: isPdf ? (docData.storageUrl ?? null) : null,
        status: docData.status ?? "sent",
        signatureDataUrl: docData.status === "signed" || docData.status === "completed" ? (docData.fields?.[0]?.value ?? null) : null,
        signerName: docData.signerName ?? null,
        signedAt: docData.signedAt?.toDate?.()?.toISOString?.() ?? null,
        signedPdfUrl: docData.signedPdfUrl ?? null,
      },
    });
  } catch (e) {
    console.error("sign-request GET failed:", e);
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteCtx) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "missing-token" }, { status: 400 });

  const ip = extractClientIp(req.headers);
  const rate = checkRateLimit(`sign-post:${ip}:${token}`);
  if (!rate.allowed) return NextResponse.json({ error: "rate-limited" }, { status: 429 });

  let body: {
    printName?: string;
    signatureDataUrl?: string;
    consent?: boolean;
    recipientEmail?: string;
    verified?: boolean;
    pdfFields?: Array<{ id: string; value: string }>;
  };
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
  if (body.verified !== true) {
    return NextResponse.json({ error: "email-not-verified" }, { status: 403 });
  }

  try {
    const reqRef = adminDb.collection("signingRequests").doc(token);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) return NextResponse.json({ error: "not-found" }, { status: 404 });
    const request = reqSnap.data()!;

    if (request.status === "voided") return NextResponse.json({ error: "voided" }, { status: 410 });
    if (request.status === "signed") return NextResponse.json({ error: "already-signed" }, { status: 409 });
    if (isTokenExpired(request.expiresAt?.toDate?.())) {
      return NextResponse.json({ error: "expired" }, { status: 410 });
    }
    if (!recipientEmailMatches(request.recipientEmail, body.recipientEmail)) {
      return NextResponse.json({ error: "email-mismatch" }, { status: 403 });
    }

    const docRef = adminDb.collection("documents").doc(request.documentId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return NextResponse.json({ error: "document-missing" }, { status: 404 });
    const docData = docSnap.data()!;

    const now = Timestamp.now();
    const ua = req.headers.get("user-agent") ?? "";
    const isPdf = docData.kind !== "form" && !docData.templateId;

    const docUpdate: Record<string, unknown> = {
      signerName: printName,
      status: "signed",
      signedAt: now,
      updatedAt: now,
    };

    if (isPdf) {
      const fields = [...(docData.fields ?? [])];
      const sigField = fields.find((f: { type: string }) => f.type === "signature");
      if (sigField) sigField.value = signatureDataUrl;
      if (body.pdfFields) {
        for (const pf of body.pdfFields) {
          const f = fields.find((x: { id: string }) => x.id === pf.id);
          if (f) f.value = pf.value;
        }
      }
      for (const f of fields) {
        if (f.type === "date" && !f.value) f.value = new Date().toISOString().split("T")[0];
      }
      docUpdate.fields = fields;
    } else {
      const finalValues = { ...(docData.formData ?? {}), _printedName: printName };
      const template = docData.templateId ? getFormTemplate(docData.templateId as string) : undefined;
      const templateSnapshotHtml = template ? template.renderBody(finalValues) : undefined;
      const templateSnapshotHash = templateSnapshotHtml
        ? createHash("sha256").update(templateSnapshotHtml).digest("hex")
        : undefined;
      docUpdate.formData = finalValues;
      docUpdate.fields = [{
        id: "form-signature", type: "signature", page: 1, x: 0, y: 0, width: 0, height: 0,
        value: signatureDataUrl, label: "Signature",
      }];
      if (templateSnapshotHtml) docUpdate.templateSnapshotHtml = templateSnapshotHtml;
      if (templateSnapshotHash) docUpdate.templateSnapshotHash = templateSnapshotHash;
      if (template?.version) docUpdate.templateVersion = template.version;
      if (template?.riskLevel) docUpdate.templateRiskLevel = template.riskLevel;
    }

    await docRef.update(docUpdate);

    await reqRef.update({
      status: "signed",
      signedAt: now,
      audit: FieldValue.arrayUnion(
        buildAuditEntry("consent", { ip, userAgent: ua, email: body.recipientEmail }),
        buildAuditEntry("signed", { ip, userAgent: ua, email: body.recipientEmail })
      ),
    });

    const envelopeId = (request.envelopeId as string) ?? token;
    if (request.envelopeId) {
      await adminDb.collection("envelopes").doc(request.envelopeId).update({
        status: "completed",
        completedAt: now,
        audit: FieldValue.arrayUnion(buildAuditEntry("signed", { ip, userAgent: ua })),
      });
    }

    const finalResult = await finalizeDocument(request.documentId, {
      envelopeId,
      signerName: printName,
      signerEmail: request.recipientEmail,
      senderEmail: request.senderEmail,
      ip,
      userAgent: ua,
    });

    await sendCompletionEmail({
      to: request.senderEmail,
      documentName: docData.name as string,
      signerName: printName,
      downloadUrl: finalResult?.signedPdfUrl,
    });
    await sendCompletionEmail({
      to: request.recipientEmail,
      documentName: docData.name as string,
      signerName: printName,
      downloadUrl: finalResult?.signedPdfUrl,
    });

    dispatchWebhook(request.senderId, "envelope.completed", {
      envelopeId,
      documentId: request.documentId,
      signerEmail: request.recipientEmail,
    }).catch(() => {});

    return NextResponse.json({ ok: true, signedPdfUrl: finalResult?.signedPdfUrl ?? null });
  } catch (e) {
    console.error("sign-request POST failed:", e);
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
