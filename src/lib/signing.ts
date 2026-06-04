"use client";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { auth } from "./firebase";

/**
 * Passwordless email-link verification for document recipients.
 *
 * Firebase's email sign-in link doubles as (a) the invitation email and
 * (b) the identity check — the recipient proves control of their email by
 * clicking it. No password, no account setup.
 *
 * Console requirement (one-time): Authentication → Sign-in method →
 * enable "Email link (passwordless sign-in)", and add your App Hosting
 * domain under Authentication → Settings → Authorized domains.
 */

const EMAIL_KEY = "dys_signing_email";

function originBase(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Send the recipient a secure sign-in link that returns them to the signing page. */
export async function sendSigningInvite(
  recipientEmail: string,
  token: string
): Promise<string> {
  const email = recipientEmail.trim().toLowerCase();
  const url = `${originBase()}/sign-request?token=${token}&e=${encodeURIComponent(email)}`;
  await sendSignInLinkToEmail(auth, email, { url, handleCodeInApp: true });
  if (typeof window !== "undefined") window.localStorage.setItem(EMAIL_KEY, email);
  return url; // also returned so the sender can copy/share it directly
}

export function isEmailSignInLink(href: string): boolean {
  return isSignInWithEmailLink(auth, href);
}

/** Complete passwordless sign-in from the link the recipient clicked. */
export async function completeEmailSignIn(email: string, href: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  await signInWithEmailLink(auth, clean, href);
  if (typeof window !== "undefined") window.localStorage.removeItem(EMAIL_KEY);
}

export function rememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(EMAIL_KEY) ?? "";
}
