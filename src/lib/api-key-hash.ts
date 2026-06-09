import { createHash } from "crypto";

/** Hash an API key for at-rest storage (server + client key creation). */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey.trim()).digest("hex");
}
