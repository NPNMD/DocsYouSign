"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const PLANS = [
  { id: "starter", name: "Starter", price: 12, envelopes: 15, seats: 1, features: ["PDF + form sending", "Email delivery", "Signed PDF download", "40+ templates"] },
  { id: "pro", name: "Pro", price: 24, envelopes: 50, seats: 1, features: ["Everything in Starter", "Multi-signer", "Reminders", "Custom templates", "Branded emails"] },
  { id: "team", name: "Team", price: 49, envelopes: 150, seats: 5, features: ["Everything in Pro", "Shared workspace", "Team roles", "API access", "Webhooks"] },
] as const;

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const checkout = async (plan: string) => {
    if (!user) { router.push("/"); return; }
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId: user.uid, email: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: "var(--cream)" }}>
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-sm" style={{ color: "var(--navy)" }}>← Back</Link>
        <h1 className="font-display text-4xl font-bold mt-6 mb-2" style={{ color: "var(--navy)" }}>Simple pricing</h1>
        <p className="mb-10" style={{ color: "var(--text-muted)" }}>7-day free trial · 3 envelopes · No credit card to start</p>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <div key={p.id} className="p-6 rounded-2xl" style={{ background: "white", border: "1px solid var(--border)" }}>
              <h2 className="font-display text-xl font-bold" style={{ color: "var(--navy)" }}>{p.name}</h2>
              <p className="text-3xl font-bold my-3" style={{ color: "var(--gold)" }}>${p.price}<span className="text-sm font-normal">/mo</span></p>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{p.envelopes} envelopes · {p.seats} seat{p.seats > 1 ? "s" : ""}</p>
              <ul className="text-sm space-y-2 mb-6">
                {p.features.map((f) => <li key={f} style={{ color: "var(--navy)" }}>✓ {f}</li>)}
              </ul>
              <button onClick={() => checkout(p.id)} disabled={loading === p.id}
                className="w-full py-3 rounded-xl font-semibold disabled:opacity-50"
                style={{ background: "var(--navy)", color: "var(--gold)" }}>
                {loading === p.id ? "Loading…" : "Subscribe"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
