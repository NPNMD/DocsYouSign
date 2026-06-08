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
  status: "draft" | "prepared" | "sent" | "signed" | "completed";
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
  templateVersion?: string;     // exact catalog version used to create/sign
  templateRiskLevel?: TemplateRiskLevel;
  templateAcknowledgedAt?: Date;
  templateSnapshotHtml?: string; // rendered body preserved at execution time
  templateSnapshotHash?: string; // SHA-256 of rendered body when available
  formData?: Record<string, string>; // answers for form templates
  bodyOverride?: string;        // user-edited document HTML (overrides template render)
  customTemplateId?: string;    // source custom template, if created from one
  // Send-to-sign
  pendingSignerEmail?: string;  // recipient email (lowercased) authorized to sign
  signingRequestId?: string;    // active signing request
  envelopeId?: string;          // envelope this document belongs to
  // Final artifacts
  signedPdfPath?: string;
  signedPdfUrl?: string;
  certificatePath?: string;
  completedAt?: Date;
}

// ── Envelope model ────────────────────────────────────────────────
export type EnvelopeStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "partially_signed"
  | "completed"
  | "declined"
  | "voided"
  | "expired";

export type SignerStatus =
  | "pending"
  | "viewed"
  | "verified"
  | "signed"
  | "declined"
  | "reassigned";

export interface EnvelopeSigner {
  id: string;
  email: string;
  name: string;
  order: number;
  status: SignerStatus;
  tokenHash: string;
  signingRequestId?: string;
  viewedAt?: Date;
  signedAt?: Date;
}

export interface Envelope {
  id: string;
  senderId: string;
  senderEmail: string;
  documentId: string;
  documentName: string;
  status: EnvelopeStatus;
  subject?: string;
  message?: string;
  signers: EnvelopeSigner[];
  audit: SigningAuditEntry[];
  createdAt: Date;
  sentAt?: Date;
  expiresAt?: Date;
  completedAt?: Date;
}

// ── Billing ───────────────────────────────────────────────────────
export type BillingPlan = "trial" | "starter" | "pro" | "team";

export interface UserBilling {
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  plan: BillingPlan;
  trialEndsAt?: Date;
  envelopesUsed: number;
  periodStart: Date;
  periodEnd?: Date;
}

// ── Team workspace ────────────────────────────────────────────────
export type TeamRole = "owner" | "admin" | "member";

export interface TeamMember {
  userId: string;
  email: string;
  role: TeamRole;
  joinedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: Date;
}

// ── Webhooks ──────────────────────────────────────────────────────
export type WebhookEvent =
  | "envelope.sent"
  | "envelope.viewed"
  | "envelope.completed"
  | "envelope.declined"
  | "envelope.voided";

export interface WebhookSubscription {
  id: string;
  userId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  createdAt: Date;
}

// ── User-saved custom templates ───────────────────────────────────
export interface CustomTemplate {
  id: string;
  ownerId: string;
  name: string;
  category: TemplateCategory;
  baseTemplateId?: string;      // stock template it was derived from
  bodyHtml: string;             // the saved (edited) agreement body
  createdAt: Date;
  updatedAt: Date;
}

// ── Template catalog ──────────────────────────────────────────────
export type TemplateCategory =
  | "Business"
  | "HR"
  | "Healthcare"
  | "Real Estate"
  | "Personal"
  | "Finance";

export type TemplateRiskLevel = "low" | "medium" | "high" | "restricted";

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
  // Only show this field when another field equals a given value
  // (e.g. a "Specify" text box that appears when a select is "Other").
  showWhen?: { key: string; value: string };
}

export interface BaseTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  icon: string;                // emoji for the gallery card
  version?: string;
  riskLevel?: TemplateRiskLevel;
  jurisdictionSensitive?: boolean;
  attorneyReviewRecommended?: boolean;
  officialFormSensitive?: boolean;
  sourceUrl?: string;
  lastReviewed?: string;       // ISO date string
  warnings?: string[];
  tags?: string[];
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
  event: "sent" | "viewed" | "verified" | "signed" | "consent" | "voided" | "declined" | "reminded";
  at: Date;
  ip?: string;
  userAgent?: string;
  email?: string;
}

export interface SigningRequest {
  id: string;
  documentId: string;
  senderId: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  token: string;               // raw token (returned once; also used as doc id for lookup)
  tokenHash?: string;
  envelopeId?: string;
  status: "sent" | "viewed" | "signed" | "voided";
  audit: SigningAuditEntry[];
  createdAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
  signedAt?: Date;
  expiresAt?: Date;
}
