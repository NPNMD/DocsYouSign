"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import SignaturePadLib from "signature_pad";

interface Props {
  onSave: (dataUrl: string | null) => void;
}

const CURSIVE_FONTS = [
  "'Dancing Script', cursive",
  "'Pacifico', cursive",
  "'Great Vibes', cursive",
];

export default function SignaturePadComponent({ onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState(0);

  // Init pad
  useEffect(() => {
    if (mode !== "draw" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      padRef.current?.clear();
    };
    resize();
    const pad = new SignaturePadLib(canvas, {
      minWidth: 1,
      maxWidth: 3,
      penColor: "#0a1628",
      backgroundColor: "rgba(255,255,255,0)",
    });
    padRef.current = pad;
    pad.addEventListener("endStroke", () => {
      setHasSignature(!pad.isEmpty());
      if (!pad.isEmpty()) onSave(pad.toDataURL("image/png"));
    });
    return () => { pad.off(); };
  }, [mode, onSave]);

  const clearPad = useCallback(() => {
    padRef.current?.clear();
    setHasSignature(false);
    onSave(null);
  }, [onSave]);

  // For typed signature
  useEffect(() => {
    if (mode !== "type") return;
    if (!typedName) { onSave(null); return; }

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `56px ${CURSIVE_FONTS[selectedFont]}`;
    ctx.fillStyle = "#0a1628";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
    onSave(canvas.toDataURL("image/png"));
  }, [typedName, selectedFont, mode, onSave]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Signature
        </label>
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {(["draw", "type"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); onSave(null); setHasSignature(false); }}
              className="px-3 py-1 text-xs font-medium capitalize transition-all"
              style={{
                background: mode === m ? "var(--navy)" : "white",
                color: mode === m ? "var(--gold)" : "var(--text-muted)",
              }}>
              {m === "draw" ? "Draw" : "Type"}
            </button>
          ))}
        </div>
      </div>

      {mode === "draw" ? (
        <div className="relative rounded-xl overflow-hidden"
          style={{ border: "2px dashed var(--gold)", background: "white" }}>
          <canvas
            ref={canvasRef}
            className="w-full signature-canvas"
            style={{ height: "140px", display: "block" }}
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm" style={{ color: "rgba(107,122,150,0.5)" }}>Draw your signature here</p>
            </div>
          )}
          {hasSignature && (
            <button onClick={clearPad}
              className="absolute top-2 right-2 px-2 py-1 rounded text-xs transition-all hover:opacity-70"
              style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>
              Clear
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your name to sign"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "white", border: "1.5px solid var(--border)", color: "var(--navy)" }}
            onFocus={(e) => e.target.style.borderColor = "var(--gold)"}
            onBlur={(e) => e.target.style.borderColor = "var(--border)"}
          />
          {/* Font picker */}
          <div className="grid grid-cols-3 gap-2">
            {CURSIVE_FONTS.map((font, i) => (
              <button key={i} onClick={() => setSelectedFont(i)}
                className="py-3 px-2 rounded-lg text-center transition-all"
                style={{
                  border: `2px solid ${selectedFont === i ? "var(--gold)" : "var(--border)"}`,
                  background: selectedFont === i ? "rgba(201,168,76,0.08)" : "white",
                  fontFamily: font,
                  fontSize: "18px",
                  color: "var(--navy)",
                }}>
                {typedName || "Sign"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
