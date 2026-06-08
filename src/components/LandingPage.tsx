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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--navy)", fontFamily: "var(--font-body, DM Sans, sans-serif)" }}>
      {/* ── Nav ────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 md:px-10 py-5 border-b sticky top-0 z-50"
        style={{ borderColor: "rgba(201,168,76,0.15)", background: "rgba(10,22,40,0.92)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{ background: "var(--gold)" }}>
            <SealIcon />
          </div>
          <span className="font-display text-xl font-bold tracking-tight" style={{ color: "var(--gold)" }}>
            SignToSeal
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: "rgba(250,247,240,0.55)" }}>
          <a href="#features" className="hover:opacity-100 transition-opacity">Features</a>
          <a href="#why" className="hover:opacity-100 transition-opacity">Why Us</a>
          <a href="#compare" className="hover:opacity-100 transition-opacity">vs DocuSign</a>
        </div>

        <button
          onClick={handleSignIn}
          disabled={signing}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-95"
          style={{ background: "var(--gold)", color: "var(--navy)" }}
        >
          {signing ? "Signing in…" : "Start Free Trial"}
        </button>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingTop: "100px", paddingBottom: "80px" }}>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{ background: "rgba(201,168,76,0.1)", color: "var(--gold)", border: "1px solid rgba(201,168,76,0.3)" }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--gold)" }} />
          From $12/mo · 40+ templates · 7-day free trial
        </div>

        <h1 className="font-display font-bold leading-tight mb-6 max-w-3xl"
          style={{ fontSize: "clamp(2.6rem, 6vw, 5rem)", color: "var(--cream)" }}>
          Sign, send &amp;{" "}
          <span style={{ color: "var(--gold)" }}>seal</span>{" "}
          every document.
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed mb-10"
          style={{ color: "rgba(250,247,240,0.6)" }}>
          Upload PDFs, use ready-made legal templates, draw your signature, and send documents
          to others for signing — all from one clean, private workspace.
          <strong style={{ color: "rgba(250,247,240,0.85)" }}> Starting at $12/mo — 70% less than DocuSign.</strong>
        </p>

        <button
          onClick={handleSignIn}
          disabled={signing}
          className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200 hover:scale-105 active:scale-100"
          style={{
            background: "var(--gold)",
            color: "var(--navy)",
            boxShadow: "0 0 50px rgba(201,168,76,0.35), 0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          <GoogleIcon />
          {signing ? "Connecting…" : "Get started with Google"}
        </button>
        <p className="mt-4 text-xs" style={{ color: "rgba(250,247,240,0.3)" }}>
          7-day free trial · No credit card required to start
        </p>

        {/* Mini stats row */}
        <div className="flex flex-wrap items-center justify-center gap-8 mt-16">
          {[
            { value: "$12", label: "Per month" },
            { value: "40+", label: "Templates" },
            { value: "7d", label: "Free trial" },
            { value: "🔒", label: "Private vault" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl font-bold" style={{ color: "var(--gold)" }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: "rgba(250,247,240,0.4)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="px-6 md:px-10 py-20 max-w-6xl mx-auto w-full">
        <SectionLabel text="Everything you need" />
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-center" style={{ color: "var(--cream)" }}>
          One app. Every signing workflow.
        </h2>
        <p className="text-center max-w-xl mx-auto mb-14" style={{ color: "rgba(250,247,240,0.5)" }}>
          From quick personal signatures to sending contracts to clients — SignToSeal handles it all at a fraction of DocuSign&apos;s price.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── Why Us ─────────────────────────────────────────── */}
      <section id="why" className="px-6 md:px-10 py-20"
        style={{ background: "rgba(201,168,76,0.04)", borderTop: "1px solid rgba(201,168,76,0.1)", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
        <div className="max-w-5xl mx-auto">
          <SectionLabel text="Why SignToSeal" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-center" style={{ color: "var(--cream)" }}>
            Document signing shouldn&apos;t cost a fortune.
          </h2>
          <p className="text-center max-w-2xl mx-auto mb-14" style={{ color: "rgba(250,247,240,0.5)" }}>
            Most e-signature tools charge $30–$45/month for basic features. SignToSeal starts at $12 with 40+ built-in templates.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {WHY_US.map((item) => (
              <div key={item.headline} className="flex gap-4 p-6 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}>
                <div className="text-3xl flex-shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <h3 className="font-display font-semibold text-base mb-1" style={{ color: "var(--cream)" }}>{item.headline}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(250,247,240,0.5)" }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison Table ───────────────────────────────── */}
      <section id="compare" className="px-6 md:px-10 py-20 max-w-5xl mx-auto w-full">
        <SectionLabel text="How we compare" />
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-center" style={{ color: "var(--cream)" }}>
          SignToSeal vs the alternatives
        </h2>
        <p className="text-center max-w-xl mx-auto mb-12" style={{ color: "rgba(250,247,240,0.5)" }}>
          Why pay $45/month when SignToSeal starts at $12?
        </p>

        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(201,168,76,0.15)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(201,168,76,0.08)", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
                <th className="text-left px-6 py-4 font-semibold" style={{ color: "rgba(250,247,240,0.5)" }}>Feature</th>
                <th className="px-6 py-4 font-bold text-center" style={{ color: "var(--gold)" }}>SignToSeal ✦</th>
                <th className="px-6 py-4 font-medium text-center" style={{ color: "rgba(250,247,240,0.4)" }}>DocuSign</th>
                <th className="px-6 py-4 font-medium text-center" style={{ color: "rgba(250,247,240,0.4)" }}>HelloSign</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, i) => (
                <tr key={row.feature}
                  style={{
                    borderBottom: i < COMPARE_ROWS.length - 1 ? "1px solid rgba(201,168,76,0.07)" : "none",
                    background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                  }}>
                  <td className="px-6 py-4" style={{ color: "rgba(250,247,240,0.7)" }}>{row.feature}</td>
                  <td className="px-6 py-4 text-center font-semibold">
                    <CompareCell value={row.us} highlight />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <CompareCell value={row.docusign} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <CompareCell value={row.hellosign} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: "rgba(250,247,240,0.25)" }}>
          Pricing data based on published plans as of 2026. Plans change — always verify on their sites.
        </p>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section className="px-6 md:px-10 py-20"
        style={{ background: "rgba(201,168,76,0.04)", borderTop: "1px solid rgba(201,168,76,0.1)" }}>
        <div className="max-w-4xl mx-auto">
          <SectionLabel text="Simple by design" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-center" style={{ color: "var(--cream)" }}>
            Up and running in 60 seconds
          </h2>
          <p className="text-center max-w-xl mx-auto mb-14" style={{ color: "rgba(250,247,240,0.5)" }}>
            No onboarding wizard. Start your 7-day trial in 60 seconds.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center p-6 rounded-2xl relative"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm mb-4"
                  style={{ background: "rgba(201,168,76,0.15)", color: "var(--gold)", border: "1px solid rgba(201,168,76,0.3)" }}>
                  {i + 1}
                </div>
                <div className="text-2xl mb-3">{step.icon}</div>
                <h3 className="font-display font-semibold text-sm mb-1" style={{ color: "var(--cream)" }}>{step.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(250,247,240,0.45)" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="px-6 text-center py-24">
        <div className="max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl" style={{ background: "var(--gold)" }}>
            <SealIcon large />
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-5" style={{ color: "var(--cream)" }}>
            Ready to seal the deal?
          </h2>
          <p className="text-lg mb-10" style={{ color: "rgba(250,247,240,0.5)" }}>
            Start your free trial. Simple pricing, no surprises.
          </p>
          <button
            onClick={handleSignIn}
            disabled={signing}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl text-base font-bold transition-all duration-200 hover:scale-105 active:scale-100"
            style={{
              background: "var(--gold)",
              color: "var(--navy)",
              boxShadow: "0 0 50px rgba(201,168,76,0.35)",
            }}
          >
            <GoogleIcon />
            {signing ? "Connecting…" : "Start free trial — Continue with Google"}
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="py-8 px-6 md:px-10"
        style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--gold)" }}>
              <SealIcon />
            </div>
            <span className="font-display font-semibold" style={{ color: "var(--gold)" }}>SignToSeal</span>
          </div>
          <p className="text-xs" style={{ color: "rgba(250,247,240,0.25)" }}>
            © 2026 SignToSeal — Your documents, your control.
          </p>
          <div className="flex items-center gap-5 text-xs" style={{ color: "rgba(250,247,240,0.35)" }}>
            <a href="/pricing" className="hover:opacity-80 transition-opacity">Pricing</a>
            <a href="/terms" className="hover:opacity-80 transition-opacity">Terms</a>
            <a href="/privacy" className="hover:opacity-80 transition-opacity">Privacy</a>
            <a href="mailto:hello@signtoseal.com" className="hover:opacity-80 transition-opacity">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Data ────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "📄",
    title: "Upload Any PDF",
    desc: "Drag & drop any PDF to instantly open it in the signing workspace. No conversion, no waiting.",
  },
  {
    icon: "✍️",
    title: "Draw Your Signature",
    desc: "Freehand-draw your signature directly on any page with precise field placement. Your style, your way.",
  },
  {
    icon: "📨",
    title: "Send to Others",
    desc: "Need a co-signer? Send a secure signing link to anyone via email — no account required on their end.",
  },
  {
    icon: "📋",
    title: "Ready-Made Templates",
    desc: "Start from built-in NDA, contractor agreements, and more. Fill a form, get a signed document instantly.",
  },
  {
    icon: "🔒",
    title: "Private Firebase Vault",
    desc: "Every document is stored in your own private Firebase account. We never read your files.",
  },
  {
    icon: "📱",
    title: "Works on Any Device",
    desc: "Mobile-first responsive design. Sign from your phone, tablet, or desktop — same seamless experience.",
  },
];

const WHY_US = [
  {
    icon: "💸",
    headline: "70% cheaper than DocuSign",
    body: "DocuSign charges $45/month. SignToSeal Starter is $12/mo with send-to-sign, 40+ templates, and signed PDF downloads included.",
  },
  {
    icon: "🚀",
    headline: "No onboarding tax",
    body: "Log in with Google and you're in your workspace in seconds. No onboarding questionnaire, no wizard, no trial countdown.",
  },
  {
    icon: "🎨",
    headline: "Built for real workflows",
    body: "Templates for NDAs and contractor agreements — not just a blank PDF uploader. Your most common use cases are already set up.",
  },
  {
    icon: "🛡️",
    headline: "Your data stays yours",
    body: "Documents live in your own Firebase project. We have zero read access to your files. Audit it yourself — we're open source.",
  },
  {
    icon: "✨",
    headline: "Clean, distraction-free UI",
    body: "No upsell banners, no \"upgrade to unlock\" popups, no dashboard clutter. Just your documents.",
  },
  {
    icon: "⚡",
    headline: "Instant signing links",
    body: "Create a signing request and send a link in under 30 seconds. The recipient signs without creating an account.",
  },
];

const COMPARE_ROWS = [
  { feature: "Price",                    us: "$12/mo",      docusign: "$45/mo",      hellosign: "$30/mo" },
  { feature: "Built-in legal templates", us: "40+",         docusign: false,         hellosign: false },
  { feature: "Send to others for sign",  us: true,          docusign: true,          hellosign: true },
  { feature: "Signed PDF download",      us: true,          docusign: true,          hellosign: true },
  { feature: "No account for signers",   us: true,          docusign: true,          hellosign: true },
  { feature: "Free trial",               us: "7 days",      docusign: "30 days",     hellosign: "30 days" },
  { feature: "Multi-signer",             us: "Pro $24",     docusign: "$45+",       hellosign: "$30+" },
];

const STEPS = [
  { icon: "🔑", title: "Sign in", desc: "One click with your Google account. Nothing to install." },
  { icon: "📤", title: "Upload or pick a template", desc: "Drop a PDF or choose a ready-made NDA or contract." },
  { icon: "✍️", title: "Add fields & sign", desc: "Place signature, date, and text fields anywhere on the doc." },
  { icon: "📨", title: "Send or download", desc: "Download the sealed PDF or send a link for others to co-sign." },
];

// ── Sub-components ──────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex justify-center mb-4">
      <span className="text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full"
        style={{ color: "var(--gold)", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
        {text}
      </span>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-2xl flex flex-col gap-3 transition-all duration-200 hover:translate-y-[-2px]"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
        style={{ background: "rgba(201,168,76,0.1)" }}>
        {icon}
      </div>
      <h3 className="font-display font-semibold text-base" style={{ color: "var(--cream)" }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(250,247,240,0.5)" }}>{desc}</p>
    </div>
  );
}

function CompareCell({ value, highlight = false }: { value: string | boolean; highlight?: boolean }) {
  if (value === true) {
    return <span style={{ color: highlight ? "var(--gold)" : "#4ade80" }}>✓</span>;
  }
  if (value === false) {
    return <span style={{ color: "rgba(250,247,240,0.25)" }}>✗</span>;
  }
  return (
    <span style={{ color: highlight ? "var(--gold)" : "rgba(250,247,240,0.5)" }}>
      {value}
    </span>
  );
}

function SealIcon({ large = false }: { large?: boolean }) {
  const size = large ? 26 : 16;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 4.8 5.3.8-3.85 3.75.91 5.3L12 14.1l-4.76 2.55.91-5.3L4.3 7.6l5.3-.8L12 2z" />
      <path d="M8 21h8M12 17v4" />
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
