"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { saveFields } from "@/lib/documents";
import { sendSigningInvite } from "@/lib/signing";
import { billingErrorMessage, useBilling } from "@/lib/billing-client";
import {
  DEFAULT_SEND_PRESETS,
  recordActivity,
  saveContact,
  subscribeToContacts,
  subscribeToSendPresets,
  touchContact,
} from "@/lib/workspace";
import type { Document, DocumentField, FieldType, SavedContact, SendPreset } from "@/lib/types";
import dynamic from "next/dynamic";

const PDFRenderer = dynamic(() => import("@/components/PDFRenderer"), { ssr: false });

const FIELD_TYPES: { type: FieldType; label: string; icon: string; desc: string; color: string }[] = [
  { type: "signature", label: "Signature", icon: "✍️", desc: "Full signature",    color: "var(--gold)" },
  { type: "initials",  label: "Initials",  icon: "AB", desc: "Initials only",     color: "#3b82f6" },
  { type: "date",      label: "Date",      icon: "📅", desc: "Auto-filled date",  color: "#22c55e" },
  { type: "text",      label: "Text",      icon: "T",  desc: "Free text field",   color: "#a855f7" },
  { type: "checkbox",  label: "Checkbox",  icon: "☑",  desc: "Yes / no toggle",   color: "#0f766e" },
];

