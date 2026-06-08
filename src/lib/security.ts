const rateBuckets = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

/** Simple in-memory rate limiter keyed by IP + route. */
export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }
  if (bucket.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true };
}

/** Normalize email for comparison. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Validate recipient email matches the signing request. */
export function recipientEmailMatches(
  expected: string,
  provided: string | undefined | null
): boolean {
  if (!provided) return false;
  return normalizeEmail(expected) === normalizeEmail(provided);
}
