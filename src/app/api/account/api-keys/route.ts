import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { verifyRequestAuth, unauthorized } from "@/lib/auth-server";
import { hashApiKey } from "@/lib/api-key-hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await verifyRequestAuth(req);
  if (!auth) return unauthorized();

  const snap = await adminDb.collection("apiKeys").where("userId", "==", auth.uid).get();
  const keys = snap.docs.map((d) => ({
    id: d.id,
    label: d.data().label,
    keyPrefix: d.data().keyPrefix,
    createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? null,
  }));
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const auth = await verifyRequestAuth(req);
  if (!auth) return unauthorized();

  let body: { label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (!body.label?.trim()) return NextResponse.json({ error: "missing-label" }, { status: 400 });

  const raw = `sk_${randomBytes(24).toString("hex")}`;
  const ref = await adminDb.collection("apiKeys").add({
    userId: auth.uid,
    email: auth.email,
    label: body.label.trim(),
    keyHash: hashApiKey(raw),
    keyPrefix: `${raw.slice(0, 12)}…`,
    createdAt: Timestamp.now(),
  });

  return NextResponse.json({ id: ref.id, key: raw, keyPrefix: `${raw.slice(0, 12)}…` });
}

export async function DELETE(req: Request) {
  const auth = await verifyRequestAuth(req);
  if (!auth) return unauthorized();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing-id" }, { status: 400 });

  const snap = await adminDb.collection("apiKeys").doc(id).get();
  if (!snap.exists || snap.data()!.userId !== auth.uid) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  await snap.ref.delete();
  return NextResponse.json({ ok: true });
}
