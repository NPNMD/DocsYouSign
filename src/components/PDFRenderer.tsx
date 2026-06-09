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
  checkbox:  { label: "Checkbox",  icon: "☑",  color: "#0f766e", bg: "rgba(15,118,110,0.12)" },
};

const FIELD_DEFAULTS: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 32, height: 8 },
  initials:  { width: 12, height: 8 },
  date:      { width: 22, height: 7 },
  text:      { width: 30, height: 7 },
  checkbox:  { width: 4, height: 4 },
};

function getClientCoords(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
  if ("touches" in e) {
    const touch = e.touches[0] ?? e.changedTouches[0];
    return { clientX: touch.clientX, clientY: touch.clientY };
  }
  return { clientX: e.clientX, clientY: e.clientY };
}

interface Props {
  url?: string;
  fields: DocumentField[];
  mode: "prepare" | "sign" | "view";
  currentPage?: number;
  onPageSelect?: (page: number) => void;
  onPageCount?: (n: number) => void;
  onFieldPlace?: (field: DocumentField) => void;
  onFieldClick?: (field: DocumentField) => void;
  onFieldMove?: (id: string, x: number, y: number) => void;
  onFieldResize?: (id: string, width: number, height: number) => void;
  onFieldDelete?: (id: string) => void;
  placingType?: FieldType | null;
}

