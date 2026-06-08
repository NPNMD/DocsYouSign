import { Resend } from "resend";

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

export interface InviteEmailParams {
  recipientEmail: string;
  recipientName: string;
  senderEmail: string;
  documentName: string;
  signingUrl: string;
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping invite email");
    return false;
  }
  const { recipientEmail, recipientName, senderEmail, documentName, signingUrl } = params;
  await resend.emails.send({
    from: fromAddress(),
    to: recipientEmail,
    subject: `${senderEmail} sent you "${documentName}" to sign`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#0a1628">SignToSeal</h2>
        <p>Hi ${recipientName},</p>
        <p><strong>${senderEmail}</strong> has sent you <strong>${documentName}</strong> to review and sign.</p>
        <p><a href="${signingUrl}" style="display:inline-block;background:#c9a84c;color:#0a1628;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Review &amp; Sign Document</a></p>
        <p style="color:#666;font-size:13px">This link expires in 30 days. You will verify your email before signing.</p>
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
      </div>
    `,
  });
  return true;
}

export async function sendReminderEmail(params: InviteEmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  await resend.emails.send({
    from: fromAddress(),
    to: params.recipientEmail,
    subject: `Reminder: please sign "${params.documentName}"`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <p>Hi ${params.recipientName},</p>
        <p>This is a reminder to sign <strong>${params.documentName}</strong> from ${params.senderEmail}.</p>
        <p><a href="${params.signingUrl}" style="display:inline-block;background:#c9a84c;color:#0a1628;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Sign Now</a></p>
      </div>
    `,
  });
  return true;
}
