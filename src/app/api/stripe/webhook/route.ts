import { NextResponse } from "next/server";
import { getStripe, planFromStripePriceId } from "@/lib/billing";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing-signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const plan = (session.metadata?.plan ?? "starter") as string;
    if (userId) {
      await adminDb.collection("billing").doc(userId).set({
        userId,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        plan,
        envelopesUsed: 0,
        periodStart: Timestamp.now(),
      }, { merge: true });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    const priceId = sub.items.data[0]?.price?.id;
    if (userId && priceId) {
      await adminDb.collection("billing").doc(userId).set({
        plan: planFromStripePriceId(priceId),
        stripeSubscriptionId: sub.id,
        periodEnd: Timestamp.fromMillis(
          ((sub as unknown as { current_period_end?: number }).current_period_end ?? Date.now() / 1000) * 1000
        ),
      }, { merge: true });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) {
      await adminDb.collection("billing").doc(userId).set({ plan: "trial", stripeSubscriptionId: null }, { merge: true });
    }
  }

  return NextResponse.json({ received: true });
}
