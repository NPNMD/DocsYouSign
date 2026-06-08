import { createHash, randomBytes } from "crypto";

const TOKEN_BYTES = 24;
export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Generate a cryptographically secure signing token. */
export function generateSigningToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

/** SHA-256 hash of a raw token for storage. */
export function hashSigningToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Check whether a signing request has expired. */
export function isTokenExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return d.getTime() < Date.now();
}

/** Compute expiration date from now. */
export function tokenExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + TOKEN_TTL_MS);
}
