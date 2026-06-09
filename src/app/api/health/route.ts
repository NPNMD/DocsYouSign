import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight liveness probe for uptime monitoring and deploy health checks. */
export async function GET() {
  let firestoreOk = false;
  try {
    await adminDb.collection("_health").doc("ping").get();
    firestoreOk = true;
  } catch {
    firestoreOk = false;
  }

  return NextResponse.json({
    status: firestoreOk ? "ok" : "degraded",
    service: "signtoseal",
    firestore: firestoreOk ? "ok" : "error",
    time: new Date().toISOString(),
  });
}
