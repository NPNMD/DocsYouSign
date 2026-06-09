"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import SignaturePadLib from "signature_pad";

export interface SavedSignatureOption {
  id: string;
  dataUrl: string;
  label?: string;
}

interface Props {
  onSave: (dataUrl: string | null) => void;
  signerName?: string;
  allowUpload?: boolean;
  savedSignatures?: SavedSignatureOption[];
  onSaveForLater?: (dataUrl: string) => void;
}

const MAX_UPLOAD_BYTES = 200 * 1024;

const CURSIVE_FONTS = [
  "'Dancing Script', cursive",
  "'Pacifico', cursive",
  "'Great Vibes', cursive",
];

export default function SignaturePadComponent({
  onSave,
  signerName = "",
  allowUpload = true,
  savedSignatures = [],
  onSaveForLater,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [mode, setMode] = useState<"draw" | "type" | "upload">("draw");
  const [typedName, setTypedName] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState(0);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [saveForLater, setSaveForLater] = useState(false);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (signerName && !typedName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync default name from props
      setTypedName(signerName);
    }
  }, [signerName, typedName]);

  const emitSave = useCallback(
    (dataUrl: string | null) => {
      onSave(dataUrl);
      if (dataUrl && saveForLater && onSaveForLater) onSaveForLater(dataUrl);
    },
    [onSave, saveForLater, onSaveForLater]
  );

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
      setSelectedSavedId(null);
      if (!pad.isEmpty()) emitSave(pad.toDataURL("image/png"));
    });
    return () => {
      pad.off();
    };
  }, [mode, emitSave]);

  const clearPad = useCallback(() => {
    padRef.current?.clear();
    setHasSignature(false);
    setUploadPreview(null);
    setSelectedSavedId(null);
    emitSave(null);
  }, [emitSave]);

  useEffect(() => {
    if (mode !== "type") return;
    if (!typedName) {
      emitSave(null);
      return;
    }

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear saved selection when typing
    setSelectedSavedId(null);
    emitSave(canvas.toDataURL("image/png"));
  }, [typedName, selectedFont, mode, emitSave]);

  const handleUpload = useCallback(
    (file: File) => {
      setUploadError("");
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        setUploadError("Please upload a PNG or JPG image.");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError("Image must be 200KB or smaller.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setUploadPreview(dataUrl);
        setSelectedSavedId(null);
        setHasSignature(true);
        emitSave(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [emitSave]
  );

  const selectSaved = useCallback(
    (sig: SavedSignatureOption) => {
      setSelectedSavedId(sig.id);
      setUploadPreview(sig.dataUrl);
      setHasSignature(true);
      setUploadError("");
      emitSave(sig.dataUrl);
    },
    [emitSave]
  );

  const tabs: Array<"draw" | "type" | "upload"> = allowUpload
    ? ["draw", "type", "upload"]
    : ["draw", "type"];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Signature
        </label>
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {tabs.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                emitSave(null);
                setHasSignature(false);
                setUploadPreview(null);
                setUploadError("");
                setSelectedSavedId(null);
              }}
              className="px-3 py-1 text-xs font-medium capitalize transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
              style={{
                background: mode === m ? "var(--navy)" : "white",
                color: mode === m ? "var(--gold)" : "var(--text-muted)",
                outlineColor: "var(--gold)",
              }}
              aria-pressed={mode === m}
            >
              {m === "draw" ? "Draw" : m === "type" ? "Type" : "Upload"}
            </button>
          ))}
        </div>
      </div>

      {savedSignatures.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
            Saved signatures
          </p>
          <div className="flex flex-wrap gap-2">
            {savedSignatures.map((sig) => (
              <button
                key={sig.id}
                type="button"
                onClick={() => selectSaved(sig)}
                className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{
                  border: `2px solid ${selectedSavedId === sig.id ? "var(--gold)" : "var(--border)"}`,
                  background: selectedSavedId === sig.id ? "rgba(201,168,76,0.08)" : "white",
                  outlineColor: "var(--gold)",
                }}
                aria-label={`Use saved signature: ${sig.label ?? "My signature"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sig.dataUrl} alt="" className="h-8 max-w-[120px] object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "draw" ? (
        <div
          className="relative rounded-xl overflow-hidden"
          style={{ border: "2px dashed var(--gold)", background: "white" }}
        >
          <canvas
            ref={canvasRef}
            className="w-full signature-canvas"
            style={{ height: "140px", display: "block", touchAction: "none" }}
            aria-label="Draw your signature"
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm" style={{ color: "rgba(107,122,150,0.5)" }}>
                Draw your signature here
              </p>
            </div>
          )}
          {hasSignature && (
            <button
              type="button"
              onClick={clearPad}
              className="absolute top-2 right-2 px-2 py-1 rounded text-xs transition-all hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
              style={{ background: "var(--cream-dark)", color: "var(--text-muted)", outlineColor: "var(--gold)" }}
              aria-label="Clear signature"
            >
              Clear
            </button>
          )}
        </div>
      ) : mode === "type" ? (
        <div className="space-y-3">
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your name to sign"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none focus-visible:ring-2"
            style={{
              background: "white",
              border: "1.5px solid var(--border)",
              color: "var(--navy)",
              boxShadow: "none",
            }}
            aria-label="Type your name for signature"
          />
          <div className="grid grid-cols-3 gap-2">
            {CURSIVE_FONTS.map((font, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedFont(i)}
                className="py-3 px-2 rounded-lg text-center transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{
                  border: `2px solid ${selectedFont === i ? "var(--gold)" : "var(--border)"}`,
                  background: selectedFont === i ? "rgba(201,168,76,0.08)" : "white",
                  fontFamily: font,
                  fontSize: "18px",
                  color: "var(--navy)",
                  outlineColor: "var(--gold)",
                }}
                aria-pressed={selectedFont === i}
              >
                {typedName || "Sign"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 rounded-xl text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{
              border: "2px dashed var(--gold)",
              background: "white",
              color: "var(--text-muted)",
              outlineColor: "var(--gold)",
            }}
            aria-label="Upload signature image"
          >
            {uploadPreview ? "Replace image" : "Choose PNG or JPG (max 200KB)"}
          </button>
          {uploadPreview && (
            <div className="relative rounded-xl overflow-hidden p-2" style={{ border: "1px solid var(--border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadPreview} alt="Uploaded signature preview" className="max-h-32 mx-auto object-contain" />
              <button
                type="button"
                onClick={clearPad}
                className="absolute top-2 right-2 px-2 py-1 rounded text-xs"
                style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}
                aria-label="Remove uploaded signature"
              >
                Remove
              </button>
            </div>
          )}
          {uploadError && (
            <p className="text-xs" style={{ color: "var(--danger)" }} role="alert">
              {uploadError}
            </p>
          )}
        </div>
      )}

      {onSaveForLater && hasSignature && (
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={saveForLater}
            onChange={(e) => setSaveForLater(e.target.checked)}
            className="w-4 h-4"
            style={{ accentColor: "var(--navy)" }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Save this signature for later
          </span>
        </label>
      )}
    </div>
  );
}
