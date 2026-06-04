export type FieldType = "signature" | "initials" | "date" | "text";

export interface DocumentField {
  id: string;
  type: FieldType;
  page: number;       // 1-indexed
  x: number;          // % of page width
  y: number;          // % of page height
  width: number;      // % of page width
  height: number;     // % of page height
  value?: string;     // filled value (dataUrl for sig/initials, ISO string for date, text for text)
  label?: string;     // optional custom label
}

export interface Document {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  // PDF-backed documents have storage; form-template documents do not.
  storageUrl?: string;
  storagePath?: string;
  status: "draft" | "prepared" | "signed" | "completed";
  fields: DocumentField[];
  createdAt: Date;
  updatedAt: Date;
  signedAt?: Date;
  signerName?: string;
  pageCount?: number;
  fileSize?: number;
  // Template support
  kind?: "pdf" | "form";        // defaults to "pdf" when absent
  templateId?: string;          // set when created from a template
  formData?: Record<string, string>; // answers for form templates
}

// ── Template catalog ──────────────────────────────────────────────
export type TemplateCategory =
  | "Business"
  | "HR"
  | "Healthcare"
  | "Real Estate"
  | "Personal"
  | "Finance";

export type TemplateFieldInput = "text" | "email" | "tel" | "textarea" | "select" | "date";

export interface TemplateFieldDef {
  key: string;
  label: string;
  input: TemplateFieldInput;
  required?: boolean;
  placeholder?: string;
  options?: string[];          // for select
  half?: boolean;              // render two-per-row
  defaultValue?: string;
}

export interface BaseTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  icon: string;                // emoji for the gallery card
}

export interface FormTemplate extends BaseTemplate {
  kind: "form";
  fields: TemplateFieldDef[];
  consentText: string;
  // Builds the live document body (HTML string) from filled values.
  renderBody: (values: Record<string, string>) => string;
}

export interface PdfTemplate extends BaseTemplate {
  kind: "pdf";
  storagePath: string;         // base PDF in storage
  prebuiltFields: DocumentField[];
}

export type Template = FormTemplate | PdfTemplate;

// ── Send-to-sign foundation ───────────────────────────────────────
export interface SigningAuditEntry {
  event: "sent" | "viewed" | "verified" | "signed";
  at: Date;
  ip?: string;
  userAgent?: string;
}

export interface SigningRequest {
  id: string;
  documentId: string;
  senderId: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  token: string;               // unique link token → routes to the document
  status: "sent" | "viewed" | "signed" | "voided";
  audit: SigningAuditEntry[];
  createdAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
  signedAt?: Date;
}
