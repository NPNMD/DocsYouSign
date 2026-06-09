"use client";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useState } from "react";

export default function AccountSettingsPage() {
  const { user, authedFetch, logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const exportData = async () => {
    setExporting(true);
    setMessage("");
    try {
      const res = await authedFetch("/api/account");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signtoseal-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    } catch {
      setMessage("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Delete all your documents and account data? This cannot be undone. Type DELETE in the next prompt.")) return;
    const typed = prompt('Type DELETE to confirm account deletion');
    if (typed !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await authedFetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (res.ok) {
        await logout();
        window.location.href = "/";
      } else {
        setMessage("Deletion failed.");
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <AppShell title="Account & Privacy" subtitle="Export or delete your data">
      <div className="max-w-xl mx-auto px-6 py-8 space-y-6">
        <section className="p-5 rounded-xl" style={{ background: "white", border: "1px solid var(--border)" }}>
          <h2 className="font-semibold mb-2" style={{ color: "var(--navy)" }}>Export your data</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Download a JSON export of your documents and billing metadata (GDPR/CCPA).
          </p>
          <button onClick={exportData} disabled={exporting}
            className="px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
            style={{ background: "var(--navy)", color: "var(--gold)" }}>
            {exporting ? "Exporting…" : "Download export"}
          </button>
        </section>

        <section className="p-5 rounded-xl" style={{ background: "white", border: "1px solid var(--border)" }}>
          <h2 className="font-semibold mb-2" style={{ color: "var(--danger)" }}>Delete account</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Permanently deletes your documents, saved signatures, and billing record. Cancel any active subscription in{" "}
            <Link href="/pricing" className="underline">Manage Billing</Link> first.
          </p>
          <button onClick={deleteAccount} disabled={deleting}
            className="px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
            style={{ background: "var(--danger)", color: "white" }}>
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </section>

        {message && <p className="text-sm" style={{ color: "var(--navy)" }} role="status">{message}</p>}

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Retention: signed documents are kept until you delete them or your account. See our{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </AppShell>
  );
}
