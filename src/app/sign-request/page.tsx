"use client";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getFormTemplate, LEGAL_DISCLAIMER } from "@/lib/templates";
import {
  getSigningRequestByToken,
  getDocument,
  signFormDocument,
  completeSigningRequest,
  markSigningRequestViewed,
} from "@/lib/documents";
import {
  isEmailSignInLink,
  completeEmailSignIn,
  sendSigningInvite,
  rememberedEmail,
} from "@/lib/signing";
import SignaturePad from "@/components/SignaturePad";
import type { Document, SigningRequest } from "@/lib/types";

type Phase = "init" | "needEmail" | "linkSent" | "loading" | "review" | "sign" | "done" | "error";

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
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const emailHint = searchParams.get("e") ?? "";

  const [phase, setPhase] = useState<Phase>("init");
  const [errorMsg, setErrorMsg] = useState("");
  const [emailInput, setEmailInput] = useState(emailHint);

  const [request, setRequest] = useState<SigningRequest | null>(null);
  const [docData, setDocData] = useState<Document | null>(null);

  const [signature, setSignature] = useState<string | null>(null);
  const [printName, setPrintName] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1) Complete the email-link sign-in if the recipient arrived via the emailed link.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) return; // already signed in
    if (!isEmailSignInLink(window.location.href)) return;
    const stored = rememberedEmail() || emailHint;
    (async () => {
      if (stored) {
        try {
          await completeEmailSignIn(stored, window.location.href);
        } catch (e) {
          console.error(e);
          setErrorMsg("That sign-in link is invalid or expired. Request a new one below.");
          setPhase("needEmail");
        }
      } else {
        // Cross-device: ask the recipient to confirm their email to finish sign-in.
        setPhase("needEmail");
      }
    })();
  }, [user, emailHint]);

  // 2) Once authenticated, load the request + document.
  useEffect(() => {
    if (authLoading) return;
    (async () => {
      if (!token) { setErrorMsg("This signing link is missing its token."); setPhase("error"); return; }
      if (!user) {
        // Not signed in and not mid-link → ask for email to send a secure link.
        if (typeof window !== "undefined" && !isEmailSignInLink(window.location.href)) {
          setPhase((p) => (p === "linkSent" ? p : "needEmail"));
        }
        return;
      }
      setPhase("loading");
      try {
        const req = await getSigningRequestByToken(token);
        if (!req) { setErrorMsg("We couldn't find this signing request. The link may be invalid."); setPhase("error"); return; }
        const authedEmail = (user.email ?? "").toLowerCase();
        if (authedEmail !== req.recipientEmail.toLowerCase()) {
          setErrorMsg(`This document was sent to ${req.recipientEmail}. You're signed in as ${user.email}. Please use the email the document was sent to.`);
          setPhase("error");
          return;
        }
        setRequest(req);
        setPrintName(req.recipientName || "");
        if (req.status === "signed") { setPhase("done"); return; }
        const d = await getDocument(req.documentId);
        if (!d) { setErrorMsg("The document for this request could not be loaded."); setPhase("error"); return; }
        setDocData(d);
        markSigningRequestViewed(req.id);
        setPhase("review");
      } catch (e) {
        console.error(e);
        setErrorMsg("Something went wrong loading this document. Please try the link again.");
        setPhase("error");
      }
    })();
  }, [user, authLoading, token]);

  const template = useMemo(
    () => (docData?.templateId ? getFormTemplate(docData.templateId) : undefined),
    [docData]
  );
  const bodyHtml = useMemo(
    () => (template && docData ? template.renderBody(docData.formData ?? {}) : ""),
    [template, docData]
  );

  const sendLink = useCallback(async () => {
    const email = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorMsg("Enter a valid email address."); return; }
    setErrorMsg("");
    try {
      await sendSigningInvite(email, token);
      setPhase("linkSent");
    } catch (e) {
      console.error(e);
      setErrorMsg("Couldn't send the sign-in link. Check the email and try again.");
    }
  }, [emailInput, token]);

  const submit = useCallback(async () => {
    if (!docData || !request || !signature || !consent || !printName.trim()) return;
    setSaving(true);
    try {
      await signFormDocument(docData.id, docData.formData ?? {}, printName.trim(), signature);
      await completeSigningRequest(request.id, {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      });
      setPhase("done");
    } catch (e) {
      console.error(e);
      setErrorMsg("We couldn't record your signature. Please try again.");
      setSaving(false);
    }
  }, [docData, request, signature, consent, printName]);

  // ── render ──────────────────────────────────────────────────────
  if (authLoading || phase === "init" || phase === "loading") {
    return <Shell><div className="py-20"><Spinner /></div></Shell>;
  }

  if (phase === "needEmail" || phase === "linkSent") {
    return (
      <Shell>
        <div className="max-w-md mx-auto">
          <Card>
            {phase === "linkSent" ? (
              <div className="text-center">
                <div className="text-4xl mb-3">📧</div>
                <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>Check your email</h1>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  We sent a secure sign-in link to <strong>{emailInput}</strong>. Open it on this device to verify and sign.
                </p>
              </div>
            ) : (
              <>
                <h1 className="font-display text-xl font-bold mb-1" style={{ color: "var(--navy)" }}>Verify your email to sign</h1>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  Enter the email this document was sent to. We&apos;ll send a one-time secure link — no password needed.
                </p>
                <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3"
                  style={{ background: "white", border: "1.5px solid var(--border)", color: "var(--navy)" }} />
                {errorMsg && <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>{errorMsg}</p>}
                <button onClick={sendLink} className="w-full py-3 rounded-xl font-semibold"
                  style={{ background: "var(--navy)", color: "var(--gold)" }}>
                  Send me a secure link →
                </button>
              </>
            )}
          </Card>
        </div>
      </Shell>
    );
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
          <h1 className="font-display text-2xl font-bold mb-2" style={{ color: "var(--navy)" }}>Signed &amp; Complete</h1>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: "var(--text-muted)" }}>
            Thank you{request?.recipientName ? `, ${request.recipientName}` : ""}. Your signature has been recorded and
            {request ? ` ${request.senderEmail}` : " the sender"} has been notified. You may print a copy below.
          </p>
          {bodyHtml && (
            <div className="rounded-xl overflow-hidden text-left mb-6" style={{ background: "white", border: "1px solid var(--border)" }}>
              <div className="tpl-doc-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            </div>
          )}
          <button onClick={() => window.print()} className="px-6 py-3 rounded-xl font-semibold no-print"
            style={{ background: "var(--navy)", color: "var(--gold)" }}>🖨️ Print / Save PDF</button>
        </div>
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
        <div className="rounded-xl overflow-hidden mb-6" style={{ background: "white", border: "1px solid var(--border)" }}>
          <div className="tpl-doc-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </div>
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
