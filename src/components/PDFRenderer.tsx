"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { DocumentField, FieldType } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const FIELD_CONFIG: Record<FieldType, { label: string; icon: string; color: string; bg: string }> = {
  signature: { label: "Signature", icon: "✍️", color: "#0a1628", bg: "rgba(201,168,76,0.15)" },
  initials:  { label: "Initials",  icon: "AB", color: "#1e3a5f", bg: "rgba(30,58,95,0.12)" },
  date:      { label: "Date",      icon: "📅", color: "#1a4d2e", bg: "rgba(26,107,71,0.12)" },
  text:      { label: "Text",      icon: "T",  color: "#5c2d91", bg: "rgba(92,45,145,0.1)"  },
};

interface Props {
  url: string;
  fields: DocumentField[];
  mode: "prepare" | "sign" | "view";
  onPageCount?: (n: number) => void;
  onFieldPlace?: (field: DocumentField) => void;
  onFieldClick?: (field: DocumentField) => void;
  onFieldMove?: (id: string, x: number, y: number) => void;
  onFieldDelete?: (id: string) => void;
  placingType?: FieldType | null;
}

export default function PDFRenderer({
  url,
  fields,
  mode,
  onPageCount,
  onFieldPlace,
  onFieldClick,
  onFieldMove,
  onFieldDelete,
  placingType,
}: Props) {
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ id: string; startX: number; startY: number } | null>(null);

  // Measure container width
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setPageWidth(containerRef.current.clientWidth - 32);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleLoad = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    onPageCount?.(numPages);
  };

  // Click on a page to place a field (prepare mode)
  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, page: number) => {
      if (mode !== "prepare" || !placingType) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const defaults: Record<FieldType, { width: number; height: number }> = {
        signature: { width: 32, height: 8 },
        initials:  { width: 12, height: 8 },
        date:      { width: 22, height: 7 },
        text:      { width: 30, height: 7 },
      };
      const { width, height } = defaults[placingType];
      onFieldPlace?.({
        id: crypto.randomUUID(),
        type: placingType,
        page,
        x: Math.min(x, 100 - width),
        y: Math.min(y, 100 - height),
        width,
        height,
      });
    },
    [mode, placingType, onFieldPlace]
  );

  // Drag to reposition (prepare mode)
  const startDrag = useCallback(
    (e: React.MouseEvent, field: DocumentField) => {
      if (mode !== "prepare") return;
      e.stopPropagation();
      draggingRef.current = { id: field.id, startX: e.clientX, startY: e.clientY };
      const pageEl = (e.currentTarget as HTMLElement).closest("[data-page-container]") as HTMLElement;
      if (!pageEl) return;
      const rect = pageEl.getBoundingClientRect();

      const onMove = (me: MouseEvent) => {
        const x = ((me.clientX - rect.left) / rect.width) * 100;
        const y = ((me.clientY - rect.top) / rect.height) * 100;
        onFieldMove?.(field.id, Math.max(0, Math.min(x, 100 - field.width)), Math.max(0, Math.min(y, 100 - field.height)));
      };
      const onUp = () => {
        draggingRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [mode, onFieldMove]
  );

  return (
    <div ref={containerRef} className="w-full" style={{ cursor: mode === "prepare" && placingType ? "crosshair" : "default" }}>
      <Document
        file={url}
        onLoadSuccess={handleLoad}
        loading={<PageSkeleton />}
        error={<div className="p-8 text-center text-red-500">Failed to load PDF</div>}
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
          <div
            key={page}
            className="relative mb-4 mx-auto shadow-lg"
            style={{ width: pageWidth || "100%", background: "white" }}
            data-page-container
            onClick={(e) => handlePageClick(e, page)}
          >
            <Page
              pageNumber={page}
              width={pageWidth || undefined}
              renderTextLayer
              renderAnnotationLayer
            />

            {/* Field overlays for this page */}
            {fields
              .filter((f) => f.page === page)
              .map((field) => (
                <FieldOverlay
                  key={field.id}
                  field={field}
                  mode={mode}
                  onMouseDown={(e) => startDrag(e, field)}
                  onClick={(e) => { e.stopPropagation(); onFieldClick?.(field); }}
                  onDelete={() => onFieldDelete?.(field.id)}
                />
              ))}
          </div>
        ))}
      </Document>
    </div>
  );
}

function FieldOverlay({
  field,
  mode,
  onMouseDown,
  onClick,
  onDelete,
}: {
  field: DocumentField;
  mode: "prepare" | "sign" | "view";
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDelete: () => void;
}) {
  const cfg = FIELD_CONFIG[field.type];
  const isFilled = !!field.value;

  return (
    <div
      style={{
        position: "absolute",
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        height: `${field.height}%`,
        background: isFilled ? "transparent" : cfg.bg,
        border: isFilled
          ? "none"
          : `1.5px ${mode === "view" ? "solid" : "dashed"} ${mode === "sign" && !isFilled ? "var(--gold)" : cfg.color}`,
        borderRadius: "3px",
        cursor: mode === "prepare" ? "grab" : mode === "sign" && !isFilled ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        zIndex: 10,
        userSelect: "none",
        boxShadow: mode === "sign" && !isFilled ? "0 0 0 2px rgba(201,168,76,0.3)" : "none",
        transition: "box-shadow 0.15s",
      }}
      onMouseDown={mode === "prepare" ? onMouseDown : undefined}
      onClick={onClick}
    >
      {/* Filled: show the value */}
      {isFilled && field.type === "signature" && (
        <img src={field.value} alt="signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      )}
      {isFilled && field.type === "initials" && (
        <img src={field.value} alt="initials" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      )}
      {isFilled && (field.type === "date" || field.type === "text") && (
        <span style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: "#0a1628", padding: "0 4px" }}>
          {field.value}
        </span>
      )}

      {/* Unfilled placeholder */}
      {!isFilled && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 6px" }}>
          <span style={{ fontSize: field.type === "initials" ? "10px" : "11px", opacity: 0.7, color: cfg.color, fontWeight: 600, whiteSpace: "nowrap" }}>
            {cfg.icon} {cfg.label}
          </span>
        </div>
      )}

      {/* Delete button (prepare mode) */}
      {mode === "prepare" && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            position: "absolute", top: "-8px", right: "-8px",
            width: "16px", height: "16px", borderRadius: "50%",
            background: "#8b1a1a", color: "white", fontSize: "10px",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold", lineHeight: 1, zIndex: 11,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="w-full mx-auto mb-4" style={{ height: 800, background: "#e5e5e5", borderRadius: 4 }}>
      <div className="animate-shimmer w-full h-full" />
    </div>
  );
}
