import { describe, it, expect } from "vitest";
import { canSendEnvelope, PLAN_LIMITS } from "../usage";

describe("usage", () => {
  it("allows sending within trial quota", () => {
    const future = new Date(Date.now() + 86400000);
    expect(canSendEnvelope("trial", 2, future).allowed).toBe(true);
  });

  it("blocks when trial quota exceeded", () => {
    const future = new Date(Date.now() + 86400000);
    expect(canSendEnvelope("trial", PLAN_LIMITS.trial, future).allowed).toBe(false);
  });

  it("blocks expired trial", () => {
    const past = new Date(Date.now() - 1000);
    expect(canSendEnvelope("trial", 0, past).reason).toBe("trial-expired");
  });
});
