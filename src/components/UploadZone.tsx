"use client";
import { useCallback, useState } from "react";

interface Props {
  onUpload: (files: File[]) => void;
  uploading: boolean;
  uploadError?: string | null;
  compact?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.type === "application/x-pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function validateFiles(files: File[]): string | null {
  if (files.some((file) => !isPdf(file))) return "Only PDF files are supported.";
  if (files.some((file) => file.size > MAX_FILE_SIZE)) return "Each file must be 10MB or smaller.";
  return null;
}

export default function UploadZone({ onUpload, uploading, uploadError, compact = false }: Props) {
  const [dragging, setDragging] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    setTypeError(null);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    const err = validateFiles(files);
    if (err) {
      setTypeError(err);
      return;
    }
    onUpload(files);
  }, [onUpload]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTypeError(null);
    const files = Array.from(e.target.files ?? []);
    const err = validateFiles(files);
    if (err) {
      setTypeError(err);
      e.target.value = "";
      return;
    }
    if (files.length > 0) onUpload(files);
    // Reset so the same file can be re-selected after an error
    e.target.value = "";
  }, [onUpload]);

  const error = uploadError ?? typeError;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="file-upload"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center w-full rounded-xl cursor-pointer transition-all duration-200"
        style={{
          border: `2px dashed ${error ? "#dc2626" : dragging ? "var(--gold)" : "var(--border)"}`,
          background: dragging ? "rgba(201,168,76,0.05)" : "white",
          boxShadow: dragging ? "0 0 20px rgba(201,168,76,0.15)" : "none",
          padding: compact ? "22px" : "40px",
        }}
      >
        <input
          id="file-upload"
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
            <span className="text-sm font-medium" style={{ color: "var(--navy)" }}>Uploading…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
              style={{ background: "var(--cream-dark)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                style={{ color: "var(--navy-mid)" }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="18" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9,15 12,12 15,15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="font-medium text-sm" style={{ color: "var(--navy)" }}>
              Drop PDF files here, or <span style={{ color: "var(--gold)" }}>browse</span>
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Multiple PDFs supported · Max 10MB each</p>
          </div>
        )}
      </label>

      {error && (
        <p className="text-xs text-center font-medium" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
