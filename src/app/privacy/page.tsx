import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-16 max-w-3xl mx-auto" style={{ background: "var(--cream)" }}>
      <Link href="/" className="text-sm" style={{ color: "var(--navy)" }}>← Back</Link>
      <h1 className="font-display text-3xl font-bold mt-6 mb-6" style={{ color: "var(--navy)" }}>Privacy Policy</h1>
      <div className="prose text-sm space-y-4" style={{ color: "var(--text-muted)" }}>
        <p>Last updated: June 8, 2026</p>
        <p>SignToSeal (&quot;we&quot;) respects your privacy. This policy describes how we collect, use, retain, and protect your information.</p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Data We Collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account: email, display name (Google OAuth), Firebase user ID</li>
          <li>Documents: PDFs and form data you upload or create</li>
          <li>Signatures: drawn, typed, or uploaded images; consent text/version accepted</li>
          <li>Audit trail: timestamps, IP address, user-agent, envelope events</li>
          <li>Billing: plan and usage metadata; payment details handled by Stripe (we do not store card numbers)</li>
        </ul>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>How We Use Data</h2>
        <p>
          To provide electronic signature services, deliver signed PDFs and certificates of completion, send transactional
          emails (invites, reminders, verification links), enforce plan limits, prevent abuse, and comply with legal obligations.
        </p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Subprocessors</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Google Firebase</strong> — authentication, Firestore database, Cloud Storage</li>
          <li><strong>Stripe</strong> — subscription billing and Customer Portal</li>
          <li><strong>Resend</strong> — transactional email delivery</li>
          <li><strong>Sentry</strong> — error monitoring (no document content in error reports by default)</li>
        </ul>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Retention</h2>
        <p>
          Documents and audit records are retained while your account is active and as needed to provide signed copies.
          You may export your data or delete your account from Settings → Account. Deletion removes documents, envelopes,
          and billing metadata associated with your user ID within 30 days, except where retention is required by law.
        </p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Security</h2>
        <p>
          Data is encrypted in transit (HTTPS/TLS). Firebase Storage and Firestore use Google Cloud encryption at rest.
          Signing links use expiring tokens; recipient identity is verified before document access.
        </p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Your Rights</h2>
        <p>
          You may access, export, or delete your account data via in-app settings. EU/UK users may have additional rights
          under GDPR — contact us to exercise them.
        </p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Children</h2>
        <p>SignToSeal is not intended for users under 18.</p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Contact</h2>
        <p>Privacy inquiries: hello@signtoseal.com</p>
      </div>
    </div>
  );
}
