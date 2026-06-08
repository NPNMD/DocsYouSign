import { describe, expect, it } from "vitest";
import {
  buildAttentionItems,
  filterDocumentsForWorkspace,
  suggestDocumentName,
} from "../workspace";
import type { Document } from "../types";

const baseDoc: Document = {
  id: "doc-1",
  name: "Acme NDA.pdf",
  ownerId: "user-1",
  ownerEmail: "owner@example.com",
  status: "draft",
  fields: [],
  createdAt: new Date("2026-06-01T12:00:00Z"),
  updatedAt: new Date("2026-06-01T12:00:00Z"),
  kind: "pdf",
};

describe("workspace helpers", () => {
  it("builds attention items for drafts, ready documents, sent documents, and completed downloads", () => {
    const items = buildAttentionItems([
      baseDoc,
      { ...baseDoc, id: "doc-2", status: "prepared", fields: [{ id: "f1", type: "signature", page: 1, x: 1, y: 1, width: 10, height: 5 }] },
      { ...baseDoc, id: "doc-3", status: "sent", signingRequestId: "token", pendingSignerEmail: "signer@example.com" },
      { ...baseDoc, id: "doc-4", status: "completed", signedPdfUrl: "https://example.com/signed.pdf" },
    ]);

    expect(items.map((item) => item.kind)).toEqual(["needs-fields", "ready-to-send", "awaiting-signer", "ready-to-download"]);
  });

  it("filters documents by project, status, signer, and search query", () => {
    const docs = [
      { ...baseDoc, projectId: "project-a", status: "sent" as const, pendingSignerEmail: "legal@acme.com" },
      { ...baseDoc, id: "doc-2", name: "Beta Lease.pdf", projectId: "project-b", status: "signed" as const, pendingSignerEmail: "tenant@beta.com" },
    ];

    const result = filterDocumentsForWorkspace(docs, {
      projectId: "project-a",
      status: "sent",
      query: "legal",
      sort: "newest",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("doc-1");
  });

  it("suggests clean document names from project, contact, workflow, and date", () => {
    expect(suggestDocumentName({
      projectName: "Acme onboarding",
      contactName: "Maya Chen",
      workflowName: "NDA",
      date: new Date("2026-06-08T12:00:00Z"),
    })).toBe("Acme onboarding - Maya Chen - NDA - 2026-06-08");
  });
});
