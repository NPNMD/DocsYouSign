import { URL } from "url";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

/** Block SSRF: only public HTTPS webhook URLs. */
export function isAllowedWebhookUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    if (BLOCKED_HOSTS.has(u.hostname)) return false;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
