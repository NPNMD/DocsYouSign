"use client";
import type { DocumentField } from "@/lib/types";

interface Props {
  fields: DocumentField[];
  fieldValues: Record<string, string>;
  consent: boolean;
  onJumpToField: (field: DocumentField) => void;
  className?: string;
}

function isFieldRequired(field: DocumentField): boolean {
  return field.required !== "optional" && field.type !== "date";
}

function isFieldComplete(field: DocumentField, values: Record<string, string>): boolean {
  const value = values[field.id] ?? field.value;
  if (field.type === "checkbox") return value === "true";
  if (field.type === "date") return true;
  return !!value;
}

/** Guided signing controls: progress, next incomplete field, finish gate. */
export default function GuidedSigning({ fields, fieldValues, consent, onJumpToField, className = "" }: Props) {
  const fillable = fields.filter((f) => f.type !== "date" || f.autoDate);
  const required = fillable.filter(isFieldRequired);
  const completed = required.filter((f) => isFieldComplete(f, fieldValues));
  const next = required.find((f) => !isFieldComplete(f, fieldValues));
  const allDone = required.every((f) => isFieldComplete(f, fieldValues)) && consent;

  return (
    <div
      className={`sticky bottom-0 z-20 px-4 py-3 rounded-xl flex flex-wrap items-center gap-3 ${className}`}
      style={{ background: "white", border: "1px solid var(--border)", boxShadow: "0 -4px 20px rgba(10,22,40,0.08)" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex-1 min-w-[140px]">
        <p className="text-xs font-semibold" style={{ color: "var(--navy)" }}>
          Field {completed.length} of {required.length} complete
        </p>
        <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(10,22,40,0.08)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: required.length ? `${(completed.length / required.length) * 100}%` : "100%",
              background: allDone ? "var(--success)" : "var(--gold)",
            }}
          />
        </div>
      </div>
      <div className="flex gap-2">
        {next && (
          <button
            type="button"
            onClick={() => onJumpToField(next)}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--navy)", color: "var(--gold)" }}
            aria-label={`Go to next field: ${next.label ?? next.type}`}
          >
            Next field →
          </button>
        )}
        {!next && required.length > 0 && !allDone && (
          <button
            type="button"
            onClick={() => {
              const first = required.find((f) => !isFieldComplete(f, fieldValues));
              if (first) onJumpToField(first);
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--navy)", color: "var(--gold)" }}
          >
            Start signing
          </button>
        )}
      </div>
      {allDone && (
        <span className="text-xs font-semibold" style={{ color: "var(--success)" }}>
          Ready to finish ✓
        </span>
      )}
    </div>
  );
}

export function getIncompleteRequiredFields(
  fields: DocumentField[],
  fieldValues: Record<string, string>
): DocumentField[] {
  return fields.filter((f) => isFieldRequired(f) && !isFieldComplete(f, fieldValues));
}

export function isSigningComplete(
  fields: DocumentField[],
  fieldValues: Record<string, string>,
  consent: boolean
): boolean {
  const required = fields.filter((f) => f.type !== "date" || f.autoDate).filter(isFieldRequired);
  return consent && required.every((f) => isFieldComplete(f, fieldValues));
}
