"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf7f0", padding: 24 }}>
          <div style={{ maxWidth: 420, width: "100%", padding: 32, borderRadius: 16, textAlign: "center", background: "white", border: "1px solid #e2ddd0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0a1628", marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#6b7a96", marginBottom: 24 }}>
              A critical error occurred. Please reload the page.
            </p>
            <button onClick={reset} style={{ padding: "10px 20px", borderRadius: 12, fontWeight: 600, background: "#c9a84c", color: "#0a1628", border: "none", cursor: "pointer" }}>
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