function PreparePageInner() {
  const { user, loading, authedFetch } = useAuth();
  const billing = useBilling(user?.uid);
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get("id");

  const [document, setDocument] = useState<Document | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [placingType, setPlacingType] = useState<FieldType | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [recipName, setRecipName] = useState("");
  const [recipEmail, setRecipEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [presets, setPresets] = useState<SendPreset[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [saveRecipient, setSaveRecipient] = useState(true);
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

  useEffect(() => {
    if (!user) return;
    const unsubContacts = subscribeToContacts(user.uid, setContacts);
    const unsubPresets = subscribeToSendPresets(user.uid, setPresets);
    return () => {
      unsubContacts();
      unsubPresets();
    };
  }, [user]);

  const handlePlace = useCallback((field: DocumentField) => {
    setFields(prev => [
      ...prev,
      field.type === "date" ? { ...field, autoDate: true } : field,
    ]);
  }, []);

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, x, y } : f));
  }, []);

  const handleResize = useCallback((id: string, width: number, height: number) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, width, height } : f));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  }, []);

  const duplicateLastField = useCallback(() => {
    const last = fields[fields.length - 1];
    if (!last) return;
    setFields(prev => [
      ...prev,
      {
        ...last,
        id: crypto.randomUUID(),
        x: Math.min(last.x + 2, 100 - last.width),
        y: Math.min(last.y + 2, 100 - last.height),
      },
    ]);
  }, [fields]);

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

  const sendForSignature = async () => {
    if (!user || !document) return;
    const email = recipEmail.trim().toLowerCase();
    if (!recipName.trim()) { setSendError("Enter recipient name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setSendError("Enter valid email."); return; }
    if (fields.filter(f => f.type === "signature").length === 0) {
      setSendError("Place at least one signature field first."); return;
    }
    setSendError("");
    setSending(true);
    try {
      await saveFields(document.id, fields, pageCount);
      const res = await authedFetch("/api/envelopes/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          documentName: document.name,
          recipientName: recipName.trim(),
          recipientEmail: email,
          subject: subject.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      if (res.status === 402) {
        const err = await res.json().catch(() => ({}));
        setSendError(billingErrorMessage((err as { error?: string }).error));
        setSending(false);
        return;
      }
      if (!res.ok) throw new Error("send-failed");
      const data = (await res.json()) as { signingUrl: string; token: string };
      await sendSigningInvite(email, data.token).catch(() => {});
      if (selectedContactId) {
        await touchContact(selectedContactId).catch(() => {});
      } else if (saveRecipient) {
        await saveContact(user.uid, { name: recipName.trim(), email }).catch(() => {});
      }
      await recordActivity(user.uid, {
        documentId: document.id,
        documentName: document.name,
        projectId: document.projectId,
        projectName: document.projectName,
        contactName: recipName.trim(),
        type: "sent",
        label: `Sent ${document.name} to ${recipName.trim()}`,
      }).catch(() => {});
      setSentLink(data.signingUrl);
    } catch {
      setSendError("Could not send. Try again.");
    } finally {
      setSending(false);
    }
  };

  const allPresets: SendPreset[] = [
    ...presets,
    ...DEFAULT_SEND_PRESETS.map((preset, index) => ({
      ...preset,
      id: `default-${index}`,
      ownerId: user?.uid ?? "",
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  ];

  const chooseContact = (contactId: string) => {
    setSelectedContactId(contactId);
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    setRecipName(contact.name);
    setRecipEmail(contact.email);
  };

  const choosePreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = allPresets.find((p) => p.id === presetId);
    if (!preset) return;
    setSubject(preset.subject);
    setMessage(preset.message);
  };

  if (loading || !user || docLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <Spinner />
      </div>
    );
  }
  if (!document) return null;

  const sigCount  = fields.filter(f => f.type === "signature").length;
  const initCount = fields.filter(f => f.type === "initials").length;
  const dateCount = fields.filter(f => f.type === "date").length;

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
            <p className="text-xs" style={{ color: "rgba(250,247,240,0.4)" }}>Prepare — place fields on</p>
            <p className="font-medium text-sm truncate max-w-xs" style={{ color: "var(--cream)" }}>
              {document.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs" style={{ color: "rgba(250,247,240,0.5)" }}>
            <span>{sigCount} sig{sigCount !== 1 ? "s" : ""}</span>
            <span>·</span><span>{initCount} initial{initCount !== 1 ? "s" : ""}</span>
            <span>·</span><span>{dateCount} date{dateCount !== 1 ? "s" : ""}</span>
          </div>
          <button onClick={() => { setShowSend(true); setSentLink(""); setSendError(""); }}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold"
            style={{ color: "var(--gold)", border: "1px solid rgba(201,168,76,0.4)" }}>
            Send for Signature
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "var(--gold)", color: "var(--navy)" }}>
            {saving ? "Saving…" : fields.length === 0 ? "Skip & Save" : "Save & Continue →"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 flex-shrink-0 overflow-y-auto p-4 flex flex-col gap-3"
          style={{ background: "white", borderRight: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Fields</p>
          <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--text-muted)" }}>
            Click a type below, then click on the PDF to place it.
          </p>

          {FIELD_TYPES.map(({ type, label, icon, desc, color }) => (
            <button key={type}
              onClick={() => setPlacingType(placingType === type ? null : type)}
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
              style={{
                border: `2px solid ${placingType === type ? color : "var(--border)"}`,
                background: placingType === type ? `${color}15` : "var(--cream)",
              }}>
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
                  {fields.map(f => (
                    <div key={f.id} className="flex items-center justify-between text-xs py-1 px-2 rounded"
                      style={{ background: "var(--cream-dark)" }}>
                      <span style={{ color: "var(--navy)" }}>
                        {FIELD_TYPES.find(ft => ft.type === f.type)?.icon} {FIELD_TYPES.find(ft => ft.type === f.type)?.label} (p.{f.page})
                      </span>
                      <button onClick={() => handleDelete(f.id)} style={{ color: "var(--danger)" }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={duplicateLastField}
                className="text-xs py-1.5 px-3 rounded-lg mt-1 w-full"
                style={{ background: "rgba(10,22,40,0.06)", color: "var(--navy)" }}>
                Duplicate last field
              </button>
              <button onClick={() => setFields([])}
                className="text-xs py-1.5 px-3 rounded-lg mt-1"
                style={{ background: "rgba(139,26,26,0.08)", color: "var(--danger)" }}>
                Clear all
              </button>
            </>
          )}
        </aside>

        {/* PDF */}
        <main className="flex-1 overflow-y-auto p-4" style={{ background: "#525659" }}>
          {placingType && (
            <div className="sticky top-0 z-20 mb-3 px-4 py-2 rounded-lg text-sm font-medium text-center"
              style={{ background: "rgba(201,168,76,0.95)", color: "var(--navy)" }}>
              Click anywhere on the PDF to place a <strong>{FIELD_TYPES.find(f => f.type === placingType)?.label}</strong> field
              <button onClick={() => setPlacingType(null)} className="ml-3 underline text-xs opacity-70">Cancel</button>
            </div>
          )}
          {pageCount > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-1">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: currentPage === page ? "var(--gold)" : "rgba(255,255,255,0.12)",
                    color: currentPage === page ? "var(--navy)" : "rgba(255,255,255,0.85)",
                    border: currentPage === page ? "none" : "1px solid rgba(255,255,255,0.2)",
                  }}
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  Page {page}
                </button>
              ))}
            </div>
          )}
          <PDFRenderer
            url={document.storageUrl}
            fields={fields}
            mode="prepare"
            currentPage={pageCount > 1 ? currentPage : undefined}
            onPageSelect={setCurrentPage}
            onPageCount={(n) => {
              setPageCount(n);
              setCurrentPage((p) => Math.min(p, Math.max(1, n)));
            }}
            onFieldPlace={handlePlace}
            onFieldMove={handleMove}
            onFieldResize={handleResize}
            onFieldDelete={handleDelete}
            placingType={placingType}
          />
        </main>
      </div>

      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: "white" }}>
            <h2 className="font-display text-lg font-bold mb-4" style={{ color: "var(--navy)" }}>Send for Signature</h2>
            {sentLink ? (
              <div>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🔗</div>
                  <h2 className="font-display text-xl font-bold" style={{ color: "var(--navy)" }}>
                    Signing link ready
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    Share this link with {recipName || "the recipient"}. They can open it and sign immediately — no account or login required.
                  </p>
                </div>
                <div className="flex gap-2 mb-4">
                  <input readOnly value={sentLink}
                    className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--cream)", border: "1px solid var(--border)", color: "var(--navy)" }} />
                  <button onClick={() => navigator.clipboard?.writeText(sentLink)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{ background: "var(--navy)", color: "var(--gold)" }}>
                    Copy
                  </button>
                </div>
                <button onClick={() => { setShowSend(false); router.push("/dashboard"); }}
                  className="w-full py-3 rounded-xl font-semibold" style={{ background: "var(--navy)", color: "var(--gold)" }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                {sigCount === 0 && (
                  <div className="mb-4 px-3 py-2.5 rounded-xl text-xs font-medium"
                    style={{ background: "rgba(139,26,26,0.08)", color: "var(--danger)", border: "1px solid rgba(139,26,26,0.15)" }}>
                    Place at least one signature field on the document before sending.
                  </div>
                )}
                {!billing.loading && billing.remaining > 0 && (
                  <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                    This will use 1 of {billing.remaining} envelope{billing.remaining !== 1 ? "s" : ""}.
                  </p>
                )}
                {contacts.length > 0 && (
                  <select value={selectedContactId} onChange={(e) => chooseContact(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm mb-3 border">
                    <option value="">Choose saved contact</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>{contact.name} - {contact.email}</option>
                    ))}
                  </select>
                )}
                <input value={recipName} onChange={(e) => { setRecipName(e.target.value); setSelectedContactId(""); }} placeholder="Recipient name"
                  className="w-full px-4 py-3 rounded-xl text-sm mb-3 border" />
                <input value={recipEmail} onChange={(e) => { setRecipEmail(e.target.value); setSelectedContactId(""); }} placeholder="Recipient email"
                  className="w-full px-4 py-3 rounded-xl text-sm mb-3 border" />
                <select value={selectedPresetId} onChange={(e) => choosePreset(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm mb-3 border">
                  <option value="">Choose message preset</option>
                  {allPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                  ))}
                </select>
                <input value={subject} onChange={(e) => { setSubject(e.target.value); setSelectedPresetId(""); }} placeholder="Email subject"
                  className="w-full px-4 py-3 rounded-xl text-sm mb-3 border" />
                <textarea value={message} onChange={(e) => { setMessage(e.target.value); setSelectedPresetId(""); }} placeholder="Message"
                  className="w-full px-4 py-3 rounded-xl text-sm mb-3 border resize-y" rows={3} />
                {!selectedContactId && (
                  <label className="flex items-center gap-2 text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                    <input type="checkbox" checked={saveRecipient} onChange={(e) => setSaveRecipient(e.target.checked)} />
                    Save this recipient to contacts
                  </label>
                )}
                {sendError && <p className="text-xs mb-2" style={{ color: "var(--danger)" }}>{sendError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setShowSend(false)} className="flex-1 py-2 rounded-lg border">Cancel</button>
                  <button onClick={sendForSignature} disabled={sending || sigCount === 0}
                    className="flex-1 py-2 rounded-lg font-semibold disabled:opacity-50"
                    style={{ background: "var(--gold)", color: "var(--navy)" }}>
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PreparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}><Spinner /></div>}>
      <PreparePageInner />
    </Suspense>
  );
}

function Spinner() {
  return <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
    style={{ borderColor: "var(--navy-mid)", borderTopColor: "transparent" }} />;
}
