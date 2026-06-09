import { NextResponse } from "next/server";
import { getStripe } from "@/lib/billing";
import { verifyRequestAuth, unauthorized } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Open the Stripe Billing Portal so customers can update payment methods,
 * change plans, view invoices, and cancel anytime. No retention dark patterns:
 * cancellation is one click inside Stripe's portal.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "stripe-not-configured" }, { status: 503 });

  const auth = await verifyRequestAuth(req);
  if (!auth) return unauthorized();

  const billingSnap = await adminDb.collection("billing").doc(auth.uid).get();
  const customerId = billingSnap.data()?.stripeCustomerId as string | undefined;
  if (!customerId) {
    return NextResponse.json({ error: "no-subscription" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
