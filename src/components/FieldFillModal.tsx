"use client";
import { useState, useRef, useEffect, useCallback, useId } from "react";
import SignaturePadLib from "signature_pad";
import type { DocumentField } from "@/lib/types";
import type { SavedSignatureOption } from "@/components/SignaturePad";

const MAX_UPLOAD_BYTES = 200 * 1024;

interface Props {
  field: DocumentField;
  signerName: string;
  onFill: (value: string) => void;
  onClose: () => void;
  savedSignatures?: SavedSignatureOption[];
  onSaveSignature?: (dataUrl: string) => void;
}

function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      if (e.key !== "Tab" || focusable.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}

export default function FieldFillModal({
  field,
  signerName,
  onFill,
  onClose,
  savedSignatures = [],
  onSaveSignature,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const title = {
    signature: "Add Your Signature",
    initials: "Add Your Initials",
    date: "Date",
    text: "Enter Text",
    checkbox: field.label ?? "Checkbox",
  }[field.type];

  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(10,22,40,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: "var(--navy)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}
        >
          <h3 id={titleId} className="font-display font-semibold" style={{ color: "var(--cream)" }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "rgba(250,247,240,0.5)", outlineColor: "var(--gold)" }}
            aria-label="Close dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {field.type === "signature" && (
            <SignatureCapture
              onFill={onFill}
              onClose={onClose}
              signerName={signerName}
              isInitials={false}
              savedSignatures={savedSignatures}
              onSaveSignature={onSaveSignature}
            />
          )}
          {field.type === "initials" && (
            <SignatureCapture
              onFill={onFill}
              onClose={onClose}
              signerName={signerName}
              isInitials
              savedSignatures={savedSignatures}
              onSaveSignature={onSaveSignature}
            />
          )}
          {field.type === "text" && (
            <TextCapture onFill={onFill} onClose={onClose} existingValue={field.value} />
          )}
          {field.type === "checkbox" && (
            <CheckboxCapture
              onFill={onFill}
              onClose={onClose}
              label={field.label ?? "I agree"}
              checked={field.value === "true"}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SignatureCapture({
  onFill,
  onClose,
  signerName,
  isInitials,
  savedSignatures,
  onSaveSignature,
}: {
  onFill: (v: string) => void;
  onClose: () => void;
  signerName: string;
  isInitials: boolean;
  savedSignatures?: SavedSignatureOption[];
  onSaveSignature?: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"draw" | "type" | "upload">("draw");
  const [typedText, setTypedText] = useState(
    isInitials
      ? signerName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 3)
      : signerName
  );
  const [fontIdx, setFontIdx] = useState(0);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [saveForLater, setSaveForLater] = useState(false);

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
    pad.addEventListener("endStroke", () => {
      setHasDrawing(!pad.isEmpty());
      setSelectedSavedId(null);
      setUploadPreview(null);
    });
    return () => {
      pad.off();
      padRef.current = null;
    };
  }, [tab]);

  const getTypedDataUrl = useCallback(() => {
    const canvas = window.document.createElement("canvas");
    const w = isInitials ? 200 : 400;
    const h = isInitials ? 100 : 120;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.font = `${isInitials ? 44 : 52}px ${FONTS[fontIdx]}`;
    ctx.fillStyle = "#0a1628";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedText || (isInitials ? "AB" : "Sign"), w / 2, h / 2);
    return canvas.toDataURL("image/png");
  }, [typedText, fontIdx, isInitials, FONTS]);

  const handleUpload = (file: File) => {
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
      setUploadPreview(reader.result as string);
      setHasDrawing(true);
      setSelectedSavedId(null);
    };
    reader.readAsDataURL(file);
  };

  const selectSaved = (sig: SavedSignatureOption) => {
    setSelectedSavedId(sig.id);
    setUploadPreview(sig.dataUrl);
    setHasDrawing(true);
    setUploadError("");
  };

  const handleApply = () => {
    let dataUrl: string | null = null;
    if (tab === "draw") {
      if (!padRef.current || padRef.current.isEmpty()) return;
      dataUrl = padRef.current.toDataURL("image/png");
    } else if (tab === "type") {
      if (!typedText.trim()) return;
      dataUrl = getTypedDataUrl();
    } else if (uploadPreview) {
      dataUrl = uploadPreview;
    }
    if (!dataUrl) return;
    if (saveForLater && onSaveSignature) onSaveSignature(dataUrl);
    onFill(dataUrl);
  };

  const canApply =
    tab === "draw"
      ? hasDrawing
      : tab === "type"
        ? !!typedText.trim()
        : !!uploadPreview;

  return (
    <div className="space-y-4">
      {(savedSignatures?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
            Saved signatures
          </p>
          <div className="flex flex-wrap gap-2">
            {savedSignatures!.map((sig) => (
              <button
                key={sig.id}
                type="button"
                onClick={() => selectSaved(sig)}
                className="px-2 py-1.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{
                  border: `2px solid ${selectedSavedId === sig.id ? "var(--gold)" : "var(--border)"}`,
                  background: selectedSavedId === sig.id ? "rgba(201,168,76,0.08)" : "white",
                  outlineColor: "var(--gold)",
                }}
                aria-label={`Use saved signature: ${sig.label ?? "My signature"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sig.dataUrl} alt="" className="h-8 max-w-[100px] object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {(["draw", "type", "upload"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setHasDrawing(false);
              setUploadPreview(null);
              setUploadError("");
              setSelectedSavedId(null);
            }}
            className="flex-1 py-2 text-sm font-medium capitalize transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{
              background: tab === t ? "var(--navy)" : "white",
              color: tab === t ? "var(--gold)" : "var(--text-muted)",
              outlineColor: "var(--gold)",
            }}
            aria-pressed={tab === t}
          >
            {t === "draw" ? "Draw" : t === "type" ? "Type" : "Upload"}
          </button>
        ))}
      </div>

      {tab === "draw" ? (
        <div
          className="relative rounded-xl overflow-hidden"
          style={{ border: "2px dashed var(--gold)", background: "white" }}
        >
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: isInitials ? 100 : 140, display: "block", touchAction: "none" }}
            aria-label={isInitials ? "Draw your initials" : "Draw your signature"}
          />
          {!hasDrawing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm" style={{ color: "rgba(107,122,150,0.5)" }}>
                {isInitials ? "Draw your initials" : "Draw your signature"}
              </p>
            </div>
          )}
          {hasDrawing && (
            <button
              type="button"
              onClick={() => {
                padRef.current?.clear();
                setHasDrawing(false);
              }}
              className="absolute top-2 right-2 px-2 py-1 rounded text-xs focus-visible:outline focus-visible:outline-2"
              style={{ background: "var(--cream-dark)", color: "var(--text-muted)", outlineColor: "var(--gold)" }}
              aria-label="Clear drawing"
            >
              Clear
            </button>
          )}
        </div>
      ) : tab === "type" ? (
        <div className="space-y-3">
          <input
            type="text"
            value={typedText}
            onChange={(e) =>
              setTypedText(isInitials ? e.target.value.toUpperCase().slice(0, 3) : e.target.value)
            }
            placeholder={isInitials ? "ABC" : "Your name"}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none focus-visible:ring-2"
            style={{ border: "1.5px solid var(--gold)", background: "var(--cream)", color: "var(--navy)" }}
            maxLength={isInitials ? 3 : 40}
            aria-label={isInitials ? "Type your initials" : "Type your signature"}
          />
          <div className="grid grid-cols-3 gap-2">
            {FONTS.map((font, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setFontIdx(i)}
                className="py-4 px-2 rounded-lg text-center transition-all focus-visible:outline focus-visible:outline-2"
                style={{
                  border: `2px solid ${fontIdx === i ? "var(--gold)" : "var(--border)"}`,
                  background: fontIdx === i ? "rgba(201,168,76,0.08)" : "white",
                  fontFamily: font,
                  fontSize: isInitials ? 22 : 18,
                  color: "var(--navy)",
                  outlineColor: "var(--gold)",
                }}
                aria-pressed={fontIdx === i}
              >
                {typedText || (isInitials ? "AB" : "Sign")}
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
            className="w-full py-8 rounded-xl text-sm font-medium focus-visible:outline focus-visible:outline-2"
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
            <div className="rounded-xl p-2" style={{ border: "1px solid var(--border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadPreview} alt="Uploaded signature" className="max-h-28 mx-auto object-contain" />
            </div>
          )}
          {uploadError && (
            <p className="text-xs" style={{ color: "var(--danger)" }} role="alert">
              {uploadError}
            </p>
          )}
        </div>
      )}

      {onSaveSignature && (
        <label className="flex items-center gap-2 cursor-pointer">
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

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium focus-visible:outline focus-visible:outline-2"
          style={{ background: "var(--cream-dark)", color: "var(--text-muted)", outlineColor: "var(--gold)" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!canApply}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 focus-visible:outline focus-visible:outline-2"
          style={{ background: "var(--navy)", color: "var(--gold)", outlineColor: "var(--gold)" }}
          aria-label="Apply signature to field"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function TextCapture({
  onFill,
  onClose,
  existingValue,
}: {
  onFill: (v: string) => void;
  onClose: () => void;
  existingValue?: string;
}) {
  const [text, setText] = useState(existingValue ?? "");
  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Enter text…"
        autoFocus
        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none focus-visible:ring-2"
        style={{ border: "1.5px solid var(--gold)", background: "var(--cream)", color: "var(--navy)" }}
        aria-label="Enter text for field"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium focus-visible:outline focus-visible:outline-2"
          style={{ background: "var(--cream-dark)", color: "var(--text-muted)", outlineColor: "var(--gold)" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onFill(text.trim())}
          disabled={!text.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 focus-visible:outline focus-visible:outline-2"
          style={{ background: "var(--navy)", color: "var(--gold)", outlineColor: "var(--gold)" }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function CheckboxCapture({
  onFill,
  onClose,
  label,
  checked,
}: {
  onFill: (v: string) => void;
  onClose: () => void;
  label: string;
  checked: boolean;
}) {
  const [isChecked, setIsChecked] = useState(checked);

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl" style={{ background: "var(--cream)" }}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
          className="mt-1 w-5 h-5 flex-shrink-0"
          style={{ accentColor: "var(--navy)" }}
          aria-label={label}
        />
        <span className="text-sm leading-relaxed" style={{ color: "var(--navy)" }}>
          {label}
        </span>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium focus-visible:outline focus-visible:outline-2"
          style={{ background: "var(--cream-dark)", color: "var(--text-muted)", outlineColor: "var(--gold)" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onFill(isChecked ? "true" : "false")}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold focus-visible:outline focus-visible:outline-2"
          style={{ background: "var(--navy)", color: "var(--gold)", outlineColor: "var(--gold)" }}
          aria-label="Apply checkbox selection"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
