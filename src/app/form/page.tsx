"use client";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getFormTemplate, LEGAL_DISCLAIMER } from "@/lib/templates";
import { signFormDocument, saveFormData, createSigningRequest } from "@/lib/documents";
import { sendSigningInvite } from "@/lib/signing";
import SignaturePad from "@/components/SignaturePad";
import type { FormTemplate, TemplateFieldDef } from "@/lib/types";

type Step = 1 | 2 | 3 | 4;

function FormSignInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get("id");

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>(1);
  const [docLoading, setDocLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [signature, setSignature] = useState<string | null>(null);
  const [printName, setPrintName] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agreementId, setAgreementId] = useState("");

  // Send-to-sign
  const [showSend, setShowSend] = useState(false);
  const [recipName, setRecipName] = useState("");
  const [recipEmail, setRecipEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentLink, setSentLink] = useState("");
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !docId) return;
    (async () => {
      const snap = await getDoc(doc(db, "documents", docId));
      if (!snap.exists() || snap.data().ownerId !== user.uid) {
        router.push("/dashboard");
        return;
      }
      const data = snap.data();
      const tpl = getFormTemplate(data.templateId as string);
      if (!tpl) { router.push("/dashboard"); return; }
      setTemplate(tpl);
      const seeded: Record<string, string> = {};
      tpl.fields.forEach((f) => { if (f.defaultValue) seeded[f.key] = f.defaultValue; });
      const saved = (data.formData as Record<string, string>) ?? {};
      setValues({ ...seeded, ...saved });
      if (data.status === "signed") setStep(4);
      setDocLoading(false);
    })();
  }, [user, docId, router]);

  const setField = useCallback((key: string, val: string) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => (e[key] ? { ...e, [key]: false } : e));
  }, []);

  const validateStep1 = useCallback((): boolean => {
    if (!template) return false;
    const next: Record<string, boolean> = {};
    template.fields.forEach((f) => {
      if (f.required) {
        const val = (values[f.key] ?? "").trim();
        if (!val) next[f.key] = true;
        if (f.input === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) next[f.key] = true;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [template, values]);

  const goReview = useCallback(async () => {
    if (!validateStep1() || !docId) return;
    await saveFormData(docId, values).catch(() => {});
    setStep(2);
  }, [validateStep1, docId, values]);

  const bodyHtml = useMemo(
    () => (template ? template.renderBody(values) : ""),
    [template, values]
  );

  const submit = useCallback(async () => {
    if (!signature || !consent || !printName.trim() || !docId) return;
    setSaving(true);
    try {
      const finalValues = { ...values, _printedName: printName.trim() };
      await signFormDocument(docId, finalValues, printName.trim(), signature);
      const id = "DYS-" + Array.from({ length: 10 }, () =>
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
      setAgreementId(id);
      setStep(4);
    } catch (e) {
      console.error("Sign failed:", e);
      setSaving(false);
    }
  }, [signature, consent, printName, values, docId]);

  const sendForSignature = useCallback(async () => {
    if (!user || !docId) return;
    const email = recipEmail.trim().toLowerCase();
    if (!recipName.trim()) { setSendError("Enter the recipient's name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setSendError("Enter a valid recipient email."); return; }
    setSendError("");
    setSending(true);
    try {
      await saveFormData(docId, values).catch(() => {});
      const req = await createSigningRequest(
        docId,
        { id: user.uid, email: user.email ?? "" },
        { name: recipName.trim(), email }
      );
      const link = await sendSigningInvite(email, req.token);
      setSentLink(link);
    } catch (e) {
      console.error("Send failed:", e);
      setSendError("Couldn't send. Check the email and try again, or copy the link manually.");
    } finally {
      setSending(false);
    }
  }, [user, docId, recipName, recipEmail, values]);

  if (loading || docLoading || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--navy-mid)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <header className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between no-print"
        style={{ background: "var(--navy)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gold)" }}>
            <span style={{ fontSize: 16 }}>📄</span>
          </div>
          <span className="font-display text-lg font-semibold" style={{ color: "var(--gold)" }}>DocsYouSign</span>
        </div>
        <button onClick={() => router.push("/dashboard")}
          className="text-sm font-medium px-4 py-2 rounded-lg"
          style={{ color: "var(--gold)", border: "1px solid rgba(201,168,76,0.35)" }}>
          Exit
        </button>
      </header>

      {step < 4 && (
        <div className="px-6 py-4 no-print" style={{ background: "white", borderBottom: "1px solid var(--border)" }}>
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            {[{ n: 1, t: "Fill In" }, { n: 2, t: "Review" }, { n: 3, t: "Sign" }].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: step >= s.n ? "var(--navy)" : "white",
                    color: step >= s.n ? "var(--gold)" : "var(--text-muted)",
                    border: step >= s.n ? "none" : "2px solid var(--border)",
                  }}>
                  {step > s.n ? "✓" : s.n}
                </div>
                <span className="text-sm font-medium" style={{ color: step >= s.n ? "var(--navy)" : "var(--text-muted)" }}>{s.t}</span>
                {i < 2 && <div className="flex-1 h-0.5" style={{ background: step > s.n ? "var(--navy)" : "var(--border)" }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-8">
        {step === 1 && (
          <div>
            <h1 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--navy)" }}>{template.name}</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Fill in the details below. They&apos;ll be embedded into the document.</p>
            <div className="p-5 sm:p-6 rounded-xl" style={{ background: "white", border: "1px solid var(--border)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {template.fields.map((f) => (
                  <FieldInput key={f.key} f={f} value={values[f.key] ?? ""} error={!!errors[f.key]}
                    onChange={(val) => setField(f.key, val)} />
                ))}
              </div>
            </div>
            <button onClick={goReview}
              className="mt-6 w-full py-3.5 rounded-xl font-semibold text-base transition-all"
              style={{ background: "var(--navy)", color: "var(--gold)" }}>
              Continue to Review →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--navy)" }}>Review Document</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Read carefully before signing.</p>
            <div className="rounded-xl overflow-hidden" style={{ background: "white", border: "1px solid var(--border)" }}>
              <div className="tpl-doc-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl font-semibold"
                style={{ background: "white", color: "var(--navy)", border: "2px solid var(--navy)" }}>
                ← Edit
              </button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl font-semibold"
                style={{ background: "var(--navy)", color: "var(--gold)" }}>
                Sign It Myself →
              </button>
            </div>
            <button onClick={() => { setShowSend(true); setSentLink(""); setSendError(""); }}
              className="w-full mt-3 py-3 rounded-xl font-semibold"
              style={{ background: "white", color: "var(--navy)", border: "1.5px solid var(--gold)" }}>
              ✉️ Send to Someone Else to Sign
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--navy)" }}>Apply Your Signature</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Draw or type your signature to execute this agreement.</p>
            <div className="p-6 rounded-xl space-y-5" style={{ background: "white", border: "1px solid var(--border)" }}>
              <SignaturePad onSave={setSignature} />
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Printed full name <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input value={printName} onChange={(e) => setPrintName(e.target.value)}
                  placeholder="Your full legal name"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "white", border: "1.5px solid var(--border)", color: "var(--navy)" }} />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 flex-shrink-0" style={{ accentColor: "var(--navy)" }} />
                <span className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{template.consentText}</span>
              </label>
              <p className="text-xs p-3 rounded-lg" style={{ background: "rgba(201,168,76,0.10)", color: "var(--text-muted)" }}>
                <strong>Note:</strong> {LEGAL_DISCLAIMER}
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(2)} className="px-6 py-3 rounded-xl font-semibold"
                style={{ background: "white", color: "var(--navy)", border: "2px solid var(--navy)" }}>
                ← Back
              </button>
              <button onClick={submit} disabled={!signature || !consent || !printName.trim() || saving}
                className="flex-1 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                style={{ background: "var(--gold)", color: "var(--navy)" }}>
                {saving ? "Processing…" : "🔐 Execute & Sign"}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl"
              style={{ background: "rgba(26,107,71,0.12)", border: "3px solid rgba(26,107,71,0.3)" }}>✅</div>
            <h1 className="font-display text-2xl font-bold mb-2" style={{ color: "var(--navy)" }}>Agreement Signed</h1>
            <p className="text-sm max-w-md mx-auto mb-6" style={{ color: "var(--text-muted)" }}>
              Your {template.name} has been signed and recorded. Save or print a copy for your records.
            </p>
            {agreementId && (
              <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
                Agreement ID: <span className="font-mono font-semibold" style={{ color: "var(--navy)" }}>{agreementId}</span>
              </p>
            )}
            <div className="rounded-xl overflow-hidden text-left mb-6" style={{ background: "white", border: "1px solid var(--border)" }}>
              <div className="tpl-doc-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            </div>
            <div className="flex gap-3 justify-center no-print">
              <button onClick={() => window.print()} className="px-6 py-3 rounded-xl font-semibold"
                style={{ background: "var(--navy)", color: "var(--gold)" }}>🖨️ Print / Save PDF</button>
              <button onClick={() => router.push("/dashboard")} className="px-6 py-3 rounded-xl font-semibold"
                style={{ background: "white", color: "var(--navy)", border: "2px solid var(--navy)" }}>Back to Dashboard</button>
            </div>
          </div>
        )}
      </main>

      {/* Send-for-signature modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print"
          style={{ background: "rgba(10,22,40,0.5)" }} onClick={() => !sending && setShowSend(false)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "white" }} onClick={(e) => e.stopPropagation()}>
            {sentLink ? (
              <div>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">📨</div>
                  <h2 className="font-display text-xl font-bold" style={{ color: "var(--navy)" }}>Invitation sent</h2>
                  <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    {recipName} ({recipEmail}) will get a secure link to verify and sign. You can also share the link directly:
                  </p>
                </div>
                <div className="flex gap-2 mb-4">
                  <input readOnly value={sentLink}
                    className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--cream)", border: "1px solid var(--border)", color: "var(--navy)" }} />
                  <button onClick={() => navigator.clipboard?.writeText(sentLink)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{ background: "var(--navy)", color: "var(--gold)" }}>Copy</button>
                </div>
                <button onClick={() => { setShowSend(false); router.push("/dashboard"); }}
                  className="w-full py-3 rounded-xl font-semibold" style={{ background: "var(--navy)", color: "var(--gold)" }}>
                  Done
                </button>
              </div>
            ) : (
              <div>
                <h2 className="font-display text-xl font-bold mb-1" style={{ color: "var(--navy)" }}>Send for signature</h2>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  The recipient verifies their email (no password) and signs the document you filled in.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>Recipient name</label>
                    <input value={recipName} onChange={(e) => setRecipName(e.target.value)} placeholder="Full name"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: "white", border: "1.5px solid var(--border)", color: "var(--navy)" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>Recipient email</label>
                    <input type="email" value={recipEmail} onChange={(e) => setRecipEmail(e.target.value)} placeholder="them@email.com"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                      style={{ background: "white", border: "1.5px solid var(--border)", color: "var(--navy)" }} />
                  </div>
                  {sendError && <p className="text-xs" style={{ color: "var(--danger)" }}>{sendError}</p>}
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setShowSend(false)} disabled={sending}
                    className="px-5 py-3 rounded-xl font-semibold"
                    style={{ background: "white", color: "var(--navy)", border: "2px solid var(--navy)" }}>Cancel</button>
                  <button onClick={sendForSignature} disabled={sending}
                    className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50"
                    style={{ background: "var(--gold)", color: "var(--navy)" }}>
                    {sending ? "Sending…" : "Send invitation →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldInput({ f, value, error, onChange }: {
  f: TemplateFieldDef; value: string; error: boolean; onChange: (v: string) => void;
}) {
  const span = f.half ? "" : "sm:col-span-2";
  const borderColor = error ? "var(--danger)" : "var(--border)";
  const baseStyle = { background: "white", border: `1.5px solid ${borderColor}`, color: "var(--navy)" } as const;
  return (
    <div className={span}>
      <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>
        {f.label}{f.required && <span style={{ color: "var(--danger)" }}> *</span>}
      </label>
      {f.input === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={baseStyle}>
          <option value="">— Select —</option>
          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : f.input === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-y" style={baseStyle} />
      ) : (
        <input type={f.input} value={value} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={baseStyle} />
      )}
      {error && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>Required</p>}
    </div>
  );
}

export default function FormSignPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--navy-mid)", borderTopColor: "transparent" }} />
      </div>
    }>
      <FormSignInner />
    </Suspense>
  );
}
