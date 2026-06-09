import { createHmac, randomBytes } from "crypto";
import { adminDb } from "./firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { WebhookEvent } from "./types";
import { isAllowedWebhookUrl } from "./webhook-security";
import { logApi } from "./api-logger";

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

export function signWebhookPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Queue webhook for retry if immediate delivery fails. */
async function enqueueWebhookRetry(
  userId: string,
  url: string,
  event: WebhookEvent,
  body: string,
  signature: string,
  attempt: number
): Promise<void> {
  await adminDb.collection("webhookOutbox").add({
    userId,
    url,
    event,
    body,
    signature,
    attempt,
    nextAttemptAt: Timestamp.fromMillis(Date.now() + Math.min(attempt * 60_000, 900_000)),
    createdAt: Timestamp.now(),
    status: "pending",
  });
}

/** Dispatch webhook events to subscribed endpoints with SSRF guard and outbox retry. */
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
    const url = sub.url as string;
    if (!isAllowedWebhookUrl(url)) {
      logApi({ route: "webhooks", message: "blocked-url", level: "warn", userId, meta: { url } });
      continue;
    }
    const signature = signWebhookPayload(sub.secret, body);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SignToSeal-Signature": signature,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        await enqueueWebhookRetry(userId, url, event, body, signature, 1);
      }
    } catch (e) {
      logApi({
        route: "webhooks",
        message: "dispatch-failed",
        level: "error",
        userId,
        error: e instanceof Error ? e.message : "unknown",
      });
      await enqueueWebhookRetry(userId, url, event, body, signature, 1);
    }
  }
}
