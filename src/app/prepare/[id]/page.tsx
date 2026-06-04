"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { saveFields } from "@/lib/documents";
import type { Document, DocumentField, FieldType } from "@/lib/types";
import dynamic from "next/dynamic";

const PDFRenderer = dynamic(() => import("@/components/PDFRenderer"), { ssr: false });

const FIELD_TYPES: { type: FieldType; label: string; icon: string; desc: string; color: string }[] = [
  { type: "signature", label: "Signature", icon: "✍️", desc: "Full signature", color: "var(--gold)" },
  { type: "initials",  label: "Initials",  icon: "AB", desc: "Initials only",  color: "#3b82f6" },
  { type: "date",      label: "Date",      icon: "📅", desc: "Auto-filled date", color: "#22c55e" },
  { type: "text",      label: "Text",      icon: "T",  desc: "Free text field", color: "#a855f7" },
];

export default function PreparePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const docId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [placingType, setPlacingType] = useState<FieldType | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [saving, setSaving] = useState(false);

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
        status: data.status ?? "draft",
      } as Document;
      setDocument(d);
      setFields(d.fields);
      setDocLoading(false);
    })();
  }, [user, docId, router]);

  const handlePlace = useCallback((field: DocumentField) => {
    setFields((prev) => [...prev, field]);
    // keep placing same type (single-click to deselect)
  }, []);

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, x, y } : f));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleSave = async () => {
    if (!document) return;
    setSaving(true);
    try {
      await saveFields(document.id, fields, pageCount);
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || docLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <Spinner />
      </div>
    );
  }

  if (!document) return null;

  const sigCount = fields.filter(f => f.type === "signature").length;
  const initCount = fields.filter(f => f.type === "initials").length;
  const dateCount = fields.filter(f => f.type === "date").length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--cream)" }}>
      {/* Header */}
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
            <p className="text-xs" style={{ color: "rgba(250,247,240,0.4)" }}>Prepare — place fields on</p>
            <p className="font-medium text-sm truncate max-w-xs" style={{ color: "var(--cream)" }}>
              {document.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs" style={{ color: "rgba(250,247,240,0.5)" }}>
            <span>{sigCount} sig{sigCount !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{initCount} initial{initCount !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{dateCount} date{dateCount !== 1 ? "s" : ""}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "var(--gold)", color: "var(--navy)" }}
          >
            {saving ? "Saving…" : fields.length === 0 ? "Skip & Save" : "Save & Continue →"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Field toolbar */}
        <aside className="w-60 flex-shrink-0 overflow-y-auto p-4 flex flex-col gap-3"
          style={{ background: "white", borderRight: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
            Fields
          </p>
          <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--text-muted)" }}>
            Click a field type, then click anywhere on the PDF to place it.
          </p>

          {FIELD_TYPES.map(({ type, label, icon, desc, color }) => (
            <button
              key={type}
              onClick={() => setPlacingType(placingType === type ? null : type)}
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
              style={{
                border: `2px solid ${placingType === type ? color : "var(--border)"}`,
                background: placingType === type ? `${color}15` : "var(--cream)",
              }}
            >
              <span className="text-xl w-8 text-center">{icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{label}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
              </div>
              {placingType === type && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: color, color: "white" }}>
                  Active
                </span>
              )}
            </button>
          ))}

          {fields.length > 0 && (
            <>
              <div className="mt-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                  Placed ({fields.length})
                </p>
                <div className="space-y-1">
                  {fields.map((f) => (
                    <div key={f.id} className="flex items-center justify-between text-xs py-1 px-2 rounded"
                      style={{ background: "var(--cream-dark)" }}>
                      <span style={{ color: "var(--navy)" }}>
                        {FIELD_TYPES.find(ft => ft.type === f.type)?.icon} {FIELD_TYPES.find(ft => ft.type === f.type)?.label} (p.{f.page})
                      </span>
                      <button onClick={() => handleDelete(f.id)} className="hover:opacity-70" style={{ color: "var(--danger)" }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setFields([])}
                className="text-xs py-1.5 px-3 rounded-lg mt-1 transition-all hover:opacity-70"
                style={{ background: "rgba(139,26,26,0.08)", color: "var(--danger)" }}
              >
                Clear all fields
              </button>
            </>
          )}
        </aside>

        {/* PDF Canvas */}
        <main className="flex-1 overflow-y-auto p-4" style={{ background: "#525659" }}>
          {placingType && (
            <div className="sticky top-0 z-20 mb-3 px-4 py-2 rounded-lg text-sm font-medium text-center"
              style={{ background: "rgba(201,168,76,0.95)", color: "var(--navy)", cursor: "default" }}>
              Click anywhere on the PDF to place a <strong>{FIELD_TYPES.find(f => f.type === placingType)?.label}</strong> field
              <button onClick={() => setPlacingType(null)} className="ml-3 underline text-xs opacity-70 hover:opacity-100">
                Cancel
              </button>
            </div>
          )}

          <PDFRenderer
            url={document.storageUrl}
            fields={fields}
            mode="prepare"
            onPageCount={setPageCount}
            onFieldPlace={handlePlace}
            onFieldMove={handleMove}
            onFieldDelete={handleDelete}
            placingType={placingType}
          />
        </main>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
    style={{ borderColor: "var(--navy-mid)", borderTopColor: "transparent" }} />;
}
