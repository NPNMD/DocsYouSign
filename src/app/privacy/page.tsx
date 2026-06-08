import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-16 max-w-3xl mx-auto" style={{ background: "var(--cream)" }}>
      <Link href="/" className="text-sm" style={{ color: "var(--navy)" }}>← Back</Link>
      <h1 className="font-display text-3xl font-bold mt-6 mb-6" style={{ color: "var(--navy)" }}>Privacy Policy</h1>
      <div className="prose text-sm space-y-4" style={{ color: "var(--text-muted)" }}>
        <p>Last updated: June 8, 2026</p>
        <p>SignToSeal respects your privacy. This policy describes how we collect, use, and protect your information.</p>
        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Data We Collect</h2>
        <p>Account information (email, name via Google sign-in), documents you upload, signature images, audit trail data (IP address, timestamps, user-agent), and billing information processed by Stripe.</p>
        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>How We Use Data</h2>
        <p>To provide e-signature services, generate signed PDFs and certificates of completion, send transactional emails, and process payments.</p>
        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Storage</h2>
        <p>Documents are stored in Firebase Storage. Audit records are stored in Firestore. We do not sell your data.</p>
        <h2 className="font-bold text-base" style={{ color: "var(--navy)" }}>Contact</h2>
        <p>hello@signtoseal.com</p>
      </div>
    </div>
  );
}
