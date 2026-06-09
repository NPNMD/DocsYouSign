"use client";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { getFormTemplate, LEGAL_DISCLAIMER } from "@/lib/templates";
import SignaturePad from "@/components/SignaturePad";
import FieldFillModal from "@/components/FieldFillModal";
import { riskTone, templateWarnings, today } from "@/lib/template-utils";
import {
  sendSigningInvite,
  completeEmailSignIn,
  isEmailSignInLink,
  rememberedEmail,
} from "@/lib/signing";
import { useAuth } from "@/context/AuthContext";
import GuidedSigning from "@/components/GuidedSigning";
import { ESIGN_CONSENT_TEXT } from "@/lib/consent";
import type { DocumentField, FormTemplate } from "@/lib/types";

const PDFRenderer = dynamic(() => import("@/components/PDFRenderer"), {
  ssr: false,
  loading: () => <div className="py-20"><Spinner /></div>,
});

type Phase = "loading" | "verify" | "review" | "sign" | "done" | "declined" | "error";

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
  fields?: DocumentField[];
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
  const { user, getToken } = useAuth();

  const [phase, setPhase] = useState<Phase>(token ? "loading" : "error");
  const [errorMsg, setErrorMsg] = useState(token ? "" : "This signing link is missing its token.");
  const [verifyEmail, setVerifyEmail] = useState(emailParam || rememberedEmail());
  const [verifySending, setVerifySending] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  const [request, setRequest] = useState<RequestInfo | null>(null);
  const [docData, setDocData] = useState<DocInfo | null>(null);

  const [signature, setSignature] = useState<string | null>(null);
  const [printName, setPrintName] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [savedSignerName, setSavedSignerName] = useState("");
  const [savedSignedAt, setSavedSignedAt] = useState<string | null>(null);

  // PDF signing state: per-field values keyed by field id.
  const [pdfFieldValues, setPdfFieldValues] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<DocumentField | null>(null);

  // Load the request + document by token. Sends a Bearer token when the
  // recipient is authenticated so the server can release document content.
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const idToken = await getToken();
      const res = await fetch(`/api/sign-request/${encodeURIComponent(token)}`, {
        cache: "no-store",
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
      });
      if (res.status === 404) {
        setErrorMsg("We couldn't find this signing request. The link may be invalid or expired.");
        setPhase("error");
        return;
      }
      if (res.status === 410) {
        setErrorMsg("This signing link is no longer active (it was voided or has expired).");
        setPhase("error");
        return;
      }
      if (!res.ok) {
        setErrorMsg("Something went wrong loading this document. Please try the link again.");
        setPhase("error");
        return;
      }
      const data = (await res.json()) as { authed: boolean; request: RequestInfo; document: DocInfo };
      setRequest(data.request);
      setDocData(data.document);
      setPrintName((prev) => prev || data.request.recipientName || "");
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
      if (data.request.status === "voided") {
        setPhase("declined");
        return;
      }
      const recipientEmail = data.request.recipientEmail?.toLowerCase() ?? emailParam.toLowerCase();
      setVerifyEmail((prev) => prev || recipientEmail);
      if (data.authed) {
        setPhase("review");
      } else {
        setPhase("verify");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Something went wrong loading this document. Please try the link again.");
      setPhase("error");
    }
  }, [token, emailParam, getToken]);

  // Re-load whenever auth state changes (so content unlocks after sign-in).
  // `load` is async and only updates state after awaiting the token, so this is
  // a subscription-style effect rather than a synchronous setState.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, user]);

  // Complete passwordless email-link sign-in if the recipient arrived via link.
  useEffect(() => {
    if (!token || typeof window === "undefined") return;
    if (isEmailSignInLink(window.location.href)) {
      const email = verifyEmail || rememberedEmail();
      if (email) {
        completeEmailSignIn(email, window.location.href)
          .catch(() => setErrorMsg("Email verification failed. Try requesting a new link."));
        // onAuthStateChanged -> user change -> load() re-runs with token.
      }
    }
  }, [token, verifyEmail]);

  const handleSendVerify = useCallback(async () => {
    if (!verifyEmail.trim()) return;
    setVerifySending(true);
    try {
      await sendSigningInvite(verifyEmail.trim(), token);
      setErrorMsg("");
      setVerifySent(true);
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
  const isPdf = !!docData && !template && !!docData.storageUrl;

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

  // Merge live field values onto the document fields for the PDF overlay.
  const renderedPdfFields = useMemo<DocumentField[]>(() => {
    if (!docData?.fields) return [];
    return docData.fields.map((f) => ({ ...f, value: pdfFieldValues[f.id] ?? f.value }));
  }, [docData, pdfFieldValues]);

  const pdfSignatureField = useMemo(
    () => docData?.fields?.find((f) => f.type === "signature") ?? null,
    [docData]
  );

  // Required PDF fields = signature + any explicit fields. Track completion.
  const pdfProgress = useMemo(() => {
    const fields = docData?.fields ?? [];
    const fillable = fields.filter((f) => f.type !== "date"); // dates auto-fill server-side
    const filled = fillable.filter((f) => !!pdfFieldValues[f.id]);
    return { total: fillable.length, done: filled.length };
  }, [docData, pdfFieldValues]);

  const pdfReady = useMemo(() => {
    if (!isPdf) return false;
    if (pdfSignatureField && !pdfFieldValues[pdfSignatureField.id]) return false;
    return consent && printName.trim().length > 0 && pdfProgress.done >= pdfProgress.total;
  }, [isPdf, pdfSignatureField, pdfFieldValues, consent, printName, pdfProgress]);

  const submit = useCallback(async () => {
    if (!docData || !consent || !printName.trim()) return;

    // Determine the primary signature image.
    const primarySignature = isPdf
      ? (pdfSignatureField ? pdfFieldValues[pdfSignatureField.id] : signature)
      : signature;
    if (!primarySignature) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const idToken = await getToken();
      if (!idToken) {
        setErrorMsg("Your verification session expired. Please request a new link.");
        setSaving(false);
        setPhase("verify");
        return;
      }
      const res = await fetch(`/api/sign-request/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          printName: printName.trim(),
          signatureDataUrl: primarySignature,
          consent,
          pdfFields: isPdf
            ? Object.entries(pdfFieldValues).map(([id, value]) => ({ id, value }))
            : undefined,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        setErrorMsg("We couldn't verify your identity. Please request a fresh signing link.");
        setSaving(false);
        setPhase("verify");
        return;
      }
      if (res.status === 409) {
        setSavedSignature(primarySignature);
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
      setSavedSignature(primarySignature);
      setSavedSignerName(printName.trim());
      setSavedSignedAt(new Date().toISOString());
      setPhase("done");
    } catch (e) {
      console.error(e);
      setErrorMsg("We couldn't record your signature. Please try again.");
      setSaving(false);
    }
  }, [docData, token, signature, consent, printName, isPdf, pdfSignatureField, pdfFieldValues, getToken]);

  const handleDecline = useCallback(async () => {
    if (!window.confirm("Decline to sign this document? The sender will be notified.")) return;
    setDeclining(true);
    setErrorMsg("");
    try {
      const idToken = await getToken();
      if (!idToken) {
        setErrorMsg("Your verification session expired. Please request a new link.");
        setPhase("verify");
        return;
      }
      const res = await fetch(`/api/sign-request/${encodeURIComponent(token)}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.status === 401 || res.status === 403) {
        setErrorMsg("We couldn't verify your identity. Please request a fresh signing link.");
        setPhase("verify");
        return;
      }
      if (!res.ok) {
        setErrorMsg("Could not record your decline. Please try again.");
        return;
      }
      setPhase("declined");
    } catch (e) {
      console.error(e);
      setErrorMsg("Could not record your decline. Please try again.");
    } finally {
      setDeclining(false);
    }
  }, [token, getToken]);

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
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{errorMsg}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Need help? Reply to the email that invited you, or contact the sender directly.
              </p>
            </div>
          </Card>
        </div>
      </Shell>
    );
  }

  if (phase === "declined") {
    return (
      <Shell>
        <div className="text-center py-6 max-w-md mx-auto">
          <div className="text-4xl mb-4">✋</div>
          <h1 className="font-display text-2xl font-bold mb-2" style={{ color: "var(--navy)" }}>Signing declined</h1>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            You chose not to sign this document
            {request?.senderEmail ? `. ${request.senderEmail} has been notified` : ""}.
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            If this was a mistake, contact the sender to request a new signing link.
          </p>
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
            {request?.senderEmail ? ` and ${request.senderEmail} has been notified` : ""}. You can download or print a copy below.
          </p>
          {template && savedSignature && (
            <div className="rounded-xl tpl-doc-outer text-left mb-6" style={{ background: "white", border: "1px solid var(--border)" }}>
              <div className="tpl-doc-body" dangerouslySetInnerHTML={{ __html: signedBodyHtml }} />
            </div>
          )}
          <div className="flex flex-wrap gap-3 justify-center no-print">
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
          <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>Verify your email to continue</h1>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            {request?.senderEmail ? `${request.senderEmail} sent you a document to sign. ` : ""}
            For your protection, we&apos;ll email a secure link to confirm you control this address before
            the document is shown.
          </p>
          {verifySent ? (
            <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(26,107,71,0.1)", color: "var(--navy)" }}>
              <strong>Check your inbox.</strong> We sent a secure sign-in link to{" "}
              <strong>{verifyEmail}</strong>. Open it on this device to view and sign the document.
              <button onClick={handleSendVerify} disabled={verifySending}
                className="block mt-3 text-xs font-semibold underline disabled:opacity-50"
                style={{ color: "var(--navy)" }}>
                {verifySending ? "Resending…" : "Didn't get it? Resend link"}
              </button>
            </div>
          ) : (
            <>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Email address
              </label>
              <input value={verifyEmail} onChange={(e) => setVerifyEmail(e.target.value)}
                type="email" autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm mb-4 outline-none"
                style={{ border: "1.5px solid var(--border)" }} placeholder="your@email.com" />
              {errorMsg && <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>{errorMsg}</p>}
              <button onClick={handleSendVerify} disabled={verifySending || !verifyEmail.trim()}
                className="w-full py-3 rounded-xl font-semibold disabled:opacity-50"
                style={{ background: "var(--navy)", color: "var(--gold)" }}>
                {verifySending ? "Sending…" : "Send verification link"}
              </button>
            </>
          )}
        </Card>
      </Shell>
    );
  }

  // review + sign
  return (
    <Shell>
      <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(10,22,40,0.04)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--navy)" }}>Sender verification</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Sent by <strong style={{ color: "var(--navy)" }}>{request?.senderEmail}</strong>
          {request?.recipientName ? ` to ${request.recipientName}` : ""}. Link expires in 30 days.
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          Sign only if you expected this document. Having trouble? Reply to the sender or email{" "}
          <a href="mailto:hello@signtoseal.com" className="underline" style={{ color: "var(--navy)" }}>hello@signtoseal.com</a>.
        </p>
      </div>

      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold" style={{ color: "var(--navy)" }}>{docData?.name}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Review the document, then sign below.
        </p>
      </div>

      {template ? (
        <>
          <TemplateRiskNotice template={template} compact />
          <div className="rounded-xl overflow-hidden mb-6" style={{ background: "white", border: "1px solid var(--border)" }}>
            <div className="tpl-doc-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </div>
        </>
      ) : isPdf ? (
        /* ── PDF documents: render with clickable fields ── */
        <div className="rounded-xl overflow-hidden mb-6 p-3" style={{ background: "var(--navy)", border: "1px solid var(--border)" }}>
          <PDFRenderer
            url={docData?.storageUrl ?? undefined}
            fields={renderedPdfFields}
            mode={phase === "sign" ? "sign" : "view"}
            onFieldClick={phase === "sign" ? (f) => setActiveField(f) : undefined}
          />
        </div>
      ) : (
        <Card>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            This document type isn&apos;t viewable in the portal yet. Please contact the sender.
          </p>
        </Card>
      )}

      {/* ── Review CTA ── */}
      {phase === "review" && (template || isPdf) && (
        <div className="space-y-3">
          <button onClick={() => setPhase("sign")} className="w-full py-3.5 rounded-xl font-semibold"
            style={{ background: "var(--navy)", color: "var(--gold)" }}>
            I&apos;ve Reviewed — Proceed to Sign →
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={declining}
            className="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ background: "white", color: "var(--danger)", border: "1px solid rgba(139,26,26,0.2)" }}
          >
            {declining ? "Recording…" : "Decline to sign"}
          </button>
        </div>
      )}

      {/* ── PDF guided signing ── */}
      {phase === "sign" && isPdf && (
        <>
          <GuidedSigning
            fields={docData?.fields ?? []}
            fieldValues={pdfFieldValues}
            consent={consent}
            onJumpToField={(f) => setActiveField(f)}
            className="mb-4"
          />
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>
                Fields completed: {pdfProgress.done} / {pdfProgress.total}
              </p>
              {pdfProgress.total > 0 && pdfProgress.done < pdfProgress.total && (
                <button
                  onClick={() => {
                    const next = (docData?.fields ?? []).find(
                      (f) => f.type !== "date" && !pdfFieldValues[f.id]
                    );
                    if (next) setActiveField(next);
                  }}
                  className="text-xs font-semibold underline" style={{ color: "var(--navy)" }}>
                  Go to next field →
                </button>
              )}
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Tap each highlighted field in the document above to fill it in.
            </p>
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
                {ESIGN_CONSENT_TEXT}
              </span>
            </label>
            <p className="text-xs p-3 rounded-lg" style={{ background: "rgba(201,168,76,0.10)", color: "var(--text-muted)" }}>
              <strong>Note:</strong> {LEGAL_DISCLAIMER}
            </p>
            {errorMsg && <p className="text-xs" style={{ color: "var(--danger)" }}>{errorMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => setPhase("review")} className="px-6 py-3 rounded-xl font-semibold"
                style={{ background: "white", color: "var(--navy)", border: "2px solid var(--navy)" }}>← Back</button>
              <button onClick={submit} disabled={!pdfReady || saving}
                className="flex-1 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                style={{ background: "var(--gold)", color: "var(--navy)" }}>
                {saving ? "Recording…" : "🔐 Sign & Complete"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleDecline}
              disabled={declining || saving}
              className="w-full py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              style={{ color: "var(--danger)" }}
            >
              {declining ? "Recording…" : "Decline to sign"}
            </button>
          </div>
        </Card>
        </>
      )}

      {/* ── Form-template signing ── */}
      {phase === "sign" && template && (
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
            <button
              type="button"
              onClick={handleDecline}
              disabled={declining || saving}
              className="w-full py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              style={{ color: "var(--danger)" }}
            >
              {declining ? "Recording…" : "Decline to sign"}
            </button>
          </div>
        </Card>
      )}

      {/* ── Field fill modal (PDF) ── */}
      {activeField && (
        <FieldFillModal
          field={{ ...activeField, value: pdfFieldValues[activeField.id] }}
          signerName={printName || request?.recipientName || ""}
          onFill={(value) => {
            setPdfFieldValues((prev) => ({ ...prev, [activeField.id]: value }));
            setActiveField(null);
          }}
          onClose={() => setActiveField(null)}
        />
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
