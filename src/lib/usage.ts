import type { BillingPlan } from "./types";

export const PLAN_LIMITS: Record<BillingPlan, number> = {
  trial: 3,
  starter: 15,
  pro: 50,
  team: 150,
};

export const TRIAL_DAYS = 7;

/** Check if user can send another envelope. */
export function canSendEnvelope(
  plan: BillingPlan,
  envelopesUsed: number,
  trialEndsAt: Date | null
): { allowed: boolean; reason?: string } {
  if (plan === "trial" && trialEndsAt && trialEndsAt.getTime() < Date.now()) {
    return { allowed: false, reason: "trial-expired" };
  }
  const limit = PLAN_LIMITS[plan];
  if (envelopesUsed >= limit) {
    return { allowed: false, reason: "quota-exceeded" };
  }
  return { allowed: true };
}

/** Compute trial end date from account creation. */
export function trialEndDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}
