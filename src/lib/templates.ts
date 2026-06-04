import type { Template, FormTemplate, TemplateCategory, TemplateFieldDef } from "./types";

/**
 * Stock template catalog (static / code-defined for v1).
 * Every template is a starting point, NOT legal advice — see LEGAL_DISCLAIMER.
 */

export const LEGAL_DISCLAIMER =
  "This is a stock template provided for convenience and general informational " +
  "purposes only. It is not legal advice and may not fit your situation or " +
  "jurisdiction. Have it reviewed by a licensed attorney before use.";

// ── helpers ───────────────────────────────────────────────────────
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Render a value or a highlighted placeholder when empty. */
function fill(val: string | undefined, placeholder = "[———]"): string {
  const v = (val ?? "").trim();
  return `<span class="tpl-fill">${v ? esc(v) : placeholder}</span>`;
}

function today(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ════════════════════════════════════════════════════════════════
// NDA — Mutual / one-way confidentiality agreement
// ════════════════════════════════════════════════════════════════
const ndaFields: TemplateFieldDef[] = [
  { key: "fname", label: "First Name", input: "text", required: true, placeholder: "First name", half: true },
  { key: "lname", label: "Last Name", input: "text", required: true, placeholder: "Last name", half: true },
  { key: "company", label: "Company / Organization", input: "text", required: true, placeholder: "Company name", half: true },
  { key: "title", label: "Title / Position", input: "text", required: true, placeholder: "e.g. CEO, Director", half: true },
  { key: "email", label: "Email Address", input: "email", required: true, placeholder: "you@company.com", half: true },
  { key: "phone", label: "Phone Number", input: "tel", placeholder: "(555) 000-0000", half: true },
  { key: "address", label: "Business Address", input: "text", required: true, placeholder: "Street, City, State, ZIP" },
  {
    key: "purpose", label: "Purpose of Disclosure", input: "select", required: true, half: true,
    options: [
      "Potential Partnership / Integration",
      "Technology Licensing Discussion",
      "Business Development Consultation",
      "Employment / Contractor Engagement",
      "Investor / Due Diligence Review",
      "Vendor / Supplier Evaluation",
      "Other",
    ],
  },
  {
    key: "entityType", label: "Entity Type", input: "select", half: true,
    defaultValue: "a limited liability company",
    options: [
      "a limited liability company",
      "a corporation",
      "a sole proprietorship",
      "an individual",
      "a general partnership",
      "a limited partnership",
    ],
  },
  {
    key: "disclosingParty", label: "Disclosing Party (your company)", input: "text", required: true,
    placeholder: "e.g. Total Relief LLC", defaultValue: "Total Relief LLC",
  },
  {
    key: "governingState", label: "Governing Law (State)", input: "text", half: true,
    placeholder: "e.g. Texas", defaultValue: "Texas",
  },
  {
    key: "termYears", label: "Term (years)", input: "text", half: true,
    placeholder: "e.g. 5", defaultValue: "5",
  },
];

function ndaRenderBody(v: Record<string, string>): string {
  const fname = (v.fname || "").trim();
  const lname = (v.lname || "").trim();
  const fullName = `${fname} ${lname}`.trim();
  const recipient = v.company || fullName || "";
  const disclosing = v.disclosingParty || "Total Relief LLC";
  const state = v.governingState || "Texas";
  const term = v.termYears || "5";
  const dateStr = today();

  return `
    <h1>NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT</h1>
    <h2>Confidential &amp; Proprietary Information</h2>
    <div class="tpl-divider"></div>

    <div class="tpl-section">PARTIES</div>
    <p>This Non-Disclosure and Confidentiality Agreement (this <strong>"Agreement"</strong>) is entered into as of ${fill(dateStr)} (the <strong>"Effective Date"</strong>) by and between:</p>
    <div class="tpl-parties">
      <div>
        <div class="tpl-plabel">Disclosing Party</div>
        <div class="tpl-pval">${fill(disclosing)}</div>
      </div>
      <div>
        <div class="tpl-plabel">Recipient</div>
        <div class="tpl-pval">${fill(recipient, "[Recipient]")}</div>
        <div class="tpl-psub">${fill(v.entityType, "[Entity Type]")}<br>${fill(v.address, "[Address]")}${v.email ? `<br>${esc(v.email)}` : ""}</div>
      </div>
    </div>

    <div class="tpl-section">RECITALS</div>
    <p>WHEREAS, in connection with a <strong>${fill(v.purpose, "[Purpose of Disclosure]")}</strong>, the Disclosing Party may disclose certain confidential and proprietary information to the Recipient; NOW, THEREFORE, in consideration of the mutual covenants herein, the parties agree as follows:</p>

    <div class="tpl-section">1. DEFINITIONS</div>
    <p><strong>1.1 "Confidential Information"</strong> means any and all non-public information disclosed by or on behalf of ${fill(disclosing)} to ${fill(recipient, "Recipient")}, including: source code, algorithms, data models and APIs; product roadmaps and unreleased features; business strategies and financial information; trade secrets and intellectual property; and any other information a reasonable person would understand to be confidential.</p>
    <p><strong>1.2 "Representatives"</strong> means directors, officers, employees, attorneys, accountants, and consultants who need to know for the Purpose and are bound by equal confidentiality obligations.</p>
    <p><strong>1.3 "Excluded Information"</strong> means information that: (a) was already known to Recipient; (b) becomes publicly available without breach; (c) is received from a non-confidential third party; or (d) was independently developed without reference to Confidential Information.</p>

    <div class="tpl-section">2. CONFIDENTIALITY OBLIGATIONS</div>
    <p><strong>2.1 Non-Disclosure.</strong> ${fill(recipient, "Recipient")} shall hold all Confidential Information in strict confidence and shall not disclose it to any person without prior written consent of ${fill(disclosing)}. This obligation survives termination of this Agreement.</p>
    <p><strong>2.2 Limited Use.</strong> Confidential Information shall be used solely for the <strong>${fill(v.purpose, "stated Purpose")}</strong> and for no other purpose, and shall not be used to develop competing products or services.</p>
    <p><strong>2.3 Standard of Care.</strong> Recipient shall protect Confidential Information using at least the same degree of care as its own most sensitive information, but no less than reasonable care.</p>
    <p><strong>2.4 Need-to-Know Access.</strong> Disclosure is limited to Representatives with a legitimate need to know. Recipient is liable for any breach by its Representatives.</p>
    <p><strong>2.5 Breach Notification.</strong> Recipient shall notify ${fill(disclosing)} promptly upon discovering any unauthorized access, use, or disclosure.</p>

    <div class="tpl-section">3. COMPELLED DISCLOSURE</div>
    <p>If legally compelled to disclose Confidential Information, Recipient shall provide prior written notice where lawful, cooperate in seeking a protective order, and disclose only the minimum required portion.</p>

    <div class="tpl-section">4. ADDITIONAL TERMS</div>
    <div class="tpl-highlight">
      <strong>IP Ownership:</strong> ${esc(disclosing)} retains all rights, title, and interest in the Confidential Information. No license is granted.<br><br>
      <strong>Return / Destruction:</strong> Upon request or termination, Recipient shall return or destroy all Confidential Information and certify completion in writing.<br><br>
      <strong>Term:</strong> ${esc(term)} years. Trade secret obligations survive for as long as the information remains a trade secret.<br><br>
      <strong>Remedies:</strong> Breach entitles ${esc(disclosing)} to injunctive relief in addition to all other available remedies.<br><br>
      <strong>Governing Law:</strong> State of ${esc(state)}; exclusive jurisdiction in the state and federal courts located therein.
    </div>

    <div class="tpl-section">SIGNATURE</div>
    <div class="tpl-parties">
      <div>
        <div class="tpl-plabel">${esc(disclosing)} (Disclosing Party)</div>
        <div class="tpl-pval" style="margin-top:6px">${esc(disclosing)}</div>
        <div class="tpl-psub">Authorized Representative<br>Date: ${esc(dateStr)}</div>
      </div>
      <div>
        <div class="tpl-plabel">Recipient (Signing)</div>
        <div class="tpl-pval" style="margin-top:6px">${fill(fullName, "[Your Full Name]")}</div>
        <div class="tpl-psub">${fill(v.title, "[Title]")} — ${fill(v.company, "[Company]")}<br>Date: ${esc(dateStr)}</div>
      </div>
    </div>
  `;
}

const nda: FormTemplate = {
  id: "nda",
  kind: "form",
  name: "Non-Disclosure Agreement (NDA)",
  category: "Business",
  icon: "\u{1F910}",
  description: "Mutual or one-way confidentiality agreement. The most-sent agreement in business.",
  fields: ndaFields,
  consentText:
    "I have read and understand this Non-Disclosure and Confidentiality Agreement, " +
    "I agree to be legally bound by its terms, and I confirm I have the authority to " +
    "sign on behalf of the named entity. I understand this electronic signature has " +
    "the same legal effect as a handwritten signature under the E-SIGN Act and applicable state UETA.",
  renderBody: ndaRenderBody,
};

// ── registry ──────────────────────────────────────────────────────
export const TEMPLATES: Template[] = [nda];

export const CATEGORY_ORDER: TemplateCategory[] = [
  "Business", "HR", "Healthcare", "Real Estate", "Personal", "Finance",
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getFormTemplate(id: string): FormTemplate | undefined {
  const t = getTemplate(id);
  return t && t.kind === "form" ? t : undefined;
}

export function templatesByCategory(): { category: TemplateCategory; items: Template[] }[] {
  return CATEGORY_ORDER
    .map((category) => ({ category, items: TEMPLATES.filter((t) => t.category === category) }))
    .filter((g) => g.items.length > 0);
}
