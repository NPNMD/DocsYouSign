import { NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./firebase-admin";

export interface AuthedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  token: DecodedIdToken;
}

/**
 * Verify the Firebase ID token from the Authorization header.
 *
 * Server routes must derive identity from the verified token, never from a
 * client-supplied `userId`/`senderId` in the request body.
 */
export async function verifyRequestAuth(req: Request): Promise<AuthedUser | null> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const idToken = header.slice("Bearer ".length).trim();
  if (!idToken) return null;
  try {
    const token = await adminAuth.verifyIdToken(idToken);
    return {
      uid: token.uid,
      email: (token.email ?? "").toLowerCase(),
      emailVerified: token.email_verified === true,
      token,
    };
  } catch {
    return null;
  }
}

/** Standard 401 response for unauthenticated API requests. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
