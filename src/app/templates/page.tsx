"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { templatesByCategory, LEGAL_DISCLAIMER } from "@/lib/templates";
import { createDocumentFromTemplate } from "@/lib/documents";
import type { Template } from "@/lib/types";

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const handleUse = useCallback(async (template: Template) => {
    if (!user) return;
    if (template.kind !== "form") return; // PDF templates land in a later phase
    setCreatingId(template.id);
    try {
      const newDoc = await createDocumentFromTemplate(template, user.uid, user.email ?? "");
      router.push(`/form?id=${newDoc.id}`);
    } catch (e) {
      console.error("Failed to create from template:", e);
      setCreatingId(null);
    }
  }, [user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--navy-mid)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const groups = templatesByCategory();

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
        style={{ background: "var(--navy)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gold)" }}>
            <span style={{ fontSize: 16 }}>📄</span>
          </div>
          <span className="font-display text-lg font-semibold" style={{ color: "var(--gold)" }}>
            DocsYouSign
          </span>
        </button>
        <button onClick={() => router.push("/dashboard")}
          className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
          style={{ color: "var(--gold)", border: "1px solid rgba(201,168,76,0.35)" }}>
          ← Dashboard
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold" style={{ color: "var(--navy)" }}>Templates</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Pick a ready-made document, fill it in, and sign — or send it to someone else to sign.
          </p>
        </div>

        {/* Legal disclaimer banner */}
        <div className="mb-8 p-4 rounded-xl flex items-start gap-3"
          style={{ background: "rgba(201,168,76,0.10)", border: "1px solid var(--gold)" }}>
          <span className="text-lg flex-shrink-0">⚖️</span>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
            <strong>Stock templates — not legal advice.</strong> {LEGAL_DISCLAIMER}
          </p>
        </div>

        {groups.map((group) => (
          <section key={group.category} className="mb-10">
            <h2 className="font-display text-base font-semibold mb-3" style={{ color: "var(--navy)" }}>
              {group.category}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((t) => (
                <div key={t.id} className="p-5 rounded-xl flex flex-col"
                  style={{ background: "white", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div className="text-3xl mb-3">{t.icon}</div>
                  <h3 className="font-display text-base font-semibold mb-1" style={{ color: "var(--navy)" }}>
                    {t.name}
                  </h3>
                  <p className="text-xs leading-relaxed flex-1" style={{ color: "var(--text-muted)" }}>
                    {t.description}
                  </p>
                  <button
                    onClick={() => handleUse(t)}
                    disabled={creatingId === t.id}
                    className="mt-4 w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: "var(--navy)", color: "var(--gold)" }}>
                    {creatingId === t.id ? "Creating…" : "Use this template →"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="text-center text-xs mt-4 mb-8" style={{ color: "var(--text-muted)" }}>
          Need something else? Healthcare templates (HIPAA Authorization, BAA, Telehealth Consent) are next.
        </p>
      </main>
    </div>
  );
}