export default function PDFRenderer({
  url,
  fields,
  mode,
  currentPage,
  onPageSelect,
  onPageCount,
  onFieldPlace,
  onFieldClick,
  onFieldMove,
  onFieldResize,
  onFieldDelete,
  placingType,
}: Props) {
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!currentPage) return;
    const el = containerRef.current?.querySelector(`[data-page="${currentPage}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentPage]);

  const handleLoad = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    onPageCount?.(numPages);
  };

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, page: number) => {
      if (mode !== "prepare" || !placingType) return;
      onPageSelect?.(page);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const { width, height } = FIELD_DEFAULTS[placingType];
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
    [mode, placingType, onFieldPlace, onPageSelect]
  );

  const startDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent, field: DocumentField) => {
      if (mode !== "prepare") return;
      e.stopPropagation();
      const pageEl = (e.currentTarget as HTMLElement).closest("[data-page-container]") as HTMLElement;
      if (!pageEl) return;
      const rect = pageEl.getBoundingClientRect();

      const onMove = (ev: MouseEvent | TouchEvent) => {
        if ("touches" in ev) ev.preventDefault();
        const { clientX, clientY } = getClientCoords(ev);
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        onFieldMove?.(
          field.id,
          Math.max(0, Math.min(x, 100 - field.width)),
          Math.max(0, Math.min(y, 100 - field.height))
        );
      };
      const onEnd = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onEnd);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
    },
    [mode, onFieldMove]
  );

  const startResize = useCallback(
    (e: React.MouseEvent | React.TouchEvent, field: DocumentField) => {
      if (mode !== "prepare" || !onFieldResize) return;
      e.stopPropagation();
      e.preventDefault();
      const pageEl = (e.currentTarget as HTMLElement).closest("[data-page-container]") as HTMLElement;
      if (!pageEl) return;
      const rect = pageEl.getBoundingClientRect();

      const onMove = (ev: MouseEvent | TouchEvent) => {
        if ("touches" in ev) ev.preventDefault();
        const { clientX, clientY } = getClientCoords(ev);
        const xPct = ((clientX - rect.left) / rect.width) * 100;
        const yPct = ((clientY - rect.top) / rect.height) * 100;
        const newWidth = Math.max(3, Math.min(100 - field.x, xPct - field.x));
        const newHeight = Math.max(3, Math.min(100 - field.y, yPct - field.y));
        onFieldResize(field.id, newWidth, newHeight);
      };
      const onEnd = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onEnd);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
    },
    [mode, onFieldResize]
  );

  const handleFieldClick = useCallback(
    (field: DocumentField) => {
      if (mode === "sign" && field.type === "checkbox") {
        onFieldClick?.({ ...field, value: field.value === "true" ? "" : "true" });
        return;
      }
      onFieldClick?.(field);
    },
    [mode, onFieldClick]
  );

  if (!url) {
    return <div className="flex items-center justify-center h-64 text-white/70">No PDF available for this document.</div>;
  }

  const allPages = Array.from({ length: numPages }, (_, i) => i + 1);
  const pagesToRender =
    currentPage !== undefined
      ? allPages.filter((p) => p >= currentPage - 1 && p <= currentPage + 1)
      : allPages;

  return (
    <div ref={containerRef} className="w-full" style={{ cursor: mode === "prepare" && placingType ? "crosshair" : "default" }}>
      <Document
        file={url}
        onLoadSuccess={handleLoad}
        loading={<PageSkeleton />}
        error={<div className="p-8 text-center text-red-500">Failed to load PDF</div>}
      >
        {allPages.map((page) => {
          const shouldRender = pagesToRender.includes(page);
          return (
            <div
              key={page}
              data-page={page}
              className="relative mb-4 mx-auto shadow-lg"
              style={{ width: pageWidth || "100%", background: "white", minHeight: shouldRender ? undefined : 200 }}
              data-page-container
              onClick={(e) => handlePageClick(e, page)}
            >
              {shouldRender ? (
                <Page pageNumber={page} width={pageWidth || undefined} renderTextLayer renderAnnotationLayer />
              ) : (
                <div
                  className="flex items-center justify-center text-sm"
                  style={{ height: 200, background: "#e5e5e5", color: "#666" }}
                  aria-hidden
                >
                  Page {page}
                </div>
              )}

              {shouldRender &&
                fields
                  .filter((f) => f.page === page)
                  .map((field) => (
                    <FieldOverlay
                      key={field.id}
                      field={field}
                      mode={mode}
                      onMouseDown={(e) => startDrag(e, field)}
                      onTouchStart={(e) => startDrag(e, field)}
                      onResizeStart={(e) => startResize(e, field)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFieldClick(field);
                      }}
                      onDelete={() => onFieldDelete?.(field.id)}
                      resizable={mode === "prepare" && !!onFieldResize}
                    />
                  ))}
            </div>
          );
        })}
      </Document>
    </div>
  );
}

function FieldOverlay({
  field,
  mode,
  onMouseDown,
  onTouchStart,
  onResizeStart,
  onClick,
  onDelete,
  resizable,
}: {
  field: DocumentField;
  mode: "prepare" | "sign" | "view";
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDelete: () => void;
  resizable: boolean;
}) {
  const cfg = FIELD_CONFIG[field.type];
  const isFilled = field.type === "checkbox" ? field.value === "true" : !!field.value;
  const signLabel = field.label ? `${cfg.label}: ${field.label}` : cfg.label;
  const ariaLabel =
    mode === "sign"
      ? `${signLabel}${isFilled ? ", checked" : ", unchecked"}`
      : undefined;

  return (
    <div
      role={mode === "sign" ? "button" : undefined}
      aria-label={ariaLabel}
      style={{
        position: "absolute",
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        height: `${field.height}%`,
        background: isFilled && field.type !== "checkbox" ? "transparent" : cfg.bg,
        border: isFilled && field.type !== "checkbox"
          ? "none"
          : `1.5px ${mode === "view" ? "solid" : "dashed"} ${mode === "sign" && !isFilled ? "var(--gold)" : cfg.color}`,
        borderRadius: "3px",
        cursor:
          mode === "prepare"
            ? "grab"
            : mode === "sign" && (field.type === "checkbox" || !isFilled)
              ? "pointer"
              : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        zIndex: 10,
        userSelect: "none",
        touchAction: mode === "prepare" ? "none" : "auto",
        boxShadow: mode === "sign" && !isFilled ? "0 0 0 2px rgba(201,168,76,0.3)" : "none",
        transition: "box-shadow 0.15s",
      }}
      onMouseDown={mode === "prepare" ? onMouseDown : undefined}
      onTouchStart={mode === "prepare" ? onTouchStart : undefined}
      onClick={onClick}
    >
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
      {field.type === "checkbox" && (
        <span
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: cfg.color,
            lineHeight: 1,
          }}
          aria-hidden
        >
          {isFilled ? "✓" : ""}
        </span>
      )}

      {!isFilled && field.type !== "checkbox" && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 6px" }}>
          <span
            style={{
              fontSize: field.type === "initials" ? "10px" : "11px",
              opacity: 0.7,
              color: cfg.color,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {cfg.icon} {cfg.label}
          </span>
        </div>
      )}

      {!isFilled && field.type === "checkbox" && (
        <span style={{ fontSize: "10px", opacity: 0.7, color: cfg.color, fontWeight: 600 }} aria-hidden>
          {cfg.icon}
        </span>
      )}

      {mode === "prepare" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            position: "absolute",
            top: "-8px",
            right: "-8px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "#8b1a1a",
            color: "white",
            fontSize: "10px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            lineHeight: 1,
            zIndex: 11,
          }}
          aria-label="Delete field"
        >
          ×
        </button>
      )}

      {resizable && (
        <>
          <span
            onMouseDown={onResizeStart}
            onTouchStart={onResizeStart}
            style={{
              position: "absolute",
              right: "-5px",
              bottom: "-5px",
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: cfg.color,
              border: "1px solid white",
              cursor: "nwse-resize",
              zIndex: 12,
            }}
            aria-label="Resize field"
          />
          <span
            onMouseDown={onResizeStart}
            onTouchStart={onResizeStart}
            style={{
              position: "absolute",
              left: "-5px",
              top: "-5px",
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: cfg.color,
              border: "1px solid white",
              cursor: "nwse-resize",
              zIndex: 12,
            }}
            aria-hidden
          />
        </>
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
