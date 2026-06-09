import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-16 max-w-3xl mx-auto" style={{ background: "var(--cream)" }}>
      <Link href="/" className="text-sm" style={{ color: "var(--navy)" }}>← Back</Link>
      <h1 className="font-display text-3xl font-bold mt-6 mb-6" style={{ color: "var(--navy)" }}>Terms of Service</h1>
      <div className="prose text-sm space-y-4" style={{ color: "var(--text-muted)" }}>
        <p>Last updated: June 8, 2026</p>
        <p>SignToSeal (&quot;we&quot;, &quot;us&quot;) provides electronic signature services. By using our service, you agree to these terms.</p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Electronic Signatures</h2>
        <p>
          By signing documents through SignToSeal, you consent to electronic signatures under the ESIGN Act (15 U.S.C. § 7001)
          and the Uniform Electronic Transactions Act (UETA) where applicable. You agree your electronic signature is legally
          binding to the same extent as a handwritten signature. We record the consent text shown, timestamp, signer identity,
          and audit metadata with each signature.
        </p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Templates</h2>
        <p>Stock templates are provided for convenience and do not constitute legal advice. Consult a licensed attorney before using any template for legal purposes.</p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Subscriptions & Billing</h2>
        <p>
          Paid plans are billed monthly through Stripe. Trial users receive 3 envelopes or 7 days, whichever comes first.
          We do <strong>not</strong> charge automatic overage fees — sending stops at your plan limit until you upgrade.
          Cancel anytime via Manage Billing in the app (Stripe Customer Portal). No hidden renewal traps.
        </p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Subprocessors</h2>
        <p>We use Google Firebase (auth, database, storage), Stripe (payments), and Resend (email delivery) to operate the service.</p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Limitation of Liability</h2>
        <p>
          SignToSeal is provided &quot;as is.&quot; We are not liable for disputes between signing parties regarding the content
          or enforceability of documents. Maximum liability is limited to fees paid in the prior 12 months.
        </p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Governing Law</h2>
        <p>These terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles.</p>

        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Contact</h2>
        <p>hello@signtoseal.com</p>
      </div>
    </div>
  );
}
