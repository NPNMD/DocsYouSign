"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import Link from "next/link";

interface ApiKeyRow {
  id: string;
  label: string;
  keyPrefix: string;
  createdAt: string | null;
}

export default function ApiKeysPage() {
  const { user, loading, authedFetch } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await authedFetch("/api/account/api-keys");
    if (!res.ok) return;
    const data = await res.json();
    setKeys((data.keys ?? []) as ApiKeyRow[]);
  }, [authedFetch]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- load keys when auth ready
      load();
    }
  }, [user, load]);

  const createKey = async () => {
    if (!label.trim()) return;
    setBusy(true);
    try {
      const res = await authedFetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });
      const data = await res.json();
      if (data.key) {
        setNewKey(data.key as string);
        setLabel("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this API key?")) return;
    await authedFetch(`/api/account/api-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>Loading…</div>;
  }

  return (
    <AppShell title="API Keys" subtitle="Create keys for the public envelopes API (Team plan)">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Keys are stored hashed. You will only see the full key once at creation. Send requests with header{" "}
          <code className="px-1 py-0.5 rounded" style={{ background: "var(--cream-dark)" }}>x-api-key</code>.
        </p>

        {newKey && (
          <div className="p-4 rounded-xl" style={{ background: "rgba(26,107,71,0.1)", border: "1px solid rgba(26,107,71,0.3)" }}>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>Copy your new API key now — it won&apos;t be shown again.</p>
            <code className="block text-xs break-all p-2 rounded" style={{ background: "white" }}>{newKey}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(newKey)} className="mt-2 text-xs font-semibold underline">Copy</button>
          </div>
        )}

        <div className="flex gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Key label (e.g. Production)"
            className="flex-1 px-4 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)" }} />
          <button type="button" onClick={createKey} disabled={busy || !label.trim()}
            className="px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
            style={{ background: "var(--navy)", color: "var(--gold)" }}>
            Create key
          </button>
        </div>

        <ul className="space-y-2">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "white", border: "1px solid var(--border)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{k.label}</p>
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{k.keyPrefix}</p>
              </div>
              <button type="button" onClick={() => revoke(k.id)} className="text-xs font-semibold" style={{ color: "var(--danger)" }}>Revoke</button>
            </li>
          ))}
        </ul>

        <Link href="/settings/webhooks" className="text-sm underline" style={{ color: "var(--navy)" }}>Webhook settings →</Link>
      </div>
    </AppShell>
  );
}
