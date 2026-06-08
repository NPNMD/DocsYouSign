"use client";

/**
 * Whitelist-based HTML sanitizer for user-edited document bodies.
 * Edited content is stored and later rendered (including to recipients) via
 * dangerouslySetInnerHTML, so we strip scripts, styles, event handlers, and
 * any non-whitelisted tags/attributes before persisting and before rendering.
 */

const ALLOWED_TAGS = new Set([
  "H1", "H2", "H3", "H4", "P", "STRONG", "EM", "B", "I", "U",
  "BR", "DIV", "SPAN", "UL", "OL", "LI", "BLOCKQUOTE", "HR",
]);
const ALLOWED_ATTRS = new Set(["class"]);

function sanitizeNode(node: Node): void {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.COMMENT_NODE) { child.remove(); return; }
    if (child.nodeType !== Node.ELEMENT_NODE) return; // text nodes are fine
    const el = child as HTMLElement;
    const tag = el.tagName.toUpperCase();
    if (tag === "SCRIPT" || tag === "STYLE") { el.remove(); return; }
    // Clean descendants first so unwrapped children are already safe.
    sanitizeNode(el);
    if (!ALLOWED_TAGS.has(tag)) {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    } else {
      Array.from(el.attributes).forEach((attr) => {
        if (!ALLOWED_ATTRS.has(attr.name.toLowerCase())) el.removeAttribute(attr.name);
      });
    }
  });
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    // SSR fallback: strip the dangerous bits with regex.
    return html
      .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/javascript:/gi, "");
  }
  const doc = new DOMParser().parseFromString(`<body><div id="__r">${html}</div></body>`, "text/html");
  const root = doc.getElementById("__r");
  if (!root) return "";
  sanitizeNode(root);
  return root.innerHTML;
}
