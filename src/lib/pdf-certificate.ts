import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface CertificateData {
  envelopeId: string;
  documentName: string;
  senderEmail: string;
  signerName: string;
  signerEmail: string;
  signedAt: string;
  documentHash?: string;
  ip?: string;
  userAgent?: string;
  consentAccepted: boolean;
}

/** Generate a one-page certificate of completion PDF. */
export async function generateCertificate(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();

  let y = height - 60;
  const draw = (text: string, size = 11, isBold = false) => {
    page.drawText(text, { x: 50, y, size, font: isBold ? bold : font, color: rgb(0.04, 0.09, 0.16) });
    y -= size + 8;
  };

  draw("CERTIFICATE OF COMPLETION", 20, true);
  y -= 10;
  draw(`Envelope ID: ${data.envelopeId}`);
  draw(`Document: ${data.documentName}`);
  draw(`Sender: ${data.senderEmail}`);
  draw(`Signer: ${data.signerName} (${data.signerEmail})`);
  draw(`Signed at: ${data.signedAt}`);
  if (data.documentHash) draw(`Document hash (SHA-256): ${data.documentHash}`);
  if (data.ip) draw(`Signer IP: ${data.ip}`);
  if (data.userAgent) draw(`User-Agent: ${data.userAgent.slice(0, 80)}`);
  draw(`ESIGN/UETA consent: ${data.consentAccepted ? "Accepted" : "Not recorded"}`);
  y -= 20;
  draw("This certificate is part of the executed document package.", 10);
  draw("SignToSeal — signtoseal.com", 10);

  return pdfDoc.save();
}

/** Append certificate page to an existing PDF. */
export async function appendCertificate(
  pdfBytes: Uint8Array,
  certData: CertificateData
): Promise<Uint8Array> {
  const mainDoc = await PDFDocument.load(pdfBytes);
  const certBytes = await generateCertificate(certData);
  const certDoc = await PDFDocument.load(certBytes);
  const [certPage] = await mainDoc.copyPages(certDoc, [0]);
  mainDoc.addPage(certPage);
  return mainDoc.save();
}
