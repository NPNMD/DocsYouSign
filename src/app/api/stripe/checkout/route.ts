import { NextResponse } from "next/server";
import { getStripe, stripePriceIdForPlan } from "@/lib/billing";
import type { BillingPlan } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "stripe-not-configured" }, { status: 503 });

  let body: { plan?: Exclude<BillingPlan, "trial">; userId?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const { plan, userId, email } = body;
  if (!plan || !userId || !email) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  const priceId = stripePriceIdForPlan(plan);
  if (!priceId) return NextResponse.json({ error: "price-not-configured" }, { status: 503 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancel`,
    metadata: { userId, plan },
  });

  return NextResponse.json({ url: session.url });
}
