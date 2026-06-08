"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUserDocuments, uploadDocument, deleteDocument } from "@/lib/documents";
import {
  DEFAULT_SEND_PRESETS,
  WORKFLOW_SHORTCUTS,
  assignDocumentToProject,
  buildAttentionItems,
  createProjectFolder,
  filterDocumentsForWorkspace,
  recordActivity,
  renameDocument,
  saveContact,
  saveSendPreset,
  subscribeToActivity,
  subscribeToContacts,
  subscribeToProjects,
  subscribeToSendPresets,
  suggestDocumentName,
} from "@/lib/workspace";
import type { Document, ProjectFolder, SavedContact, SendPreset, WorkspaceActivity } from "@/lib/types";
import DocumentCard from "@/components/DocumentCard";
import UploadZone from "@/components/UploadZone";

type StatusFilter = "all" | Document["status"];
type SortOption = "newest" | "oldest" | "updated" | "name";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<ProjectFolder[]>([]);
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [presets, setPresets] = useState<SendPreset[]>([]);
  const [activity, setActivity] = useState<WorkspaceActivity[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [subKey, setSubKey] = useState(0);
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("updated");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [contactForm, setContactForm] = useState({ name: "", email: "", company: "", role: "" });
  const [presetForm, setPresetForm] = useState({
    name: "",
    subject: "",
    message: "",
    reminderDays: 2,
    expiresDays: 7,
  });
  const [renamingId, setRenamingId] = useState("");
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const unsubDocs = subscribeToUserDocuments(
      user.uid,
      (docs) => {
        setDocuments(docs);
        setDocsLoading(false);
        setDocsError(null);
      },
      (err) => {
        console.error("Failed to load documents:", err);
        setDocsLoading(false);
        setDocsError("Could not load your documents. Check your connection and try again.");
      }
    );
    const unsubProjects = subscribeToProjects(user.uid, setProjects);
    const unsubContacts = subscribeToContacts(user.uid, setContacts);
    const unsubPresets = subscribeToSendPresets(user.uid, setPresets);
    const unsubActivity = subscribeToActivity(user.uid, setActivity);
    return () => {
      unsubDocs();
      unsubProjects();
      unsubContacts();
      unsubPresets();
      unsubActivity();
    };
  }, [user, subKey]);

  const signed = useMemo(() => documents.filter((d) => d.status === "signed" || d.status === "completed"), [documents]);
  const outForSig = useMemo(() => documents.filter((d) => d.signingRequestId && d.status !== "signed" && d.status !== "completed"), [documents]);
  const active = useMemo(() => documents.filter((d) => !d.signingRequestId && d.status !== "signed" && d.status !== "completed"), [documents]);
  const attentionItems = useMemo(() => buildAttentionItems(documents).slice(0, 6), [documents]);
  const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId), [projects, selectedProjectId]);
  const selectedContact = useMemo(() => contacts.find((c) => c.id === selectedContactId), [contacts, selectedContactId]);
  const selectedWorkflow = useMemo(() => WORKFLOW_SHORTCUTS.find((w) => w.id === workflowId), [workflowId]);
  const visibleDocuments = useMemo(() => filterDocumentsForWorkspace(documents, {
    projectId: projectFilter,
    status: statusFilter,
    query,
    sort,
  }), [documents, projectFilter, query, sort, statusFilter]);

  const handleUpload = useCallback(async (files: File[]) => {
    if (!user || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      let firstDoc: Document | null = null;
      for (const file of files) {
        const suggestedName = selectedProject || selectedContact || selectedWorkflow
          ? suggestDocumentName({
              projectName: selectedProject?.name,
              contactName: selectedContact?.name,
              workflowName: selectedWorkflow?.templateHint,
              originalName: file.name,
            })
          : undefined;
        const newDoc = await uploadDocument(file, user.uid, user.email ?? "", {
          projectId: selectedProject?.id,
          projectName: selectedProject?.name,
          contactId: selectedContact?.id,
          contactName: selectedContact?.name,
          workflowId: selectedWorkflow?.id,
          workflowName: selectedWorkflow?.name,
          suggestedName,
        });
        firstDoc ??= newDoc;
      }
      if (firstDoc && files.length === 1) router.push(`/prepare?id=${firstDoc.id}`);
    } catch (e) {
      console.error("Upload failed:", e);
      const msg = e instanceof Error ? e.message : "Upload failed. Please try again.";
      setUploadError(msg.includes("storage/") ? "Upload failed - storage error. Please try again." : msg);
    } finally {
      setUploading(false);
    }
  }, [router, selectedContact, selectedProject, selectedWorkflow, user]);

  const handleDelete = useCallback(async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    await deleteDocument(doc.id, doc.storagePath);
  }, []);

  const handlePrepare = useCallback((doc: Document) => {
    router.push(doc.kind === "form" ? `/form?id=${doc.id}` : `/prepare?id=${doc.id}`);
  }, [router]);

  const handleSign = useCallback((doc: Document) => {
    router.push(doc.kind === "form" ? `/form?id=${doc.id}` : `/sign?id=${doc.id}`);
  }, [router]);

  const handleVoid = useCallback(async (doc: Document) => {
    if (!user || !doc.envelopeId || !confirm("Void this signing request?")) return;
    await fetch(`/api/envelopes/${doc.envelopeId}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: user.uid }),
    });
  }, [user]);

  const handleRemind = useCallback(async (doc: Document) => {
    if (!user || !doc.envelopeId) return;
    await fetch(`/api/envelopes/${doc.envelopeId}/remind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: user.uid }),
    });
    await recordActivity(user.uid, {
      documentId: doc.id,
      documentName: doc.name,
      projectId: doc.projectId,
      projectName: doc.projectName,
      contactName: doc.contactName,
      type: "reminded",
      label: `Sent reminder for ${doc.name}`,
    }).catch(() => {});
    alert("Reminder sent.");
  }, [user]);

  const handleCreateProject = useCallback(async () => {
    if (!user || !newProjectName.trim()) return;
    const id = await createProjectFolder(user.uid, newProjectName);
    setSelectedProjectId(id);
    setProjectFilter(id);
    setNewProjectName("");
  }, [newProjectName, user]);

  const handleSaveContact = useCallback(async () => {
    if (!user || !contactForm.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email.trim())) return;
    const id = await saveContact(user.uid, contactForm);
    setSelectedContactId(id);
    setContactForm({ name: "", email: "", company: "", role: "" });
  }, [contactForm, user]);

  const handleSavePreset = useCallback(async () => {
    if (!user || !presetForm.name.trim() || !presetForm.subject.trim()) return;
    await saveSendPreset(user.uid, presetForm);
    setPresetForm({ name: "", subject: "", message: "", reminderDays: 2, expiresDays: 7 });
  }, [presetForm, user]);

  const handleAssignProject = useCallback(async (doc: Document, projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    await assignDocumentToProject(doc.id, project);
    if (user) {
      await recordActivity(user.uid, {
        documentId: doc.id,
        documentName: doc.name,
        projectId: project?.id,
        projectName: project?.name,
        type: "project-assigned",
        label: project ? `Moved ${doc.name} to ${project.name}` : `Removed ${doc.name} from project`,
      }).catch(() => {});
    }
  }, [projects, user]);

  const startRename = (doc: Document) => {
    setRenamingId(doc.id);
    setRenameValue(doc.name.replace(/\.pdf$/i, ""));
  };

  const commitRename = async (doc: Document) => {
    const clean = renameValue.trim();
    if (!clean) return;
    const nextName = clean.toLowerCase().endsWith(".pdf") ? clean : `${clean}.pdf`;
    await renameDocument(doc.id, nextName);
    setRenamingId("");
    setRenameValue("");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      <header className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
        style={{ background: "var(--navy)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gold)" }}>
            <PenIcon />
          </div>
          <span className="font-display text-lg font-semibold" style={{ color: "var(--gold)" }}>SignToSeal</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/pricing")} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ color: "var(--gold)", border: "1px solid rgba(201,168,76,0.35)" }}>
            Pricing
          </button>
          <button onClick={() => router.push("/templates")} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{ color: "var(--gold)", border: "1px solid rgba(201,168,76,0.35)" }}>
            Templates
          </button>
          <span className="text-sm hidden sm:block" style={{ color: "rgba(250,247,240,0.7)" }}>
            {user.displayName ?? user.email}
          </span>
          <button onClick={logout} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(250,247,240,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-6 items-start">
          <aside className="space-y-4">
            <Panel title="Projects">
              <button onClick={() => setProjectFilter("all")} className="w-full text-left px-3 py-2 rounded-lg text-sm"
                style={projectFilter === "all" ? selectedStyle : quietStyle}>
                All documents ({documents.length})
              </button>
              <button onClick={() => setProjectFilter("unfiled")} className="w-full text-left px-3 py-2 rounded-lg text-sm"
                style={projectFilter === "unfiled" ? selectedStyle : quietStyle}>
                Unfiled ({documents.filter((d) => !d.projectId).length})
              </button>
              <div className="space-y-1 mt-2">
                {projects.map((project) => (
                  <button key={project.id} onClick={() => { setProjectFilter(project.id); setSelectedProjectId(project.id); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between"
                    style={projectFilter === project.id ? selectedStyle : quietStyle}>
                    <span className="truncate">{project.name}</span>
                    <span className="text-xs">{documents.filter((d) => d.projectId === project.id).length}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="New project"
                  className="min-w-0 flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                <button onClick={handleCreateProject} className="px-3 py-2 rounded-lg text-sm font-semibold" style={goldButtonStyle}>Add</button>
              </div>
            </Panel>

            <Panel title="Upload context">
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Project</label>
              <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full mb-3 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
                <option value="">No project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Contact</label>
              <select value={selectedContactId} onChange={(e) => setSelectedContactId(e.target.value)}
                className="w-full mb-3 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
                <option value="">No contact</option>
                {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name} - {contact.email}</option>)}
              </select>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Workflow</label>
              <select value={workflowId} onChange={(e) => setWorkflowId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
                <option value="">No workflow</option>
                {WORKFLOW_SHORTCUTS.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}
              </select>
            </Panel>
          </aside>

          <section className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total", value: documents.length, icon: "📁" },
                { label: "Awaiting", value: outForSig.length, icon: "✉️" },
                { label: "Active", value: active.length, icon: "🛠️" },
                { label: "Signed", value: signed.length, icon: "✅" },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-xl flex items-center gap-3" style={cardStyle}>
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <div className="text-2xl font-bold font-display" style={{ color: "var(--navy)" }}>{s.value}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <Panel title="Needs attention">
              {attentionItems.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No stuck documents right now.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attentionItems.map((item) => (
                    <button key={`${item.kind}-${item.document.id}`} onClick={() => item.kind === "needs-fields" ? handlePrepare(item.document) : handleSign(item.document)}
                      className="p-3 rounded-xl text-left transition-all hover:shadow-sm" style={{ background: "var(--cream)", border: "1px solid var(--border)" }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: "var(--gold)" }}>{item.label}</p>
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--navy)" }}>{item.document.name}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{item.detail}</p>
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Start a workflow">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {WORKFLOW_SHORTCUTS.map((workflow) => (
                  <button key={workflow.id} onClick={() => { setWorkflowId(workflow.id); router.push("/templates"); }}
                    className="p-3 rounded-xl text-left transition-all hover:shadow-sm" style={{ background: "var(--cream)", border: "1px solid var(--border)" }}>
                    <div className="text-2xl mb-2">{workflow.icon}</div>
                    <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{workflow.name}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{workflow.desc}</p>
                  </button>
                ))}
              </div>
            </Panel>

            <UploadZone onUpload={handleUpload} uploading={uploading} uploadError={uploadError} compact />

            {docsError && (
              <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}>
                <span className="text-xl flex-shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "#991b1b" }}>Could not load documents</p>
                  <p className="text-xs mt-0.5" style={{ color: "#b91c1c" }}>{docsError}</p>
                </div>
                <button onClick={() => { setDocsError(null); setDocsLoading(true); setSubKey((k) => k + 1); }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold flex-shrink-0" style={{ background: "#dc2626", color: "white" }}>
                  Retry
                </button>
              </div>
            )}

            <Panel title="Documents">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_150px_150px] gap-3 mb-4">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents, signers, projects..."
                  className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="prepared">Prepared</option>
                  <option value="sent">Sent</option>
                  <option value="signed">Signed</option>
                  <option value="completed">Completed</option>
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}
                  className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
                  <option value="updated">Recently updated</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                </select>
              </div>

              {docsLoading ? (
                <div className="flex justify-center py-16"><Spinner /></div>
              ) : visibleDocuments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">📄</div>
                  <p className="font-display text-lg font-medium" style={{ color: "var(--navy)" }}>No matching documents</p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Upload a PDF or adjust your filters.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleDocuments.map((doc) => (
                    <div key={doc.id} className="rounded-xl" style={{ border: "1px solid var(--border)" }}>
                      <div className="p-3 flex flex-col md:flex-row gap-2 md:items-center md:justify-between" style={{ background: "var(--cream)" }}>
                        <div className="flex flex-wrap items-center gap-2">
                          <select value={doc.projectId ?? ""} onChange={(e) => handleAssignProject(doc, e.target.value)}
                            className="px-2 py-1 rounded-lg text-xs outline-none" style={inputStyle}>
                            <option value="">No project</option>
                            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                          </select>
                          {doc.lastActivityLabel && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{doc.lastActivityLabel}</span>}
                        </div>
                        {renamingId === doc.id ? (
                          <div className="flex gap-2">
                            <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                              className="px-2 py-1 rounded-lg text-xs outline-none" style={inputStyle} />
                            <button onClick={() => commitRename(doc)} className="px-2 py-1 rounded-lg text-xs font-semibold" style={goldButtonStyle}>Save</button>
                            <button onClick={() => setRenamingId("")} className="px-2 py-1 rounded-lg text-xs" style={quietStyle}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => startRename(doc)} className="self-start md:self-auto px-2 py-1 rounded-lg text-xs" style={quietStyle}>
                            Rename
                          </button>
                        )}
                      </div>
                      <DocumentCard doc={doc} userId={user.uid} onPrepare={handlePrepare} onSign={handleSign} onDelete={handleDelete} onVoid={handleVoid} onRemind={handleRemind} />
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </section>

          <aside className="space-y-4">
            <Panel title="Contacts">
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {contacts.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Save frequent recipients for faster sending.</p>
                ) : contacts.map((contact) => (
                  <button key={contact.id} onClick={() => setSelectedContactId(contact.id)}
                    className="w-full text-left p-2 rounded-lg" style={selectedContactId === contact.id ? selectedStyle : quietStyle}>
                    <p className="text-sm font-semibold truncate">{contact.name}</p>
                    <p className="text-xs truncate">{contact.email}</p>
                    {(contact.company || contact.role) && <p className="text-xs truncate">{[contact.company, contact.role].filter(Boolean).join(" - ")}</p>}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <input value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                <input value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                <div className="grid grid-cols-2 gap-2">
                  <input value={contactForm.company} onChange={(e) => setContactForm((f) => ({ ...f, company: e.target.value }))} placeholder="Company"
                    className="min-w-0 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                  <input value={contactForm.role} onChange={(e) => setContactForm((f) => ({ ...f, role: e.target.value }))} placeholder="Role"
                    className="min-w-0 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                </div>
                <button onClick={handleSaveContact} className="w-full py-2 rounded-lg text-sm font-semibold" style={goldButtonStyle}>Save contact</button>
              </div>
            </Panel>

            <Panel title="Send settings">
              <div className="space-y-2 mb-4">
                {[...presets, ...DEFAULT_SEND_PRESETS.map((preset, index) => ({
                  ...preset,
                  id: `default-${index}`,
                  ownerId: user.uid,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }))].slice(0, 5).map((preset) => (
                  <div key={preset.id} className="p-2 rounded-lg" style={{ background: "var(--cream)", border: "1px solid var(--border)" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{preset.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{preset.subject}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Remind after {preset.reminderDays}d · Expires {preset.expiresDays}d</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <input value={presetForm.name} onChange={(e) => setPresetForm((f) => ({ ...f, name: e.target.value }))} placeholder="Preset name"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                <input value={presetForm.subject} onChange={(e) => setPresetForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Subject"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                <textarea value={presetForm.message} onChange={(e) => setPresetForm((f) => ({ ...f, message: e.target.value }))} placeholder="Message"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y" rows={3} style={inputStyle} />
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Remind" value={presetForm.reminderDays} onChange={(value) => setPresetForm((f) => ({ ...f, reminderDays: value }))} />
                  <NumberInput label="Expire" value={presetForm.expiresDays} onChange={(value) => setPresetForm((f) => ({ ...f, expiresDays: value }))} />
                </div>
                <button onClick={handleSavePreset} className="w-full py-2 rounded-lg text-sm font-semibold" style={goldButtonStyle}>Save preset</button>
              </div>
            </Panel>

            <Panel title="Recent activity">
              {activity.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Activity appears here as documents move.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {activity.map((item) => (
                    <div key={item.id} className="pl-3" style={{ borderLeft: "2px solid var(--gold)" }}>
                      <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>{item.label}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDateTime(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </aside>
        </div>
      </main>
    </div>
  );
}

const cardStyle = {
  background: "white",
  border: "1px solid var(--border)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

const inputStyle = {
  background: "white",
  border: "1px solid var(--border)",
  color: "var(--navy)",
};

const quietStyle = {
  background: "white",
  border: "1px solid var(--border)",
  color: "var(--navy)",
};

const selectedStyle = {
  background: "rgba(201,168,76,0.16)",
  border: "1px solid rgba(201,168,76,0.45)",
  color: "var(--navy)",
};

const goldButtonStyle = {
  background: "var(--gold)",
  color: "var(--navy)",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-4 rounded-xl" style={cardStyle}>
      <h2 className="font-display text-base font-semibold mb-3" style={{ color: "var(--navy)" }}>{title}</h2>
      {children}
    </section>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>{label} days</span>
      <input type="number" min={1} max={60} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
    </label>
  );
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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
