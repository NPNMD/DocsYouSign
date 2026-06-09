import { adminDb } from "./firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const WINDOW_MS = 60_000;
const DEFAULT_MAX = 30;

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

/**
 * Distributed rate limiter backed by Firestore.
 * Works across App Hosting instances and cold starts.
 */
export async function checkRateLimitDistributed(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = WINDOW_MS
): Promise<RateLimitResult> {
  const ref = adminDb.collection("rateLimits").doc(key.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 200));
  const now = Date.now();

  try {
    return await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data();
      const resetAt = (data?.resetAt as Timestamp | undefined)?.toMillis?.() ?? 0;
      const count = (data?.count as number) ?? 0;

      if (!snap.exists || now > resetAt) {
        tx.set(ref, {
          count: 1,
          resetAt: Timestamp.fromMillis(now + windowMs),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { allowed: true };
      }

      if (count >= max) {
        return { allowed: false, retryAfterMs: Math.max(0, resetAt - now) };
      }

      tx.update(ref, { count: count + 1, updatedAt: FieldValue.serverTimestamp() });
      return { allowed: true };
    });
  } catch {
    // Fail open if Firestore is unavailable so signing is not blocked entirely.
    return { allowed: true };
  }
}
