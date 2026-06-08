import { describe, it, expect } from "vitest";
import { buildAuditEntry, extractClientIp } from "../audit";

describe("audit", () => {
  it("builds audit entry with metadata", () => {
    const entry = buildAuditEntry("signed", { ip: "1.2.3.4", userAgent: "Test" });
    expect(entry.event).toBe("signed");
    expect(entry.ip).toBe("1.2.3.4");
    expect(entry.userAgent).toBe("Test");
    expect(entry.at).toBeTruthy();
  });

  it("extracts IP from x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(extractClientIp(headers)).toBe("1.2.3.4");
  });
});
