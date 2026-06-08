"use client";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getFormTemplate, LEGAL_DISCLAIMER } from "@/lib/templates";
import SignaturePad from "@/components/SignaturePad";
import { riskTone, templateWarnings, today } from "@/lib/template-utils";
import {
  sendSigningInvite,
  completeEmailSignIn,
  isEmailSignInLink,
  rememberedEmail,
} from "@/lib/signing";
import { useAuth } from "@/context/AuthContext";
import type { FormTemplate } from "@/lib/types";

type Phase = "loading" | "verify" | "review" | "sign" | "done" | "error";

interface RequestInfo {
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  status: string;
}
interface DocInfo {
  id: string;
  name: string;
  kind?: string;
  templateId: string | null;
  formData: Record<string, string>;
  fields?: Array<{ id: string; type: string; page: number; x: number; y: number; width: number; height: number; value?: string }>;
  storageUrl?: string | null;
  status: string;
  signatureDataUrl?: string | null;
  signerName?: string | null;
  signedAt?: string | null;
  signedPdfUrl?: string | null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <header className="px-6 py-4 flex items-center gap-3 no-print"
        style={{ background: "var(--navy)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gold)" }}>
          <span style={{ fontSize: 16 }}>📄</span>
        </div>
        <span className="font-display text-lg font-semibold" style={{ color: "var(--gold)" }}>SignToSeal</span>
        <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.6)" }}>Secure signing portal</span>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

function Spinner() {
  return <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto"
    style={{ borderColor: "var(--navy-mid)", borderTopColor: "transparent" }} />;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="p-6 rounded-xl" style={{ background: "white", border: "1px solid var(--border)" }}>{children}</div>;
}

function SignRequestInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const emailParam = searchParams.get("e") ?? "";
  const { user } = useAuth();

  const [phase, setPhase] = useState<Phase>(token ? "loading" : "error");
  const [errorMsg, setErrorMsg] = useState(token ? "" : "This signing link is missing its token.");
  const [verified, setVerified] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState(emailParam || rememberedEmail());
  const [verifySending, setVerifySending] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  const [request, setRequest] = useState<RequestInfo | null>(null);
  const [docData, setDocData] = useState<DocInfo | null>(null);

  const [signature, setSignature] = useState<string | null>(null);
  const [printName, setPrintName] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [savedSignerName, setSavedSignerName] = useState("");
  const [savedSignedAt, setSavedSignedAt] = useState<string | null>(null);

  // Load the request + document by token (no login required).
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/sign-request/${encodeURIComponent(token)}`, { cache: "no-store" });
        if (res.status === 404) {
          setErrorMsg("We couldn't find this signing request. The link may be invalid or expired.");
          setPhase("error");
          return;
        }
        if (!res.ok) {
          setErrorMsg("Something went wrong loading this document. Please try the link again.");
          setPhase("error");
          return;
        }
        const data = (await res.json()) as { request: RequestInfo; document: DocInfo };
        setRequest(data.request);
        setDocData(data.document);
        setPrintName(data.request.recipientName || "");
        if (data.document.signatureDataUrl) {
          setSavedSignature(data.document.signatureDataUrl);
          setSavedSignerName(data.document.signerName ?? data.request.recipientName ?? "");
          setSavedSignedAt(data.document.signedAt ?? null);
        }
        if (data.request.status === "signed" || data.document.status === "signed" || data.document.status === "completed") {
          setSignedPdfUrl(data.document.signedPdfUrl ?? null);
          setPhase("done");
          return;
        }
        const recipientEmail = data.request.recipientEmail?.toLowerCase() ?? emailParam.toLowerCase();
        setVerifyEmail(recipientEmail || verifyEmail);
        const authMatch = user?.email?.toLowerCase() === recipientEmail;
        if (authMatch) {
          setVerified(true);
          setPhase("review");
        } else {
          setPhase("verify");
        }
      } catch (e) {
        console.error(e);
        setErrorMsg("Something went wrong loading this document. Please try the link again.");
        setPhase("error");
      }
    })();
  }, [token, emailParam, user, verifyEmail]);

  useEffect(() => {
    if (!token || typeof window === "undefined") return;
    if (isEmailSignInLink(window.location.href)) {
      const email = verifyEmail || rememberedEmail();
      if (email) {
        completeEmailSignIn(email, window.location.href)
          .then(() => { setVerified(true); setPhase("review"); })
          .catch(() => setErrorMsg("Email verification failed. Try again."));
      }
    }
  }, [token, verifyEmail]);

  const handleSendVerify = useCallback(async () => {
    if (!verifyEmail.trim()) return;
    setVerifySending(true);
    try {
      await sendSigningInvite(verifyEmail.trim(), token);
      setErrorMsg("");
    } catch {
      setErrorMsg("Could not send verification email. Try again.");
    } finally {
      setVerifySending(false);
    }
  }, [verifyEmail, token]);

  const template = useMemo(
    () => (docData?.templateId ? getFormTemplate(docData.templateId) : undefined),
    [docData]
  );
  const bodyHtml = useMemo(
    () => (template && docData ? template.renderBody(docData.formData ?? {}) : ""),
    [template, docData]
  );

  const signedBodyHtml = useMemo(() => {
    if (!template || !docData || !savedSignature) return bodyHtml;
    const dateStr = savedSignedAt
      ? new Date(savedSignedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : today();
    return template.renderBody({
      ...(docData.formData ?? {}),
      __sigImg: savedSignature,
      __sigName: savedSignerName || printName.trim(),
      __sigDate: dateStr,
      __sigRole: "counterparty",
    });
  }, [template, docData, savedSignature, savedSignerName, savedSignedAt, printName, bodyHtml]);

  const submit = useCallback(async () => {
    if (!docData || !signature || !consent || !printName.trim()) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/sign-request/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printName: printName.trim(),
          signatureDataUrl: signature,
          consent,
          recipientEmail: verifyEmail || request?.recipientEmail,
          verified,
        }),
      });
      if (res.status === 409) {
        setSavedSignature(signature);
        setSavedSignerName(printName.trim());
        setSavedSignedAt(new Date().toISOString());
        setPhase("done");
        return;
      }
      if (!res.ok) {
        setErrorMsg("We couldn't record your signature. Please try again.");
        setSaving(false);
        return;
      }
      const result = await res.json().catch(() => ({}));
      if ((result as { signedPdfUrl?: string }).signedPdfUrl) {
        setSignedPdfUrl((result as { signedPdfUrl: string }).signedPdfUrl);
      }
      setSavedSignature(signature);
      setSavedSignerName(printName.trim());
      setSavedSignedAt(new Date().toISOString());
      setPhase("done");
    } catch (e) {
      console.error(e);
      setErrorMsg("We couldn't record your signature. Please try again.");
      setSaving(false);
    }
  }, [docData, token, signature, consent, printName, verifyEmail, request, verified]);

  // ── render ──────────────────────────────────────────────────────
  if (phase === "loading") {
    return <Shell><div className="py-20"><Spinner /></div></Shell>;
  }

  if (phase === "error") {
    return (
      <Shell>
        <div className="max-w-md mx-auto">
          <Card>
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>Can&apos;t open this document</h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{errorMsg}</p>
            </div>
          </Card>
        </div>
      </Shell>
    );
  }

  if (phase === "done") {
    return (
      <Shell>
        <div className="text-center py-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl"
            style={{ background: "rgba(26,107,71,0.12)", border: "3px solid rgba(26,107,71,0.3)" }}>✅</div>
          <h1 className="font-display text-2xl font-bold mb-2" style={{ color: "var(--navy)" }}>Document Signed</h1>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: "var(--text-muted)" }}>
            Thank you{request?.recipientName ? `, ${request.recipientName}` : ""}. Your signature has been recorded
            {request?.senderEmail ? ` and ${request.senderEmail} has been notified` : ""}. You can print or save a copy below.
          </p>
          {template && (
            <div className="rounded-xl tpl-doc-outer text-left mb-6" style={{ background: "white", border: "1px solid var(--border)" }}>
              <div className="tpl-doc-body" dangerouslySetInnerHTML={{ __html: signedBodyHtml }} />
            </div>
          )}
          <div className="flex gap-3 justify-center no-print">
            {signedPdfUrl && (
              <a href={signedPdfUrl} target="_blank" rel="noreferrer"
                className="px-6 py-3 rounded-xl font-semibold"
                style={{ background: "var(--gold)", color: "var(--navy)" }}>
                📥 Download Signed PDF
              </a>
            )}
            <button onClick={() => window.print()} className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: "var(--navy)", color: "var(--gold)" }}>🖨️ Print</button>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "verify") {
    return (
      <Shell>
        <Card>
          <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>Verify your email</h1>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            For security, confirm you control the email this document was sent to.
          </p>
          <input value={verifyEmail} onChange={(e) => setVerifyEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm mb-4 outline-none"
            style={{ border: "1.5px solid var(--border)" }} placeholder="your@email.com" />
          {errorMsg && <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>{errorMsg}</p>}
          <button onClick={handleSendVerify} disabled={verifySending || !verifyEmail.trim()}
            className="w-full py-3 rounded-xl font-semibold disabled:opacity-50"
            style={{ background: "var(--navy)", color: "var(--gold)" }}>
            {verifySending ? "Sending…" : "Send verification link"}
          </button>
        </Card>
      </Shell>
    );
  }

  // review + sign
  return (
    <Shell>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold" style={{ color: "var(--navy)" }}>{docData?.name}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Sent by {request?.senderEmail} for your signature. Review the document, then sign below.
        </p>
      </div>

      {template ? (
        <>
          <TemplateRiskNotice template={template} compact />
          <div className="rounded-xl overflow-hidden mb-6" style={{ background: "white", border: "1px solid var(--border)" }}>
            <div className="tpl-doc-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </div>
        </>
      ) : (
        <Card>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            This document type isn&apos;t viewable in the portal yet. Please contact the sender.
          </p>
        </Card>
      )}

      {phase === "review" && template && (
        <button onClick={() => setPhase("sign")} className="w-full py-3.5 rounded-xl font-semibold"
          style={{ background: "var(--navy)", color: "var(--gold)" }}>
          I&apos;ve Reviewed — Proceed to Sign →
        </button>
      )}

      {phase === "sign" && (
        <Card>
          <div className="space-y-5">
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
              <span className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {template?.consentText ?? "I agree to sign this document electronically and understand my electronic signature is legally binding."}
              </span>
            </label>
            <p className="text-xs p-3 rounded-lg" style={{ background: "rgba(201,168,76,0.10)", color: "var(--text-muted)" }}>
              <strong>Note:</strong> {LEGAL_DISCLAIMER}
            </p>
            {errorMsg && <p className="text-xs" style={{ color: "var(--danger)" }}>{errorMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => setPhase("review")} className="px-6 py-3 rounded-xl font-semibold"
                style={{ background: "white", color: "var(--navy)", border: "2px solid var(--navy)" }}>← Back</button>
              <button onClick={submit} disabled={!signature || !consent || !printName.trim() || saving}
                className="flex-1 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                style={{ background: "var(--gold)", color: "var(--navy)" }}>
                {saving ? "Recording…" : "🔐 Sign & Complete"}
              </button>
            </div>
          </div>
        </Card>
      )}
    </Shell>
  );
}

function TemplateRiskNotice({ template, compact = false }: { template: FormTemplate; compact?: boolean }) {
  const tone = riskTone(template.riskLevel);
  const warnings = templateWarnings(template);
  return (
    <div className={compact ? "mb-4 p-3 rounded-lg" : "mb-6 p-4 rounded-xl"}
      style={{ background: tone.background, border: `1px solid ${tone.border}` }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: tone.color }}>
          {tone.label} risk template
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>v{template.version ?? "1.0.0"}</span>
        {template.jurisdictionSensitive && <span className="text-xs" style={{ color: "var(--text-muted)" }}>Jurisdiction-sensitive</span>}
        {template.attorneyReviewRecommended && <span className="text-xs" style={{ color: "var(--text-muted)" }}>Review recommended</span>}
      </div>
      {!compact && warnings.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {warnings.slice(0, 4).map((warning) => (
            <li key={warning} className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{warning}</li>
          ))}
        </ul>
      )}
      {template.sourceUrl && (
        <a href={template.sourceUrl} target="_blank" rel="noreferrer"
          className="text-xs font-semibold inline-block mt-2"
          style={{ color: "var(--navy)" }}>
          Official/reference source →
        </a>
      )}
    </div>
  );
}

export default function SignRequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--navy-mid)", borderTopColor: "transparent" }} />
      </div>
    }>
      <SignRequestInner />
    </Suspense>
  );
}
