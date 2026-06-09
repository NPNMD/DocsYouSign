import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--cream)" }}>
      <div className="max-w-md w-full p-8 rounded-2xl text-center" style={{ background: "white", border: "1px solid var(--border)" }}>
        <div className="font-display text-5xl font-bold mb-2" style={{ color: "var(--gold)" }}>404</div>
        <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>Page not found</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link href="/dashboard" className="inline-block px-5 py-2.5 rounded-xl font-semibold"
          style={{ background: "var(--gold)", color: "var(--navy)" }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
