import { checkRateLimitDistributed } from "./rate-limit-firestore";

export { hashApiKey } from "./api-key-hash";
const MAX_REQUESTS = 30;

/** Distributed Firestore-backed rate limiter for production API routes. */
export async function checkRateLimit(
  key: string,
  max: number = MAX_REQUESTS
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  return checkRateLimitDistributed(key, max, WINDOW_MS);
}


const WINDOW_MS = 60_000;
const MAX_SIGNATURE_DATA_URL_BYTES = 1_500_000; // ~1.5MB encoded PNG ceiling

/** Validate a signature/initials data URL: must be a PNG/JPEG image and within size bounds. */
export function isValidSignatureDataUrl(value: string): boolean {
  if (!value.startsWith("data:image/png") && !value.startsWith("data:image/jpeg")) {
    return false;
  }
  if (value.length > MAX_SIGNATURE_DATA_URL_BYTES) return false;
  return true;
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
