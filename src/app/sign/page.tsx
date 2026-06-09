"use client";
import { useEffect, useState, useCallback, useMemo, useRef, useId, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { ESIGN_CONSENT_TEXT } from "@/lib/consent";
import { listSavedSignatures, saveSignature } from "@/lib/saved-signatures";
import type { Document, DocumentField } from "@/lib/types";
import dynamic from "next/dynamic";
import FieldFillModal from "@/components/FieldFillModal";
import GuidedSigning, { isSigningComplete } from "@/components/GuidedSigning";
import type { SavedSignatureOption } from "@/components/SignaturePad";

const PDFRenderer = dynamic(() => import("@/components/PDFRenderer"), { ssr: false });

function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || focusable.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}

function SignPageInner() {
  const { user, loading, authedFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get("id");

  const [document, setDocument] = useState<Document | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [activeField, setActiveField] = useState<DocumentField | null>(null);
  const [printName, setPrintName] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignatureOption[]>([]);

  const nameModalRef = useRef<HTMLDivElement>(null);
  const nameModalTitleId = useId();
  useFocusTrap(nameModalRef, showNameModal);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    listSavedSignatures(user.uid)
      .then((sigs) =>
        setSavedSignatures(sigs.map((s) => ({ id: s.id, dataUrl: s.dataUrl, label: s.label })))
      )
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || !docId) return;
    (async () => {
      const snap = await getDoc(doc(db, "documents", docId));
      if (!snap.exists() || snap.data().ownerId !== user.uid) {
        router.push("/dashboard");
        return;
      }
      const data = snap.data();
      const d: Document = {
        id: snap.id,
        ...data,
        fields: (data.fields as DocumentField[]) ?? [],
        createdAt: data.createdAt?.toDate() ?? new Date(),
        updatedAt: data.updatedAt?.toDate() ?? new Date(),
        signedAt: data.signedAt?.toDate(),
        status: data.status ?? "draft",
      } as Document;
      setDocument(d);
      if (d.signerName) setPrintName(d.signerName);
      else if (user.displayName) setPrintName(user.displayName);
      if (d.status === "signed" || d.status === "completed") {
        setSaved(true);
        setFields(d.fields);
        setConsent(true);
      } else {
        const today = new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(new Date());
        setFields(
          d.fields.map((f) => (f.type === "date" && !f.value ? { ...f, value: today } : f))
        );
      }
      setDocLoading(false);
    })();
  }, [user, docId, router]);

  const fieldValues = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.id, f.value ?? ""])),
    [fields]
  );

  const handleFieldClick = useCallback(
    (field: DocumentField) => {
      if (saved || field.type === "date") return;
      setActiveField(field);
    },
    [saved]
  );

  const handleJumpToField = useCallback(
    (field: DocumentField) => {
      if (saved || field.type === "date") return;
      setActiveField(field);
      window.document.getElementById(`field-${field.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [saved]
  );

  const handleFieldFill = useCallback((id: string, value: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, value } : f)));
    setActiveField(null);
  }, []);

  const handleSaveSignature = useCallback(
    async (dataUrl: string) => {
      if (!user) return;
      try {
        const id = await saveSignature(user.uid, dataUrl);
        setSavedSignatures((prev) => [
          { id, dataUrl, label: "My signature" },
          ...prev.filter((s) => s.id !== id).slice(0, 4),
        ]);
      } catch (e) {
        console.error(e);
      }
    },
    [user]
  );

  const readyToComplete = isSigningComplete(fields, fieldValues, consent) && printName.trim().length > 0;

  const handleComplete = useCallback(async () => {
    if (!document || !docId) return;
    if (!printName.trim()) {
      setShowNameModal(true);
      return;
    }
    if (!consent) {
      setErrorMsg("Please accept the electronic signature consent to continue.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await authedFetch(`/api/documents/${docId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printName: printName.trim(),
          fields,
          consent: true,
        }),
      });
      if (res.status === 409) {
        setSaved(true);
        return;
      }
      if (!res.ok) {
        setErrorMsg("Could not complete signing. Please try again.");
        return;
      }
      setSaved(true);
    } catch (e) {
      console.error(e);
      setErrorMsg("Could not complete signing. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [document, docId, fields, printName, consent, authedFetch]);

  const handleDownload = useCallback(async () => {
    if (!docId) return;
    setDownloading(true);
    try {
      const res = await authedFetch(`/api/documents/${docId}/download`);
      if (!res.ok) return;
      const data = (await res.json()) as { url?: string; name?: string };
      if (data.url) {
        const a = window.document.createElement("a");
        a.href = data.url;
        a.download = data.name ?? "signed-document.pdf";
        a.target = "_blank";
        a.rel = "noreferrer";
        a.click();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }, [docId, authedFetch]);

  useEffect(() => {
    if (!showNameModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowNameModal(false);
    };
    window.document.addEventListener("keydown", onKey);
    return () => window.document.removeEventListener("keydown", onKey);
  }, [showNameModal]);

  if (loading || !user || docLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <Spinner />
      </div>
    );
  }
  if (!document) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--cream)" }}>
      <header
        className="sticky top-0 z-50 px-6 py-3 flex items-center justify-between"
        style={{ background: "var(--navy)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded-lg transition-all hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "rgba(250,247,240,0.6)", outlineColor: "var(--gold)" }}
            aria-label="Back to dashboard"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
          <div>
            <p className="text-xs" style={{ color: "rgba(250,247,240,0.4)" }}>
              {saved ? "Signed" : "Signing"}
            </p>
            <p className="font-medium text-sm truncate max-w-xs" style={{ color: "var(--cream)" }}>
              {document.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saved ? (
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(26,107,71,0.25)", color: "#4ade80" }}
                role="status"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <polyline points="20,6 9,17 4,12" />
                </svg>
                Signed!
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: "var(--gold)", color: "var(--navy)", outlineColor: "var(--gold)" }}
                aria-label="Download signed PDF"
              >
                {downloading ? "Preparing…" : "Download PDF"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={saving || !readyToComplete}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: "var(--gold)", color: "var(--navy)", outlineColor: "var(--gold)" }}
              aria-label={readyToComplete ? "Complete signing" : "Complete all required fields to finish signing"}
            >
              {saving ? "Saving…" : "Complete Signing"}
            </button>
          )}
        </div>
      </header>

      {!saved && fields.length > 0 && (
        <div
          className="px-6 py-2.5 text-sm font-medium text-center"
          style={{
            background: "rgba(201,168,76,0.12)",
            color: "var(--navy)",
            borderBottom: "1px solid rgba(201,168,76,0.2)",
          }}
        >
          Click any <span style={{ color: "var(--gold)", fontWeight: 600 }}>highlighted field</span> on the
          document to fill it in
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 pb-28" style={{ background: "#525659" }}>
        <PDFRenderer
          url={document.storageUrl}
          fields={fields}
          mode={saved ? "view" : "sign"}
          onFieldClick={handleFieldClick}
        />
      </main>

      {!saved && fields.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 max-w-3xl mx-auto w-full">
          <GuidedSigning
            fields={fields}
            fieldValues={fieldValues}
            consent={consent}
            onJumpToField={handleJumpToField}
          />
        </div>
      )}

      {!saved && (
        <div
          className="px-6 py-4 space-y-3"
          style={{ background: "white", borderTop: "1px solid var(--border)" }}
        >
          <div>
            <label
              htmlFor="print-name"
              className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Printed full name <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              id="print-name"
              type="text"
              value={printName}
              onChange={(e) => setPrintName(e.target.value)}
              placeholder="Your full legal name"
              className="w-full max-w-md px-4 py-3 rounded-xl text-sm outline-none focus-visible:ring-2"
              style={{
                border: "1.5px solid var(--border)",
                color: "var(--navy)",
                background: "var(--cream)",
              }}
              aria-required
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer max-w-2xl">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-4 h-4 flex-shrink-0"
              style={{ accentColor: "var(--navy)" }}
              aria-label="Electronic signature consent"
            />
            <span className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {ESIGN_CONSENT_TEXT}
            </span>
          </label>
          {errorMsg && (
            <p className="text-xs" style={{ color: "var(--danger)" }} role="alert">
              {errorMsg}
            </p>
          )}
        </div>
      )}

      {activeField && (
        <FieldFillModal
          field={activeField}
          signerName={printName}
          savedSignatures={savedSignatures}
          onSaveSignature={handleSaveSignature}
          onFill={(value) => handleFieldFill(activeField.id, value)}
          onClose={() => setActiveField(null)}
        />
      )}

      {showNameModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,22,40,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowNameModal(false)}
        >
          <div
            ref={nameModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={nameModalTitleId}
            className="w-full max-w-sm p-6 rounded-2xl shadow-2xl"
            style={{ background: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id={nameModalTitleId}
              className="font-display text-lg font-semibold mb-1"
              style={{ color: "var(--navy)" }}
            >
              Your name
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              Enter your full name for the signing record.
            </p>
            <input
              type="text"
              value={printName}
              onChange={(e) => setPrintName(e.target.value)}
              placeholder="Full name"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4 focus-visible:ring-2"
              style={{ border: "1.5px solid var(--gold)", color: "var(--navy)", background: "var(--cream)" }}
              aria-label="Full legal name"
              onKeyDown={(e) => {
                if (e.key === "Enter" && printName.trim()) {
                  setShowNameModal(false);
                  handleComplete();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium focus-visible:outline focus-visible:outline-2"
                style={{ background: "var(--cream-dark)", color: "var(--text-muted)", outlineColor: "var(--gold)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNameModal(false);
                  handleComplete();
                }}
                disabled={!printName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 focus-visible:outline focus-visible:outline-2"
                style={{ background: "var(--navy)", color: "var(--gold)", outlineColor: "var(--gold)" }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
          <Spinner />
        </div>
      }
    >
      <SignPageInner />
    </Suspense>
  );
}

function Spinner() {
  return (
    <div
      className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: "var(--navy-mid)", borderTopColor: "transparent" }}
      role="status"
      aria-label="Loading"
    />
  );
}
