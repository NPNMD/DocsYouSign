import { createHash } from "crypto";
import { adminDb, adminStorage } from "./firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { flattenPdfFields, createFormPdf } from "./pdf-flatten";
import { appendCertificate, type CertificateData } from "./pdf-certificate";
import { getFormTemplate } from "./templates";
import { buildAuditEntry } from "./audit";

export async function finalizeDocument(
  documentId: string,
  certMeta: {
    envelopeId: string;
    signerName: string;
    signerEmail: string;
    senderEmail: string;
    ip?: string;
    userAgent?: string;
    consentText?: string;
    consentVersion?: string;
  }
): Promise<{ signedPdfPath: string; signedPdfUrl: string; documentHash: string } | null> {
  const docSnap = await adminDb.collection("documents").doc(documentId).get();
  if (!docSnap.exists) return null;
  const data = docSnap.data()!;

  let pdfBytes: Uint8Array;
  let documentHash: string | undefined;

  if (data.kind === "form" || data.templateId) {
    const template = data.templateId ? getFormTemplate(data.templateId as string) : undefined;
    const bodyHtml = (data.templateSnapshotHtml as string) ?? (template ? template.renderBody(data.formData ?? {}) : "");
    documentHash = createHash("sha256").update(bodyHtml).digest("hex");
    const sigField = (data.fields as Array<{ value?: string }> | undefined)?.[0];
    pdfBytes = await createFormPdf(
      data.name as string,
      bodyHtml,
      sigField?.value,
      data.signerName as string
    );
  } else if (data.storagePath) {
    const bucket = adminStorage.bucket();
    const [fileBytes] = await bucket.file(data.storagePath as string).download();
    pdfBytes = await flattenPdfFields(
      new Uint8Array(fileBytes),
      data.fields ?? [],
      data.pageCount ?? 1
    );
    documentHash = createHash("sha256").update(pdfBytes).digest("hex");
  } else {
    return null;
  }

  const certData: CertificateData = {
    envelopeId: certMeta.envelopeId,
    documentName: data.name as string,
    senderEmail: certMeta.senderEmail,
    signerName: certMeta.signerName,
    signerEmail: certMeta.signerEmail,
    signedAt: new Date().toISOString(),
    documentHash,
    ip: certMeta.ip,
    userAgent: certMeta.userAgent,
    consentAccepted: true,
    consentText: certMeta.consentText ?? (data.consentText as string | undefined),
    consentVersion: certMeta.consentVersion ?? (data.consentVersion as string | undefined),
    verificationMethod: "email-link",
  };
  pdfBytes = await appendCertificate(pdfBytes, certData);

  const finalHash = createHash("sha256").update(pdfBytes).digest("hex");

  const signedPath = `documents/${data.ownerId}/signed/${documentId}_${Date.now()}.pdf`;
  const bucket = adminStorage.bucket();
  const file = bucket.file(signedPath);
  await file.save(Buffer.from(pdfBytes), { contentType: "application/pdf" });
  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000,
  });

  const now = Timestamp.now();
  await adminDb.collection("documents").doc(documentId).update({
    signedPdfPath: signedPath,
    signedPdfUrl: signedUrl,
    signedPdfHash: finalHash,
    completedAt: now,
    status: "completed",
    updatedAt: now,
    auditTrail: FieldValue.arrayUnion(buildAuditEntry("completed")),
  });

  return { signedPdfPath: signedPath, signedPdfUrl: signedUrl, documentHash: finalHash };
}
