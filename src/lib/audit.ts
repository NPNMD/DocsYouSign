import type { SigningAuditEntry } from "./types";

export type AuditEventType = SigningAuditEntry["event"] | "consent" | "voided" | "declined" | "reminded";

export interface AuditMeta {
  ip?: string;
  userAgent?: string;
  email?: string;
}

/** Extract client IP from request headers (App Hosting / proxies). */
export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "";
  return headers.get("x-real-ip") ?? "";
}

/** Build a serializable audit entry for Firestore. */
export function buildAuditEntry(
  event: AuditEventType,
  meta?: AuditMeta
): { event: string; at: string; ip?: string; userAgent?: string; email?: string } {
  const entry: { event: string; at: string; ip?: string; userAgent?: string; email?: string } = {
    event,
    at: new Date().toISOString(),
  };
  if (meta?.ip) entry.ip = meta.ip;
  if (meta?.userAgent) entry.userAgent = meta.userAgent;
  if (meta?.email) entry.email = meta.email;
  return entry;
}
