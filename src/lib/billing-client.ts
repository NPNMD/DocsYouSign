"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { PLAN_LIMITS } from "./usage";
import type { BillingPlan } from "./types";

export interface BillingView {
  plan: BillingPlan;
  envelopesUsed: number;
  limit: number;
  remaining: number;
  trialEndsAt: Date | null;
  trialDaysLeft: number | null;
  trialExpired: boolean;
  loading: boolean;
}

const DEFAULT: BillingView = {
  plan: "trial",
  envelopesUsed: 0,
  limit: PLAN_LIMITS.trial,
  remaining: PLAN_LIMITS.trial,
  trialEndsAt: null,
  trialDaysLeft: null,
  trialExpired: false,
  loading: true,
};

/** Live, read-only view of the signed-in user's billing record. */
export function useBilling(userId: string | undefined): BillingView {
  // Keyed by userId so a stale subscription result is never shown for a new user
  // and so the no-user case is derived (no synchronous setState in the effect).
  const [snapshot, setSnapshot] = useState<{ id: string; view: BillingView } | null>(null);

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(
      doc(db, "billing", userId),
      (snap) => {
        const data = snap.data();
        const plan = (data?.plan as BillingPlan) ?? "trial";
        const envelopesUsed = (data?.envelopesUsed as number) ?? 0;
        const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.trial;
        const trialEndsAt: Date | null = data?.trialEndsAt?.toDate?.() ?? null;
        const now = Date.now();
        const trialDaysLeft = trialEndsAt
          ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / 86_400_000))
          : null;
        const trialExpired = plan === "trial" && !!trialEndsAt && trialEndsAt.getTime() < now;
        setSnapshot({
          id: userId,
          view: {
            plan,
            envelopesUsed,
            limit,
            remaining: Math.max(0, limit - envelopesUsed),
            trialEndsAt,
            trialDaysLeft,
            trialExpired,
            loading: false,
          },
        });
      },
      () => setSnapshot({ id: userId, view: { ...DEFAULT, loading: false } })
    );
    return unsub;
  }, [userId]);

  if (!userId) return { ...DEFAULT, loading: false };
  if (!snapshot || snapshot.id !== userId) return DEFAULT;
  return snapshot.view;
}

/** Friendly, recoverable copy for send/quota errors returned by the API. */
export function billingErrorMessage(code: string | undefined): string {
  switch (code) {
    case "trial-expired":
      return "Your 7-day free trial has ended. Upgrade a plan to keep sending documents.";
    case "quota-exceeded":
      return "You've used all the envelopes in your current plan this period. Upgrade for a higher limit.";
    case "forbidden":
      return "You don't have permission to send this document.";
    case "unauthorized":
      return "Your session expired. Please sign in again.";
    default:
      return "We couldn't send this document. Please try again.";
  }
}
