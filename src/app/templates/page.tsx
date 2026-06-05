"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { templatesByCategory, LEGAL_DISCLAIMER, TEMPLATES } from "@/lib/templates";
import { createDocumentFromTemplate } from "@/lib/documents";
import { riskTone, templateWarnings } from "@/lib/template-utils";
import type { Template, TemplateRiskLevel } from "@/lib/types";

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Template | null>(null);
  const [ackGeneral, setAckGeneral] = useState(false);
  const [ackRisk, setAckRisk] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const openUse = useCallback((template: Template) => {
    setSelected(template);
    setAckGeneral(false);
    setAckRisk(false);
  }, []);

  const handleUse = useCallback(async (template: Template) => {
    if (!user) return;
    if (template.kind !== "form") return; // PDF templates land in a later phase
    setCreatingId(template.id);
    try {
      const newDoc = await createDocumentFromTemplate(template, user.uid, user.email ?? "", {
        acknowledgedAt: new Date(),
      });
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
  const selectedRisk = selected?.riskLevel ?? "medium";
  const selectedNeedsExtra = selectedRisk === "high" || selectedRisk === "restricted";
  const canCreate = !!selected && ackGeneral && (!selectedNeedsExtra || ackRisk);

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
            SignToSeal
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
            {TEMPLATES.length} ready-made documents — fill in, sign, or send to someone else.
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
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <RiskBadge risk={t.riskLevel} />
                    {t.jurisdictionSensitive && <MiniBadge label="State-sensitive" />}
                    {t.attorneyReviewRecommended && <MiniBadge label="Review advised" />}
                  </div>
                  <button
                    onClick={() => openUse(t)}
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,22,40,0.5)" }} onClick={() => creatingId ? undefined : setSelected(null)}>
          <div className="w-full max-w-lg rounded-xl p-6" style={{ background: "white" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="text-3xl flex-shrink-0">{selected.icon}</div>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold" style={{ color: "var(--navy)" }}>{selected.name}</h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{selected.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <RiskBadge risk={selected.riskLevel} />
                  <MiniBadge label={`v${selected.version ?? "1.0.0"}`} />
                  {selected.jurisdictionSensitive && <MiniBadge label="Jurisdiction-sensitive" />}
                  {selected.attorneyReviewRecommended && <MiniBadge label="Attorney review recommended" />}
                </div>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-lg" style={{ background: "rgba(201,168,76,0.10)", border: "1px solid rgba(201,168,76,0.45)" }}>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                <strong>Stock template only.</strong> {LEGAL_DISCLAIMER}
              </p>
              {selected.sourceUrl && (
                <a href={selected.sourceUrl} target="_blank" rel="noreferrer"
                  className="text-xs font-semibold inline-block mt-2"
                  style={{ color: "var(--navy)" }}>
                  Official/reference source →
                </a>
              )}
            </div>

            {templateWarnings(selected).length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Before you use it</h3>
                <ul className="space-y-2">
                  {templateWarnings(selected).map((warning) => (
                    <li key={warning} className="text-xs leading-relaxed flex gap-2" style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: "var(--danger)" }}>•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={ackGeneral} onChange={(e) => setAckGeneral(e.target.checked)}
                  className="mt-1 w-4 h-4 flex-shrink-0" style={{ accentColor: "var(--navy)" }} />
                <span className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  I understand this is a stock template, not legal advice, and I am responsible for confirming it fits my situation.
                </span>
              </label>
              {selectedNeedsExtra && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={ackRisk} onChange={(e) => setAckRisk(e.target.checked)}
                    className="mt-1 w-4 h-4 flex-shrink-0" style={{ accentColor: "var(--danger)" }} />
                  <span className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    I understand this is a {selectedRisk} template and should be reviewed by a qualified professional before use.
                  </span>
                </label>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setSelected(null)} disabled={!!creatingId}
                className="px-5 py-3 rounded-lg font-semibold"
                style={{ background: "white", color: "var(--navy)", border: "2px solid var(--navy)" }}>
                Cancel
              </button>
              <button onClick={() => selected && handleUse(selected)} disabled={!canCreate || creatingId === selected.id}
                className="flex-1 py-3 rounded-lg font-semibold disabled:opacity-50"
                style={{ background: "var(--gold)", color: "var(--navy)" }}>
                {creatingId === selected.id ? "Creating…" : "Acknowledge & create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskBadge({ risk }: { risk?: TemplateRiskLevel }) {
  const tone = riskTone(risk);
  return (
    <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
      style={{ background: tone.background, color: tone.color, border: `1px solid ${tone.border}` }}>
      {tone.label} risk
    </span>
  );
}

function MiniBadge({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
      style={{ background: "rgba(10,22,40,0.04)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
      {label}
    </span>
  );
}
