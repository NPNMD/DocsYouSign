"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateWebhookSecret } from "@/lib/webhooks-client";

export default function WebhooksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [loading, user, router]);

  const handleSave = async () => {
    if (!user || !url.trim()) return;
    await addDoc(collection(db, "webhookSubscriptions"), {
      userId: user.uid,
      url: url.trim(),
      events: ["envelope.sent", "envelope.completed", "envelope.declined", "envelope.voided"],
      secret: generateWebhookSecret(),
      createdAt: Timestamp.now(),
    });
    setSaved(true);
  };

  return (
    <div className="min-h-screen px-6 py-10 max-w-lg mx-auto" style={{ background: "var(--cream)" }}>
      <button onClick={() => router.push("/dashboard")} className="text-sm mb-4">← Dashboard</button>
      <h1 className="font-display text-2xl font-bold mb-4" style={{ color: "var(--navy)" }}>Webhooks</h1>
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        Receive POST notifications when envelope events occur.
      </p>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-server.com/webhook"
        className="w-full px-4 py-3 rounded-xl border mb-4 text-sm" />
      <button onClick={handleSave} className="w-full py-3 rounded-xl font-semibold"
        style={{ background: "var(--navy)", color: "var(--gold)" }}>
        Add Webhook
      </button>
      {saved && <p className="text-sm mt-3" style={{ color: "var(--success)" }}>Webhook saved.</p>}
    </div>
  );
}
