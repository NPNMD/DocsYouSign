/** Shared render helpers for template document bodies. */

export function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Render a value, or a highlighted placeholder when empty. */
export function fill(val: string | undefined, placeholder = "[———]"): string {
  const v = (val ?? "").trim();
  return `<span class="tpl-fill">${v ? esc(v) : placeholder}</span>`;
}

export function today(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
