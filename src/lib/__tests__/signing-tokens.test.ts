import { describe, it, expect } from "vitest";
import {
  generateSigningToken,
  hashSigningToken,
  isTokenExpired,
  tokenExpiresAt,
  TOKEN_TTL_MS,
} from "../signing-tokens";

describe("signing-tokens", () => {
  it("generates unique tokens", () => {
    const a = generateSigningToken();
    const b = generateSigningToken();
    expect(a).not.toBe(b);
    expect(a.length).toBe(48);
  });

  it("hashes tokens deterministically", () => {
    const token = "abc123";
    expect(hashSigningToken(token)).toBe(hashSigningToken(token));
    expect(hashSigningToken(token)).not.toBe(token);
  });

  it("detects expired tokens", () => {
    const past = new Date(Date.now() - 1000);
    expect(isTokenExpired(past)).toBe(true);
    const future = new Date(Date.now() + TOKEN_TTL_MS);
    expect(isTokenExpired(future)).toBe(false);
  });

  it("computes expiration 30 days out", () => {
    const now = new Date();
    const exp = tokenExpiresAt(now);
    expect(exp.getTime() - now.getTime()).toBe(TOKEN_TTL_MS);
  });
});
