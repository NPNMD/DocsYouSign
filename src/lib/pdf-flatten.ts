import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { DocumentField } from "./types";

/** Burn field overlays into a PDF and return the flattened bytes. */
export async function flattenPdfFields(
  pdfBytes: Uint8Array,
  fields: DocumentField[],
  pageCount: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const field of fields) {
    const pageIndex = Math.min(Math.max(field.page - 1, 0), pages.length - 1);
    const page = pages[pageIndex];
    if (!page || !field.value) continue;

    const { width: pw, height: ph } = page.getSize();
    const x = (field.x / 100) * pw;
    const y = ph - (field.y / 100) * ph - (field.height / 100) * ph;
    const w = (field.width / 100) * pw;
    const h = (field.height / 100) * ph;

    if (field.type === "signature" || field.type === "initials") {
      if (!field.value.startsWith("data:image/")) continue;
      const base64 = field.value.split(",")[1];
      if (!base64) continue;
      const imgBytes = new Uint8Array(Buffer.from(base64, "base64"));
      const isPng = field.value.includes("image/png");
      const img = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
      page.drawImage(img, { x, y, width: w, height: h });
    } else if (field.type === "date" || field.type === "text") {
      const text = field.value;
      const fontSize = Math.min(h * 0.6, 14);
      page.drawText(text, { x: x + 2, y: y + h * 0.25, size: fontSize, font, color: rgb(0, 0, 0) });
    }
  }

  void pageCount; // used for validation upstream
  return pdfDoc.save();
}

/** Create a simple PDF from HTML text content (form templates). */
export async function createFormPdf(
  title: string,
  bodyText: string,
  signatureDataUrl?: string,
  signerName?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();

  page.drawText(title, { x: 50, y: height - 50, size: 18, font: bold, color: rgb(0.04, 0.09, 0.16) });

  const lines = bodyText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wrapped = wrapText(lines, 80);
  let y = height - 90;
  for (const line of wrapped.slice(0, 40)) {
    page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 14;
    if (y < 120) break;
  }

  if (signatureDataUrl?.startsWith("data:image/") && signerName) {
      const base64 = signatureDataUrl.split(",")[1];
      if (base64) {
        const imgBytes = new Uint8Array(Buffer.from(base64, "base64"));
      const isPng = signatureDataUrl.includes("image/png");
      const img = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
      page.drawText(`Signed by: ${signerName}`, { x: 50, y: 100, size: 11, font: bold });
      page.drawImage(img, { x: 50, y: 40, width: 180, height: 50 });
    }
  }

  return pdfDoc.save();
}

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxLen) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = current ? `${current} ${w}` : w;
    }
  }
  if (current) lines.push(current);
  return lines;
}
