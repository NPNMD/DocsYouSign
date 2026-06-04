"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const { signInWithGoogle } = useAuth();
  const [signing, setSigning] = useState(false);

  const handleSignIn = async () => {
    setSigning(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--navy)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: "rgba(201,168,76,0.15)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gold)" }}>
            <PenIcon />
          </div>
          <span className="font-display text-xl font-semibold" style={{ color: "var(--gold)" }}>
            DocsYouSign
          </span>
        </div>
        <button
          onClick={handleSignIn}
          disabled={signing}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-90"
          style={{ background: "var(--gold)", color: "var(--navy)" }}
        >
          {signing ? "Signing in…" : "Sign In"}
        </button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center" style={{ paddingTop: "80px", paddingBottom: "120px" }}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
          style={{ background: "rgba(201,168,76,0.12)", color: "var(--gold)", border: "1px solid rgba(201,168,76,0.25)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--gold)" }} />
          Personal · Secure · Simple
        </div>

        {/* Heading */}
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6" style={{ color: "var(--cream)" }}>
          Sign documents
          <br />
          <span style={{ color: "var(--gold)" }}>your way.</span>
        </h1>

        <p className="max-w-xl text-lg leading-relaxed mb-10" style={{ color: "rgba(250,247,240,0.6)" }}>
          Upload PDFs, add your signature, and manage all your personal documents in one private, secure place. No subscriptions. No bloat.
        </p>

        {/* CTA */}
        <button
          onClick={handleSignIn}
          disabled={signing}
          className="group flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200 hover:scale-105 active:scale-100"
          style={{
            background: "var(--gold)",
            color: "var(--navy)",
            boxShadow: "0 0 40px rgba(201,168,76,0.3)",
          }}
        >
          <GoogleIcon />
          {signing ? "Connecting…" : "Continue with Google"}
        </button>

        <p className="mt-4 text-xs" style={{ color: "rgba(250,247,240,0.35)" }}>
          Your documents never leave your account
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 max-w-3xl w-full text-left">
          {[
            { icon: "📄", title: "Upload PDFs", desc: "Drag & drop any PDF document to get started instantly." },
            { icon: "✍️", title: "Sign with style", desc: "Draw your signature directly on any document page." },
            { icon: "🔒", title: "Private & secure", desc: "Documents stored in your personal Firebase vault." },
          ].map((f) => (
            <div key={f.title} className="p-5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}>
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-display font-semibold text-base mb-1" style={{ color: "var(--cream)" }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(250,247,240,0.5)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs" style={{ color: "rgba(250,247,240,0.25)", borderTop: "1px solid rgba(201,168,76,0.08)" }}>
        DocsYouSign — Personal use only
      </footer>
    </div>
  );
}

function PenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
