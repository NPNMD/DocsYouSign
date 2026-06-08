import { createHmac, randomBytes } from "crypto";
import { adminDb } from "./firebase-admin";
import type { WebhookEvent } from "./types";

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

export function signWebhookPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Dispatch webhook events to subscribed endpoints. */
export async function dispatchWebhook(
  userId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const subs = await adminDb
    .collection("webhookSubscriptions")
    .where("userId", "==", userId)
    .get();

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

  for (const doc of subs.docs) {
    const sub = doc.data();
    if (!(sub.events as WebhookEvent[]).includes(event)) continue;
    const signature = signWebhookPayload(sub.secret, body);
    try {
      await fetch(sub.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SignToSeal-Signature": signature,
        },
        body,
      });
    } catch (e) {
      console.error(`Webhook dispatch failed for ${sub.url}:`, e);
    }
  }
}
