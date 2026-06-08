"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUserTemplates, createCustomTemplate, deleteCustomTemplate, createDocumentFromCustomTemplate } from "@/lib/documents";
import type { CustomTemplate } from "@/lib/types";

export default function CustomTemplatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    return subscribeToUserTemplates(user.uid, setTemplates);
  }, [user]);

  const handleCreate = async () => {
    if (!user || !name.trim() || !bodyHtml.trim()) return;
    await createCustomTemplate(user.uid, { name: name.trim(), category: "Business", bodyHtml });
    setShowCreate(false);
    setName("");
    setBodyHtml("");
  };

  const handleUse = async (t: CustomTemplate) => {
    if (!user) return;
    const doc = await createDocumentFromCustomTemplate(t, user.uid, user.email ?? "");
    router.push(`/form?id=${doc.id}`);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen px-6 py-10" style={{ background: "var(--cream)" }}>
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push("/templates")} className="text-sm mb-4" style={{ color: "var(--navy)" }}>← Templates</button>
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display text-2xl font-bold" style={{ color: "var(--navy)" }}>My Templates</h1>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--gold)", color: "var(--navy)" }}>+ New</button>
        </div>
        {templates.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>No custom templates yet.</p>}
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="p-4 rounded-xl flex justify-between items-center"
              style={{ background: "white", border: "1px solid var(--border)" }}>
              <div>
                <p className="font-semibold" style={{ color: "var(--navy)" }}>{t.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.category}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleUse(t)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--navy)", color: "var(--gold)" }}>Use</button>
                <button onClick={() => deleteCustomTemplate(t.id)} className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ color: "var(--danger)" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="w-full max-w-lg p-6 rounded-2xl" style={{ background: "white" }}>
              <h2 className="font-bold mb-4" style={{ color: "var(--navy)" }}>New Custom Template</h2>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name"
                className="w-full px-4 py-3 rounded-xl border mb-3 text-sm" />
              <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} placeholder="Agreement body (HTML)"
                rows={8} className="w-full px-4 py-3 rounded-xl border mb-4 text-sm" />
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border">Cancel</button>
                <button onClick={handleCreate} className="flex-1 py-2 rounded-lg font-semibold"
                  style={{ background: "var(--gold)", color: "var(--navy)" }}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
