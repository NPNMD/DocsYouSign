import type { DocumentField } from "./types";

/** Shared completion contract across owner self-sign and recipient signing paths. */
export interface SigningCompletion {
  documentId: string;
  signerName: string;
  signerEmail: string;
  fields: DocumentField[];
  consentText: string;
  consentVersion: string;
  consentAcceptedAt: string;
  source: "recipient" | "owner_self_sign";
}

export function buildSigningCompletion(input: Omit<SigningCompletion, "consentAcceptedAt"> & { consentAcceptedAt?: string }): SigningCompletion {
  return {
    ...input,
    consentAcceptedAt: input.consentAcceptedAt ?? new Date().toISOString(),
  };
}
