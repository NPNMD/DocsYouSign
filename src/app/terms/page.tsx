import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-16 max-w-3xl mx-auto" style={{ background: "var(--cream)" }}>
      <Link href="/" className="text-sm" style={{ color: "var(--navy)" }}>← Back</Link>
      <h1 className="font-display text-3xl font-bold mt-6 mb-6" style={{ color: "var(--navy)" }}>Terms of Service</h1>
      <div className="prose text-sm space-y-4" style={{ color: "var(--text-muted)" }}>
        <p>Last updated: June 8, 2026</p>
        <p>SignToSeal provides electronic signature services. By using our service, you agree to these terms.</p>
        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Electronic Signatures</h2>
        <p>By signing documents through SignToSeal, you consent to electronic signatures under the ESIGN Act and UETA. You agree your electronic signature is legally binding to the same extent as a handwritten signature.</p>
        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Templates</h2>
        <p>Stock templates are provided for convenience and do not constitute legal advice. Consult a licensed attorney before using any template for legal purposes.</p>
        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Subscriptions</h2>
        <p>Paid plans are billed monthly. You may cancel at any time through the billing portal. Trial users receive 3 envelopes or 7 days, whichever comes first.</p>
        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Contact</h2>
        <p>hello@signtoseal.com</p>
      </div>
    </div>
  );
}
