import { Resend } from "resend";

const SUPPORT_EMAIL = "hello@signtoseal.com";
const LINK_EXPIRY_DAYS = 30;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://signtoseal.com";
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "SignToSeal <signing@signtoseal.com>";
}

function senderDisplay(senderName?: string, senderEmail?: string): string {
  const name = senderName?.trim();
  if (name) return name;
  return senderEmail ?? "Someone";
}

function emailFooter(): string {
  return `
    <hr style="border:none;border-top:1px solid #e8e4dc;margin:24px 0" />
    <p style="color:#666;font-size:13px;line-height:1.5;margin:0 0 8px">
      <strong>Safety tip:</strong> Only sign if you expected this document. If you did not recognize the sender or document, do not click the link — contact us at
      <a href="mailto:${SUPPORT_EMAIL}" style="color:#0a1628">${SUPPORT_EMAIL}</a>.
    </p>
    <p style="color:#999;font-size:12px;margin:0">
      This signing link expires in ${LINK_EXPIRY_DAYS} days. Questions? Email
      <a href="mailto:${SUPPORT_EMAIL}" style="color:#0a1628">${SUPPORT_EMAIL}</a>.
    </p>
  `;
}

export interface InviteEmailParams {
  recipientEmail: string;
  recipientName: string;
  senderEmail: string;
  senderName?: string;
  documentName: string;
  signingUrl: string;
  subject?: string;
  message?: string;
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping invite email");
    return false;
  }
  const { recipientEmail, recipientName, senderEmail, senderName, documentName, signingUrl, subject, message } =
    params;
  const from = senderDisplay(senderName, senderEmail);

  await resend.emails.send({
    from: fromAddress(),
    to: recipientEmail,
    subject: subject?.trim() || `${from} sent you "${documentName}" to sign`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#0a1628;margin:0 0 16px">SignToSeal</h2>
        <p style="color:#333;line-height:1.5">Hi ${recipientName},</p>
        <p style="color:#333;line-height:1.5">
          <strong>${from}</strong>${senderName && senderEmail ? ` (${senderEmail})` : ""} has sent you
          <strong>"${documentName}"</strong> to review and sign electronically.
        </p>
        ${message?.trim() ? `<p style="padding:12px 16px;background:#faf7f0;border-radius:8px;color:#333;line-height:1.5;border-left:3px solid #c9a84c">${message}</p>` : ""}
        <p style="margin:24px 0">
          <a href="${signingUrl}" style="display:inline-block;background:#c9a84c;color:#0a1628;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Review &amp; Sign Document</a>
        </p>
        <p style="color:#666;font-size:13px;line-height:1.5">
          Document: <strong>${documentName}</strong><br />
          From: <strong>${from}</strong>${senderEmail ? ` &lt;${senderEmail}&gt;` : ""}<br />
          Link expires in ${LINK_EXPIRY_DAYS} days. You will verify your email before signing.
        </p>
        ${emailFooter()}
      </div>
    `,
  });
  return true;
}

export interface CompletionEmailParams {
  to: string;
  documentName: string;
  signerName: string;
  downloadUrl?: string;
}

export async function sendCompletionEmail(params: CompletionEmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  const { to, documentName, signerName, downloadUrl } = params;
  await resend.emails.send({
    from: fromAddress(),
    to,
    subject: `"${documentName}" has been signed`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#0a1628">Document Signed</h2>
        <p><strong>${signerName}</strong> has signed <strong>${documentName}</strong>.</p>
        ${downloadUrl ? `<p><a href="${downloadUrl}">Download signed PDF</a></p>` : ""}
        <p style="color:#666;font-size:13px">You can also view this in your <a href="${appUrl()}/dashboard">SignToSeal dashboard</a>.</p>
        <p style="color:#999;font-size:12px">Questions? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
    `,
  });
  return true;
}

export async function sendReminderEmail(params: InviteEmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  const from = senderDisplay(params.senderName, params.senderEmail);

  await resend.emails.send({
    from: fromAddress(),
    to: params.recipientEmail,
    subject: `Reminder: please sign "${params.documentName}"`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#0a1628;margin:0 0 16px">SignToSeal</h2>
        <p style="color:#333;line-height:1.5">Hi ${params.recipientName},</p>
        <p style="color:#333;line-height:1.5">
          This is a friendly reminder to sign <strong>"${params.documentName}"</strong> sent by
          <strong>${from}</strong>${params.senderName && params.senderEmail ? ` (${params.senderEmail})` : ""}.
        </p>
        <p style="margin:24px 0">
          <a href="${params.signingUrl}" style="display:inline-block;background:#c9a84c;color:#0a1628;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Sign Now</a>
        </p>
        <p style="color:#666;font-size:13px;line-height:1.5">
          Document: <strong>${params.documentName}</strong><br />
          Link expires in ${LINK_EXPIRY_DAYS} days.
        </p>
        ${emailFooter()}
      </div>
    `,
  });
  return true;
}
