"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/lib/billing-client";

const PLAN_LABEL: Record<string, string> = {
  trial: "Free trial",
  starter: "Starter",
  pro: "Pro",
  team: "Team",
};

/**
 * Always-visible, honest billing summary: current plan, envelopes remaining,
 * trial countdown, upgrade CTA, and one-click "Manage billing" (cancel anytime).
 */
export default function BillingBanner() {
  const { user, authedFetch } = useAuth();
  const billing = useBilling(user?.uid);
  const [opening, setOpening] = useState(false);

  if (billing.loading) return null;

  const usedRatio = billing.limit > 0 ? billing.envelopesUsed / billing.limit : 0;
  const low = billing.remaining <= 1;
  const blocked = billing.trialExpired || billing.remaining <= 0;

  const openPortal = async () => {
    setOpening(true);
    try {
      const res = await authedFetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) window.location.href = data.url;
    } finally {
      setOpening(false);
    }
  };

  const accent = blocked ? "var(--danger)" : low ? "var(--gold)" : "var(--border)";

  return (
    <div className="rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2"
      style={{ background: "white", border: `1px solid ${accent}` }}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded"
          style={{ background: "rgba(10,22,40,0.06)", color: "var(--navy)" }}>
          {PLAN_LABEL[billing.plan] ?? billing.plan}
        </span>
        {billing.plan === "trial" && billing.trialDaysLeft !== null && !billing.trialExpired && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {billing.trialDaysLeft} day{billing.trialDaysLeft === 1 ? "" : "s"} left
          </span>
        )}
      </div>

      <div className="flex-1 min-w-[180px]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold" style={{ color: "var(--navy)" }}>
            {billing.envelopesUsed} / {billing.limit} envelopes used
          </span>
          {billing.remaining > 0 && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{billing.remaining} left</span>
          )}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(10,22,40,0.08)" }}>
          <div className="h-full rounded-full" style={{
            width: `${Math.min(100, usedRatio * 100)}%`,
            background: blocked ? "var(--danger)" : low ? "var(--gold)" : "var(--navy)",
          }} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {billing.plan !== "team" && (
          <Link href="/pricing" className="text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ background: "var(--gold)", color: "var(--navy)" }}>
            {blocked ? "Upgrade to continue" : "Upgrade"}
          </Link>
        )}
        {billing.plan !== "trial" && (
          <button onClick={openPortal} disabled={opening}
            className="text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
            style={{ background: "white", color: "var(--navy)", border: "1px solid var(--border)" }}>
            {opening ? "Opening…" : "Manage billing"}
          </button>
        )}
      </div>

      {blocked && (
        <p className="w-full text-xs" style={{ color: "var(--danger)" }}>
          {billing.trialExpired
            ? "Your free trial has ended. Upgrade to keep sending documents."
            : "You've reached your plan limit for this period. Upgrade for more envelopes."}
        </p>
      )}
    </div>
  );
}
