"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { signDocument } from "@/lib/documents";
import type { Document, DocumentField } from "@/lib/types";
import dynamic from "next/dynamic";
import FieldFillModal from "@/components/FieldFillModal";

const PDFRenderer = dynamic(() => import("@/components/PDFRenderer"), { ssr: false });

function SignPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get("id");

  const [document, setDocument] = useState<Document | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [activeField, setActiveField] = useState<DocumentField | null>(null);
  const [signerName, setSignerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);

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
      if (d.signerName) setSignerName(d.signerName);
      if (d.status === "signed") {
        setSaved(true);
        setFields(d.fields);
      } else {
        const today = new Intl.DateTimeFormat("en-US", {
          month: "long", day: "numeric", year: "numeric",
        }).format(new Date());
        setFields(d.fields.map(f => f.type === "date" && !f.value ? { ...f, value: today } : f));
      }
      setDocLoading(false);
    })();
  }, [user, docId, router]);

  const handleFieldClick = useCallback((field: DocumentField) => {
    if (saved || field.type === "date") return;
    setActiveField(field);
  }, [saved]);

  const handleFieldFill = useCallback((id: string, value: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, value } : f));
    setActiveField(null);
  }, []);

  const allFilled = fields.length === 0 || fields.every(f => !!f.value);
  const unfilledCount = fields.filter(f => !f.value).length;
  const totalFields = fields.length;

  const handleComplete = useCallback(async () => {
    if (!document) return;
    if (!signerName.trim()) { setShowNameModal(true); return; }
    setSaving(true);
    try {
      await signDocument(document.id, fields, signerName.trim());
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }, [document, fields, signerName, router]);

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
      <header className="sticky top-0 z-50 px-6 py-3 flex items-center justify-between"
        style={{ background: "var(--navy)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded-lg transition-all hover:opacity-70"
            style={{ color: "rgba(250,247,240,0.6)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          {!saved && totalFields > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-32 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${((totalFields - unfilledCount) / totalFields) * 100}%`, background: "var(--gold)" }} />
              </div>
              <span className="text-xs" style={{ color: "rgba(250,247,240,0.5)" }}>
                {totalFields - unfilledCount}/{totalFields}
              </span>
            </div>
          )}

          {saved ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(26,107,71,0.25)", color: "#4ade80" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20,6 9,17 4,12" />
              </svg>
              Signed!
            </div>
          ) : (
            <button onClick={handleComplete}
              disabled={saving || !allFilled}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--gold)", color: "var(--navy)" }}>
              {saving ? "Saving…" : unfilledCount > 0 ? `${unfilledCount} field${unfilledCount !== 1 ? "s" : ""} left` : "✅ Complete Signing"}
            </button>
          )}
        </div>
      </header>

      {!saved && totalFields > 0 && unfilledCount > 0 && (
        <div className="px-6 py-2.5 text-sm font-medium text-center"
          style={{ background: "rgba(201,168,76,0.12)", color: "var(--navy)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
          👆 Click any <span style={{ color: "var(--gold)", fontWeight: 600 }}>highlighted field</span> on the document to fill it in
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4" style={{ background: "#525659" }}>
        <PDFRenderer
          url={document.storageUrl}
          fields={fields}
          mode={saved ? "view" : "sign"}
          onFieldClick={handleFieldClick}
        />
      </main>

      {activeField && (
        <FieldFillModal
          field={activeField}
          signerName={signerName}
          onFill={(value) => handleFieldFill(activeField.id, value)}
          onClose={() => setActiveField(null)}
        />
      )}

      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,22,40,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm p-6 rounded-2xl shadow-2xl" style={{ background: "white" }}>
            <h3 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--navy)" }}>Your name</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              Enter your full name for the signing record.
            </p>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Full name"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
              style={{ border: "1.5px solid var(--gold)", color: "var(--navy)", background: "var(--cream)" }}
              onKeyDown={(e) => { if (e.key === "Enter" && signerName.trim()) { setShowNameModal(false); handleComplete(); } }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNameModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>Cancel</button>
              <button onClick={() => { setShowNameModal(false); handleComplete(); }}
                disabled={!signerName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background: "var(--navy)", color: "var(--gold)" }}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}><Spinner /></div>}>
      <SignPageInner />
    </Suspense>
  );
}

function Spinner() {
  return <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
    style={{ borderColor: "var(--navy-mid)", borderTopColor: "transparent" }} />;
}
