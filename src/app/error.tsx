"use client";
import { useEffect } from "react";
import { captureException } from "@/lib/sentry";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureException(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--cream)" }}>
      <div className="max-w-md w-full p-8 rounded-2xl text-center" style={{ background: "white", border: "1px solid var(--border)" }}>
        <div className="text-4xl mb-3">⚠️</div>
        <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--navy)" }}>
          Something went wrong
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          An unexpected error occurred. You can try again, and if it keeps happening, contact support.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-5 py-2.5 rounded-xl font-semibold"
            style={{ background: "var(--gold)", color: "var(--navy)" }}>
            Try again
          </button>
          <a href="/dashboard" className="px-5 py-2.5 rounded-xl font-semibold"
            style={{ background: "white", color: "var(--navy)", border: "2px solid var(--navy)" }}>
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
