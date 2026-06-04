"use client";
import { useState, useRef, useEffect } from "react";
import SignaturePadLib from "signature_pad";
import type { DocumentField } from "@/lib/types";

interface Props {
  field: DocumentField;
  signerName: string;
  onFill: (value: string) => void;
  onClose: () => void;
}

export default function FieldFillModal({ field, signerName, onFill, onClose }: Props) {
  const title = {
    signature: "Add Your Signature",
    initials: "Add Your Initials",
    date: "Date",
    text: "Enter Text",
  }[field.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(10,22,40,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: "var(--navy)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
          <h3 className="font-display font-semibold" style={{ color: "var(--cream)" }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: "rgba(250,247,240,0.5)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {field.type === "signature" && (
            <SignatureCapture onFill={onFill} onClose={onClose} signerName={signerName} isInitials={false} />
          )}
          {field.type === "initials" && (
            <SignatureCapture onFill={onFill} onClose={onClose} signerName={signerName} isInitials={true} />
          )}
          {field.type === "text" && (
            <TextCapture onFill={onFill} onClose={onClose} existingValue={field.value} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Signature / Initials capture ----
function SignatureCapture({
  onFill,
  onClose,
  signerName,
  isInitials,
}: {
  onFill: (v: string) => void;
  onClose: () => void;
  signerName: string;
  isInitials: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [tab, setTab] = useState<"draw" | "type">("draw");
  const [typedText, setTypedText] = useState(
    isInitials
      ? signerName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 3)
      : signerName
  );
  const [fontIdx, setFontIdx] = useState(0);
  const [hasDrawing, setHasDrawing] = useState(false);

  const FONTS = [
    "'Dancing Script', cursive",
    "'Pacifico', cursive",
    "'Great Vibes', cursive",
  ];

  useEffect(() => {
    if (tab !== "draw" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    const pad = new SignaturePadLib(canvas, {
      minWidth: 1.5,
      maxWidth: 3.5,
      penColor: "#0a1628",
    });
    padRef.current = pad;
    pad.addEventListener("endStroke", () => setHasDrawing(!pad.isEmpty()));
    return () => { pad.off(); padRef.current = null; };
  }, [tab]);

  const getTypedDataUrl = () => {
    const canvas = window.document.createElement("canvas");
    const w = isInitials ? 200 : 400;
    const h = isInitials ? 100 : 120;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.font = `${isInitials ? 44 : 52}px ${FONTS[fontIdx]}`;
    ctx.fillStyle = "#0a1628";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedText || (isInitials ? "AB" : "Sign"), w / 2, h / 2);
    return canvas.toDataURL("image/png");
  };

  const handleApply = () => {
    if (tab === "draw") {
      if (!padRef.current || padRef.current.isEmpty()) return;
      onFill(padRef.current.toDataURL("image/png"));
    } else {
      if (!typedText.trim()) return;
      onFill(getTypedDataUrl());
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {(["draw", "type"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 text-sm font-medium capitalize transition-all"
            style={{ background: tab === t ? "var(--navy)" : "white", color: tab === t ? "var(--gold)" : "var(--text-muted)" }}>
            {t === "draw" ? "Draw" : "Type"}
          </button>
        ))}
      </div>

      {tab === "draw" ? (
        <div className="relative rounded-xl overflow-hidden" style={{ border: "2px dashed var(--gold)", background: "white" }}>
          <canvas ref={canvasRef} className="w-full" style={{ height: isInitials ? 100 : 140, display: "block", touchAction: "none" }} />
          {!hasDrawing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm" style={{ color: "rgba(107,122,150,0.5)" }}>
                {isInitials ? "Draw your initials" : "Draw your signature"}
              </p>
            </div>
          )}
          {hasDrawing && (
            <button onClick={() => { padRef.current?.clear(); setHasDrawing(false); }}
              className="absolute top-2 right-2 px-2 py-1 rounded text-xs"
              style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>
              Clear
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(isInitials ? e.target.value.toUpperCase().slice(0, 3) : e.target.value)}
            placeholder={isInitials ? "ABC" : "Your name"}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ border: "1.5px solid var(--gold)", background: "var(--cream)", color: "var(--navy)" }}
            maxLength={isInitials ? 3 : 40}
          />
          <div className="grid grid-cols-3 gap-2">
            {FONTS.map((font, i) => (
              <button key={i} onClick={() => setFontIdx(i)}
                className="py-4 px-2 rounded-lg text-center transition-all"
                style={{
                  border: `2px solid ${fontIdx === i ? "var(--gold)" : "var(--border)"}`,
                  background: fontIdx === i ? "rgba(201,168,76,0.08)" : "white",
                  fontFamily: font,
                  fontSize: isInitials ? 22 : 18,
                  color: "var(--navy)",
                }}>
                {typedText || (isInitials ? "AB" : "Sign")}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>
          Cancel
        </button>
        <button
          onClick={handleApply}
          disabled={tab === "draw" ? !hasDrawing : !typedText.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: "var(--navy)", color: "var(--gold)" }}>
          Apply
        </button>
      </div>
    </div>
  );
}

// ---- Text field ----
function TextCapture({ onFill, onClose, existingValue }: { onFill: (v: string) => void; onClose: () => void; existingValue?: string }) {
  const [text, setText] = useState(existingValue ?? "");
  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Enter text…"
        autoFocus
        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
        style={{ border: "1.5px solid var(--gold)", background: "var(--cream)", color: "var(--navy)" }}
      />
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>
          Cancel
        </button>
        <button
          onClick={() => onFill(text.trim())}
          disabled={!text.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: "var(--navy)", color: "var(--gold)" }}>
          Apply
        </button>
      </div>
    </div>
  );
}
