"use client";
import type { Document } from "@/lib/types";

interface Props {
  doc: Document;
  onPrepare: (doc: Document) => void;
  onSign: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

const STATUS_CONFIG = {
  draft:    { label: "Draft",    color: "var(--text-muted)", bg: "rgba(107,122,150,0.1)" },
  prepared: { label: "Ready to Sign", color: "#b45309", bg: "rgba(180,83,9,0.1)" },
  sent:     { label: "Out for Signature", color: "#1d4ed8", bg: "rgba(29,78,216,0.1)" },
  signed:   { label: "Signed",   color: "var(--success)", bg: "rgba(26,107,71,0.1)" },
  completed:{ label: "Completed",color: "var(--success)", bg: "rgba(26,107,71,0.1)" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function DocumentCard({ doc, onPrepare, onSign, onDelete }: Props) {
  const status = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.draft;
  const fieldCount = doc.fields?.length ?? 0;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl transition-all hover:shadow-md group"
      style={{ background: "white", border: "1px solid var(--border)" }}>
      {/* PDF icon */}
      <div className="w-10 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--cream-dark)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          style={{ color: "var(--navy-mid)" }}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ color: "var(--navy)" }}>{doc.name}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ color: status.color, background: status.bg }}>
            {status.label}
          </span>
          {fieldCount > 0 && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {fieldCount} field{fieldCount !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {formatDate(doc.createdAt)}
          </span>
          {doc.fileSize && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatBytes(doc.fileSize)}</span>
          )}
          {doc.signedAt && (
            <span className="text-xs" style={{ color: "var(--success)" }}>
              ✓ Signed {formatDate(doc.signedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* View original (PDF documents only) */}
        {doc.storageUrl && (
          <a href={doc.storageUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{ background: "var(--cream-dark)", color: "var(--navy-mid)" }} title="Open PDF">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15,3 21,3 21,9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}

        {/* Form-template document → single continue/view action */}
        {doc.kind === "form" && doc.status !== "signed" && doc.status !== "completed" && (
          <button onClick={() => onSign(doc)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 hover:scale-105"
            style={{ background: "var(--navy)", color: "var(--gold)" }}>
            Continue →
          </button>
        )}

        {/* Draft → Prepare fields (PDF documents) */}
        {doc.kind !== "form" && doc.status === "draft" && (
          <button onClick={() => onPrepare(doc)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 hover:scale-105"
            style={{ background: "var(--navy)", color: "var(--gold)" }}>
            Place Fields
          </button>
        )}

        {/* Prepared → Sign (PDF documents) */}
        {doc.kind !== "form" && doc.status === "prepared" && (
          <button onClick={() => onSign(doc)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 hover:scale-105"
            style={{ background: "var(--gold)", color: "var(--navy)" }}>
            ✍️ Sign Now
          </button>
        )}

        {/* Re-prepare or re-sign for non-signed PDF docs without fields */}
        {doc.kind !== "form" && doc.status === "draft" && fieldCount === 0 && (
          <button onClick={() => onSign(doc)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>
            Sign anyway
          </button>
        )}

        {/* Signed → View */}
        {doc.status === "signed" && (
          <button onClick={() => onSign(doc)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>
            View
          </button>
        )}

        {/* Delete */}
        <button onClick={() => onDelete(doc)}
          className="p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          style={{ background: "rgba(139,26,26,0.08)", color: "var(--danger)" }} title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3,6 5,6 21,6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
