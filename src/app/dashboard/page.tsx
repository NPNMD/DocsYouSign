"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUserDocuments, uploadDocument, deleteDocument } from "@/lib/documents";
import type { Document } from "@/lib/types";
import DocumentCard from "@/components/DocumentCard";
import UploadZone from "@/components/UploadZone";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserDocuments(user.uid, (docs) => {
      setDocuments(docs);
      setDocsLoading(false);
    });
    return unsub;
  }, [user]);

  const handleUpload = useCallback(async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const newDoc = await uploadDocument(file, user.uid, user.email ?? "");
      // Go straight to prepare to place fields
      router.push(`/prepare?id=${newDoc.id}`);
    } catch (e) {
      console.error("Upload failed:", e);
      setUploading(false);
    }
  }, [user, router]);

  const handleDelete = useCallback(async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    await deleteDocument(doc.id, doc.storagePath);
  }, []);

  const handlePrepare = useCallback((doc: Document) => {
    if (doc.kind === "form") { router.push(`/form?id=${doc.id}`); return; }
    router.push(`/prepare?id=${doc.id}`);
  }, [router]);

  const handleSign = useCallback((doc: Document) => {
    if (doc.kind === "form") { router.push(`/form?id=${doc.id}`); return; }
    router.push(`/sign?id=${doc.id}`);
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <Spinner />
      </div>
    );
  }

  const signed = documents.filter(d => d.status === "signed" || d.status === "completed");
  const active = documents.filter(d => d.status !== "signed" && d.status !== "completed");

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
        style={{ background: "var(--navy)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gold)" }}>
            <PenIcon />
          </div>
          <span className="font-display text-lg font-semibold" style={{ color: "var(--gold)" }}>
            SignToSeal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            {user.photoURL && (
              <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full"
                style={{ outline: "2px solid var(--gold)", outlineOffset: "1px" }} />
            )}
            <span className="text-sm hidden sm:block" style={{ color: "rgba(250,247,240,0.7)" }}>
              {user.displayName ?? user.email}
            </span>
          </div>
          <button onClick={logout}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(250,247,240,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total", value: documents.length, icon: "📁" },
            { label: "Active", value: active.length, icon: "⏳" },
            { label: "Signed", value: signed.length, icon: "✅" },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl flex items-center gap-3"
              style={{ background: "white", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <span className="text-xl">{s.icon}</span>
              <div>
                <div className="text-2xl font-bold font-display" style={{ color: "var(--navy)" }}>{s.value}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        {documents.length === 0 && !docsLoading && (
          <div className="mb-6 p-4 rounded-xl flex items-start gap-6 flex-wrap"
            style={{ background: "white", border: "1px solid var(--border)" }}>
            {[
              { n: "1", label: "Upload", desc: "Drop a PDF below" },
              { n: "2", label: "Place Fields", desc: "Mark where to sign, initial, or date" },
              { n: "3", label: "Sign", desc: "Fill each field and complete" },
            ].map((step) => (
              <div key={step.n} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "var(--navy)", color: "var(--gold)" }}>
                  {step.n}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{step.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Start from a template */}
        <button onClick={() => router.push("/templates")}
          className="w-full mb-4 p-4 rounded-xl flex items-center gap-4 text-left transition-all hover:shadow-md"
          style={{ background: "white", border: "1px solid var(--gold)" }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xl"
            style={{ background: "rgba(201,168,76,0.15)" }}>📋</div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Start from a template</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>NDA and more — fill in, sign, or send to someone.</p>
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--gold)" }}>Browse →</span>
        </button>

        {/* Upload zone */}
        <UploadZone onUpload={handleUpload} uploading={uploading} />

        {/* Documents list */}
        <div className="mt-8">
          {docsLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📄</div>
              <p className="font-display text-lg font-medium" style={{ color: "var(--navy)" }}>No documents yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Upload a PDF to get started</p>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <div className="mb-6">
                  <h2 className="font-display text-base font-semibold mb-3" style={{ color: "var(--navy)" }}>
                    Active ({active.length})
                  </h2>
                  <div className="space-y-3">
                    {active.map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} onPrepare={handlePrepare} onSign={handleSign} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}

              {signed.length > 0 && (
                <div>
                  <h2 className="font-display text-base font-semibold mb-3" style={{ color: "var(--navy)" }}>
                    Signed ({signed.length})
                  </h2>
                  <div className="space-y-3">
                    {signed.map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} onPrepare={handlePrepare} onSign={handleSign} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Spinner() {
  return <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
    style={{ borderColor: "var(--navy-mid)", borderTopColor: "transparent" }} />;
}

function PenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
