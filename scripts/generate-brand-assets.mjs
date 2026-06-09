#!/usr/bin/env node
/**
 * Generate SignToSeal brand PNG assets from an SVG template.
 * Run: node scripts/generate-brand-assets.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dir, "..", "public");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0a1628"/>
  <rect x="96" y="120" width="320" height="400" rx="16" fill="#faf7f0"/>
  <path d="M140 360 L220 280 L300 340 L380 220" stroke="#c9a84c" stroke-width="28" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="256" y="200" text-anchor="middle" font-family="Georgia,serif" font-size="72" font-weight="700" fill="#0a1628">S</text>
</svg>`;

mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, "icon.svg"), svg);
writeFileSync(join(publicDir, "favicon.svg"), svg);

try {
  const sharp = (await import("sharp")).default;
  const buf = Buffer.from(svg);
  const sizes = [
    ["favicon-16x16.png", 16],
    ["favicon-32x32.png", 32],
    ["apple-touch-icon.png", 180],
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["og-image.png", 1200],
  ];
  for (const [name, size] of sizes) {
    const h = name === "og-image.png" ? 630 : size;
    await sharp(buf)
      .resize(size, h, { fit: "contain", background: "#0a1628" })
      .png()
      .toFile(join(publicDir, name));
  }
  console.log("Generated PNG brand assets with sharp.");
} catch {
  console.warn("sharp not installed — SVG icons written; run: npm i -D sharp && node scripts/generate-brand-assets.mjs");
}
