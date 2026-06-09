"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Document, SigningAuditEntry } from "@/lib/types";

interface Props {
  doc: Document;
  userId?: string;
  onPrepare: (doc: Document) => void;
  onSign: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onVoid?: (doc: Document) => void;
  onRemind?: (doc: Document) => void;
}

const STATUS_CONFIG = {
  draft:    { label: "Draft",    color: "var(--text-muted)", bg: "rgba(107,122,150,0.1)" },
  prepared: { label: "Ready to Sign", color: "#b45309", bg: "rgba(180,83,9,0.1)" },
  sent:     { label: "Out for Signature", color: "#1d4ed8", bg: "rgba(29,78,216,0.1)" },
  signed:   { label: "Signed",   color: "var(--success)", bg: "rgba(26,107,71,0.1)" },
  completed:{ label: "Completed",color: "var(--success)", bg: "rgba(26,107,71,0.1)" },
};

const EVENT_LABELS: Record<string, string> = {
  sent: "Sent",
  viewed: "Viewed",
  verified: "Verified",
  signed: "Signed",
  consent: "Consent recorded",
  voided: "Voided",
  declined: "Declined",
  reminded: "Reminder sent",
  completed: "Completed",
  downloaded: "Downloaded",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function AuditDrawer({
  open,
  onClose,
  entries,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  entries: SigningAuditEntry[];
  loading: boolean;
  error: string | null;
}) {
  if (!open) return null;

  const sorted = [...entries].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="audit-title">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close audit trail" />
      <div className="relative w-full max-w-md max-h-[80vh] overflow-hidden rounded-xl shadow-xl"
        style={{ background: "white", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 id="audit-title" className="font-display font-semibold text-sm" style={{ color: "var(--navy)" }}>
            Audit trail
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:opacity-70" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] p-4">
          {loading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading events…</p>}
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          {!loading && !error && sorted.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No audit events yet.</p>
          )}
          <ul className="space-y-3">
            {sorted.map((entry, i) => (
              <li key={`${entry.event}-${entry.at}-${i}`} className="text-sm pb-3 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold" style={{ color: "var(--navy)" }}>
                    {EVENT_LABELS[entry.event] ?? entry.event}
                  </span>
                  <time className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {formatDateTime(entry.at)}
                  </time>
                </div>
                {entry.email && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{entry.email}</p>
                )}
                {entry.ip && (
                  <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>IP: {entry.ip}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function DocumentCard({ doc, onPrepare, onSign, onDelete, onVoid, onRemind }: Props) {
  const { authedFetch } = useAuth();
  const status = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.draft;
  const fieldCount = doc.fields?.length ?? 0;
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [envelopeAudit, setEnvelopeAudit] = useState<SigningAuditEntry[]>([]);

  const showAudit = doc.envelopeId || (doc.auditTrail && doc.auditTrail.length > 0);

  const mergedAudit = useMemo(() => {
    const docEntries = doc.auditTrail ?? [];
    const combined = [...docEntries, ...envelopeAudit];
    const seen = new Set<string>();
    return combined.filter((e) => {
      const key = `${e.event}-${new Date(e.at).toISOString()}-${e.email ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [doc.auditTrail, envelopeAudit]);

  const loadAudit = useCallback(async () => {
    if (!doc.envelopeId) return;
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await authedFetch(`/api/envelopes/${encodeURIComponent(doc.envelopeId)}`);
      if (!res.ok) {
        setAuditError("Could not load audit trail.");
        return;
      }
      const data = (await res.json()) as {
        audit: { event: string; at: string; ip?: string; email?: string }[];
      };
      setEnvelopeAudit(
        data.audit.map((e) => ({
          event: e.event as SigningAuditEntry["event"],
          at: new Date(e.at),
          ip: e.ip,
          email: e.email,
        }))
      );
    } catch {
      setAuditError("Could not load audit trail.");
    } finally {
      setAuditLoading(false);
    }
  }, [authedFetch, doc.envelopeId]);

  useEffect(() => {
    if (auditOpen && doc.envelopeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on drawer open
      loadAudit();
    }
  }, [auditOpen, doc.envelopeId, loadAudit]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all hover:shadow-md group"
        style={{ background: "white", border: "1px solid var(--border)" }}>
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--cream-dark)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ color: "var(--navy-mid)" }}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

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
              {doc.pendingSignerEmail && doc.status === "sent" && (
                <span className="text-xs break-all" style={{ color: "var(--text-muted)" }}>
                  → {doc.pendingSignerEmail}
                </span>
              )}
              {doc.signedAt && (
                <span className="text-xs" style={{ color: "var(--success)" }}>
                  ✓ Signed {formatDate(doc.signedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 flex-wrap flex-shrink-0 w-full sm:w-auto">
          {showAudit && (
            <button
              type="button"
              onClick={() => setAuditOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--cream-dark)", color: "var(--navy)" }}
              title="View audit trail"
            >
              Audit
            </button>
          )}

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

          {doc.kind === "form" && doc.status !== "signed" && doc.status !== "completed" && (
            <button onClick={() => onSign(doc)}
              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 hover:scale-105"
              style={{ background: "var(--navy)", color: "var(--gold)" }}>
              Continue →
            </button>
          )}

          {doc.kind !== "form" && doc.status === "draft" && (
            <button onClick={() => onPrepare(doc)}
              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 hover:scale-105"
              style={{ background: "var(--navy)", color: "var(--gold)" }}>
              Place Fields
            </button>
          )}

          {doc.kind !== "form" && doc.status === "prepared" && (
            <button onClick={() => onSign(doc)}
              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 hover:scale-105"
              style={{ background: "var(--gold)", color: "var(--navy)" }}>
              ✍️ Sign Now
            </button>
          )}

          {doc.kind !== "form" && doc.status === "draft" && fieldCount === 0 && (
            <button onClick={() => onSign(doc)}
              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>
              Sign anyway
            </button>
          )}

          {doc.status === "sent" && doc.envelopeId && onRemind && (
            <button onClick={() => onRemind(doc)}
              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--cream-dark)", color: "var(--navy)" }}>
              Remind
            </button>
          )}
          {doc.status === "sent" && doc.envelopeId && onVoid && (
            <button onClick={() => onVoid(doc)}
              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "rgba(139,26,26,0.08)", color: "var(--danger)" }}>
              Void
            </button>
          )}

          {(doc.status === "signed" || doc.status === "completed") && doc.signedPdfUrl && (
            <a href={doc.signedPdfUrl} target="_blank" rel="noreferrer"
              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold text-center"
              style={{ background: "var(--gold)", color: "var(--navy)" }}>
              Download
            </a>
          )}

          {(doc.status === "signed" || doc.status === "completed") && !doc.signedPdfUrl && (
            <button onClick={() => onSign(doc)}
              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>
              View
            </button>
          )}

          <button onClick={() => onDelete(doc)}
            className="p-2 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            style={{ background: "rgba(139,26,26,0.08)", color: "var(--danger)" }} title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3,6 5,6 21,6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </div>
      </div>

      <AuditDrawer
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        entries={mergedAudit}
        loading={auditLoading}
        error={auditError}
      />
    </>
  );
}
