import { describe, it, expect } from "vitest";
import {
  hashApiKey,
  isValidSignatureDataUrl,
  recipientEmailMatches,
} from "../security";

describe("security", () => {
  describe("hashApiKey", () => {
    it("hashes deterministically", () => {
      expect(hashApiKey("sk_test_abc")).toBe(hashApiKey("sk_test_abc"));
    });

    it("trims whitespace before hashing", () => {
      expect(hashApiKey("  sk_test_abc  ")).toBe(hashApiKey("sk_test_abc"));
    });

    it("produces different hashes for different keys", () => {
      expect(hashApiKey("key-a")).not.toBe(hashApiKey("key-b"));
    });
  });

  describe("isValidSignatureDataUrl", () => {
    it("accepts PNG data URLs", () => {
      expect(isValidSignatureDataUrl("data:image/png;base64,abc")).toBe(true);
    });

    it("accepts JPEG data URLs", () => {
      expect(isValidSignatureDataUrl("data:image/jpeg;base64,abc")).toBe(true);
    });

    it("rejects non-image data URLs", () => {
      expect(isValidSignatureDataUrl("data:text/plain,hello")).toBe(false);
      expect(isValidSignatureDataUrl("https://example.com/sig.png")).toBe(false);
    });

    it("rejects oversized payloads", () => {
      const huge = "data:image/png;base64," + "a".repeat(1_500_001);
      expect(isValidSignatureDataUrl(huge)).toBe(false);
    });
  });

  describe("recipientEmailMatches", () => {
    it("matches case-insensitively with trimming", () => {
      expect(recipientEmailMatches("  Alice@Example.COM ", "alice@example.com")).toBe(true);
    });

    it("returns false when provided email is missing", () => {
      expect(recipientEmailMatches("alice@example.com", undefined)).toBe(false);
      expect(recipientEmailMatches("alice@example.com", null)).toBe(false);
      expect(recipientEmailMatches("alice@example.com", "")).toBe(false);
    });

    it("returns false when emails differ", () => {
      expect(recipientEmailMatches("alice@example.com", "bob@example.com")).toBe(false);
    });
  });
});
