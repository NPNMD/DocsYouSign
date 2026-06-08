/** Shared render helpers for template document bodies. */

import type { Template, TemplateRiskLevel } from "./types";

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

export const DEFAULT_TEMPLATE_VERSION = "1.0.0";
export const TEMPLATE_LAST_REVIEWED = "2026-06-05";

export function riskLabel(level: TemplateRiskLevel | undefined): string {
  const risk = level ?? "medium";
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

export function riskTone(level: TemplateRiskLevel | undefined): {
  label: string;
  background: string;
  color: string;
  border: string;
} {
  const risk = level ?? "medium";
  if (risk === "low") {
    return { label: "Low", background: "rgba(26,107,71,0.10)", color: "var(--success)", border: "rgba(26,107,71,0.28)" };
  }
  if (risk === "high") {
    return { label: "High", background: "rgba(139,26,26,0.10)", color: "var(--danger)", border: "rgba(139,26,26,0.28)" };
  }
  if (risk === "restricted") {
    return { label: "Restricted", background: "rgba(10,22,40,0.08)", color: "var(--navy)", border: "rgba(10,22,40,0.24)" };
  }
  return { label: "Medium", background: "rgba(201,168,76,0.14)", color: "var(--navy)", border: "rgba(201,168,76,0.40)" };
}

export function templateWarnings(template: Template): string[] {
  const warnings = [...(template.warnings ?? [])];
  if (template.jurisdictionSensitive) {
    warnings.push("Jurisdiction-sensitive: enforceability and required terms may vary by state or country.");
  }
  if (template.attorneyReviewRecommended) {
    warnings.push("Attorney review is recommended before sending or signing this document.");
  }
  if (template.officialFormSensitive) {
    warnings.push("Official-form-sensitive: confirm the current government or agency version before using for records.");
  }
  return Array.from(new Set(warnings));
}

export function templateFooter(template: Pick<Template, "id" | "version" | "riskLevel" | "lastReviewed">): string {
  return `
    <div class="tpl-footer">
      Stock template ${esc(template.id)} v${esc(template.version ?? DEFAULT_TEMPLATE_VERSION)}.
      Risk: ${esc(riskLabel(template.riskLevel))}.
      Last reviewed: ${esc(template.lastReviewed ?? TEMPLATE_LAST_REVIEWED)}.
      Provided for convenience and general informational purposes only, not legal advice.
    </div>`;
}

export type SignatureRole = "primary" | "counterparty";

/** Placeholder span templates use to mark where a drawn signature should appear. */
export function sigAnchor(role: SignatureRole = "primary"): string {
  return `<span class="tpl-sig-anchor" data-sig-role="${role}"></span>`;
}

const ANCHOR_RE = /<span class="tpl-sig-anchor" data-sig-role="(primary|counterparty)"><\/span>/g;

function signatureMarkup(img: string, name: string, date: string): string {
  return (
    `<span class="tpl-sig">` +
    `<img class="tpl-sig-img" src="${img}" alt="Signature"/>` +
    `<span class="tpl-sig-name">${esc(name)}</span>` +
    `<span class="tpl-sig-date">Signed ${esc(date)}</span>` +
    `</span>`
  );
}

function replaceAnchor(html: string, role: SignatureRole, markup: string): { html: string; replaced: boolean } {
  let replaced = false;
  const next = html.replace(ANCHOR_RE, (match, anchorRole: SignatureRole) => {
    if (anchorRole === role) {
      replaced = true;
      return markup;
    }
    return match;
  });
  return { html: next, replaced };
}

/**
 * Inject a drawn signature into template HTML at the correct signer anchor.
 * Falls back to the primary anchor, then appends a block if no anchors exist.
 */
export function applySignature(
  html: string,
  opts: { img: string; name: string; date: string; role: SignatureRole }
): string {
  const markup = signatureMarkup(opts.img, opts.name, opts.date);
  let out = html;

  const { html: withRole, replaced: roleReplaced } = replaceAnchor(out, opts.role, markup);
  let replaced = roleReplaced;
  out = withRole;
  if (!replaced && opts.role === "counterparty") {
    ({ html: out, replaced } = replaceAnchor(out, "primary", markup));
  }

  if (!replaced && !/<span class="tpl-sig-anchor"/.test(html)) {
    out +=
      `<div class="tpl-section">Electronic Signature</div>` +
      `<div class="tpl-parties"><div>${markup}</div></div>`;
  }

  return out.replace(ANCHOR_RE, "");
}
