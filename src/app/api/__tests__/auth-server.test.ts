import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
}));

import { adminAuth } from "@/lib/firebase-admin";
import { verifyRequestAuth, unauthorized } from "@/lib/auth-server";

const mockVerifyIdToken = vi.mocked(adminAuth.verifyIdToken);

function authedRequest(token: string): Request {
  return new Request("http://localhost/api/test", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe("auth-server", () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  describe("verifyRequestAuth", () => {
    it("returns null when Authorization header is missing", async () => {
      const req = new Request("http://localhost/api/test");
      await expect(verifyRequestAuth(req)).resolves.toBeNull();
    });

    it("returns null when Bearer token is empty", async () => {
      const req = new Request("http://localhost/api/test", {
        headers: { Authorization: "Bearer " },
      });
      await expect(verifyRequestAuth(req)).resolves.toBeNull();
    });

    it("returns null when verifyIdToken throws", async () => {
      mockVerifyIdToken.mockRejectedValue(new Error("invalid token"));
      await expect(verifyRequestAuth(authedRequest("bad-token"))).resolves.toBeNull();
    });

    it("returns AuthedUser when token is valid", async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: "user-123",
        email: "Alice@Example.com",
        email_verified: true,
      } as Awaited<ReturnType<typeof adminAuth.verifyIdToken>>);

      const user = await verifyRequestAuth(authedRequest("valid-token"));
      expect(user).toEqual({
        uid: "user-123",
        email: "alice@example.com",
        emailVerified: true,
        token: expect.objectContaining({ uid: "user-123" }),
      });
      expect(mockVerifyIdToken).toHaveBeenCalledWith("valid-token");
    });
  });

  describe("unauthorized", () => {
    it("returns 401 JSON response", async () => {
      const res = unauthorized();
      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
    });
  });
});
