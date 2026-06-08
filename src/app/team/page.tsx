"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TeamDoc {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
}

export default function TeamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<TeamDoc[]>([]);
  const [teamName, setTeamName] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const q = query(collection(db, "teams"), where("memberIds", "array-contains", user.uid));
      const snap = await getDocs(q);
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamDoc)));
    })();
  }, [user]);

  const createTeam = async () => {
    if (!user || !teamName.trim()) return;
    await addDoc(collection(db, "teams"), {
      name: teamName.trim(),
      ownerId: user.uid,
      memberIds: [user.uid],
      createdAt: Timestamp.now(),
    });
    setTeamName("");
    router.refresh();
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen px-6 py-10 max-w-lg mx-auto" style={{ background: "var(--cream)" }}>
      <button onClick={() => router.push("/dashboard")} className="text-sm mb-4">← Dashboard</button>
      <h1 className="font-display text-2xl font-bold mb-4" style={{ color: "var(--navy)" }}>Team Workspace</h1>
      {teams.map((t) => (
        <div key={t.id} className="p-4 rounded-xl mb-3" style={{ background: "white", border: "1px solid var(--border)" }}>
          <p className="font-semibold" style={{ color: "var(--navy)" }}>{t.name}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.memberIds.length} members</p>
        </div>
      ))}
      <div className="mt-6">
        <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name"
          className="w-full px-4 py-3 rounded-xl border mb-3 text-sm" />
        <button onClick={createTeam} className="w-full py-3 rounded-xl font-semibold"
          style={{ background: "var(--gold)", color: "var(--navy)" }}>
          Create Team
        </button>
      </div>
    </div>
  );
}
