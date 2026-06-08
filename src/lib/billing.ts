import Stripe from "stripe";
import type { BillingPlan } from "./types";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

export const PLAN_PRICES: Record<Exclude<BillingPlan, "trial">, { amount: number; label: string }> = {
  starter: { amount: 12, label: "Starter" },
  pro: { amount: 24, label: "Pro" },
  team: { amount: 49, label: "Team" },
};

export function planFromStripePriceId(priceId: string): BillingPlan {
  if (priceId === process.env.STRIPE_PRICE_TEAM) return "team";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "starter";
}

export function stripePriceIdForPlan(plan: Exclude<BillingPlan, "trial">): string | undefined {
  const map: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    team: process.env.STRIPE_PRICE_TEAM,
  };
  return map[plan];
}
