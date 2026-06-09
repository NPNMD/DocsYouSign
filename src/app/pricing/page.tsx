"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/lib/billing-client";
import Link from "next/link";

const PLANS = [
  { id: "starter", name: "Starter", price: 12, envelopes: 15, seats: 1, features: ["PDF + form sending", "Email delivery", "Signed PDF download", "40+ templates", "No surprise overages"] },
  { id: "pro", name: "Pro", price: 24, envelopes: 50, seats: 1, features: ["Everything in Starter", "Multi-signer", "Reminders", "Custom templates", "Branded emails"] },
  { id: "team", name: "Team", price: 49, envelopes: 150, seats: 5, features: ["Everything in Pro", "Shared workspace", "Team roles", "API access", "Webhooks"] },
] as const;

export default function PricingPage() {
  const { user, authedFetch } = useAuth();
  const billing = useBilling(user?.uid);
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const checkout = async (plan: string) => {
    if (!user) { router.push("/"); return; }
    setLoading(plan);
    try {
      const res = await authedFetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await authedFetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: "var(--cream)" }}>
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="text-sm" style={{ color: "var(--navy)" }}>← Dashboard</Link>
        <h1 className="font-display text-4xl font-bold mt-6 mb-2" style={{ color: "var(--navy)" }}>Simple pricing</h1>
        <p className="mb-4" style={{ color: "var(--text-muted)" }}>
          7-day free trial · 3 envelopes · No credit card to start · <strong>No automatic overage charges</strong>
        </p>
        {!billing.loading && user && (
          <div className="mb-8 p-4 rounded-xl flex flex-wrap items-center gap-4" style={{ background: "white", border: "1px solid var(--border)" }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>
                Current plan: {billing.plan === "trial" ? "Free trial" : billing.plan}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {billing.envelopesUsed} / {billing.limit} envelopes used · {billing.remaining} remaining
              </p>
            </div>
            {billing.plan !== "trial" && (
              <button onClick={openPortal} disabled={portalLoading}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--navy)", color: "var(--gold)" }}>
                {portalLoading ? "Opening…" : "Manage billing & cancel"}
              </button>
            )}
            <Link href="/settings/account" className="text-xs underline" style={{ color: "var(--navy)" }}>Export or delete data</Link>
          </div>
        )}
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <div key={p.id} className="p-6 rounded-2xl relative" style={{
              background: "white",
              border: billing.plan === p.id ? "2px solid var(--gold)" : "1px solid var(--border)",
            }}>
              {billing.plan === p.id && (
                <span className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded" style={{ background: "var(--gold)", color: "var(--navy)" }}>Current</span>
              )}
              <h2 className="font-display text-xl font-bold" style={{ color: "var(--navy)" }}>{p.name}</h2>
              <p className="text-3xl font-bold my-3" style={{ color: "var(--gold)" }}>${p.price}<span className="text-sm font-normal">/mo</span></p>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{p.envelopes} envelopes/mo · {p.seats} seat{p.seats > 1 ? "s" : ""}</p>
              <ul className="text-sm space-y-2 mb-6">
                {p.features.map((f) => <li key={f} style={{ color: "var(--navy)" }}>✓ {f}</li>)}
              </ul>
              <button onClick={() => checkout(p.id)} disabled={loading === p.id || billing.plan === p.id}
                className="w-full py-3 rounded-xl font-semibold disabled:opacity-50"
                style={{ background: "var(--navy)", color: "var(--gold)" }}>
                {loading === p.id ? "Loading…" : billing.plan === p.id ? "Current plan" : "Subscribe"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
