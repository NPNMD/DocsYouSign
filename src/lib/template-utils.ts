/** Shared render helpers for template document bodies. */

export function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render a filled value (highlighted), or graceful fallback when empty:
 *  - a bracketed placeholder like "[Address]" → a clean blank underline
 *  - a natural-language fallback like "Net 30" → rendered as plain text
 * This keeps signed documents free of "[Bracket]" artifacts when optional
 * fields are left blank.
 */
export function fill(val: string | undefined, placeholder = "[———]"): string {
  const v = (val ?? "").trim();
  if (v) return `<span class="tpl-fill">${esc(v)}</span>`;
  if (placeholder.startsWith("[")) return `<span class="tpl-blank"></span>`;
  return esc(placeholder);
}

export function today(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Resolve a select that may be set to "Other": returns the typed companion
 * value (stored under `${key}Other`) when the select is "Other", otherwise the
 * select value itself.
 */
export function pick(v: Record<string, string>, key: string): string {
  const raw = (v[key] ?? "").trim();
  return raw === "Other" ? (v[`${key}Other`] ?? "").trim() : raw;
}
