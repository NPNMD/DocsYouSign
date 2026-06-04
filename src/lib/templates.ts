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
  { key: "company", label: "Company / Organization", input: "text", placeholder: "Company name", half: true },
  { key: "title", label: "Title / Position", input: "text", placeholder: "e.g. CEO, Director", half: true },
  { key: "email", label: "Email Address", input: "email", placeholder: "you@company.com", half: true },
  { key: "phone", label: "Phone Number", input: "tel", placeholder: "(555) 000-0000", half: true },
  { key: "address", label: "Business Address", input: "text", placeholder: "Street, City, State, ZIP" },
  {
    key: "purpose", label: "Purpose of Disclosure", input: "select", half: true,
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

// ════════════════════════════════════════════════════════════════
// INDEPENDENT CONTRACTOR AGREEMENT
// ════════════════════════════════════════════════════════════════
const contractorFields: TemplateFieldDef[] = [
  { key: "clientName", label: "Client / Company (you)", input: "text", required: true, placeholder: "Your company name", half: true },
  { key: "contractorName", label: "Contractor Full Name", input: "text", required: true, placeholder: "Contractor name", half: true },
  { key: "contractorEntity", label: "Contractor Entity", input: "select", half: true, defaultValue: "an individual",
    options: ["an individual", "a limited liability company", "a corporation", "a sole proprietorship"] },
  { key: "contractorEmail", label: "Contractor Email", input: "email", placeholder: "contractor@email.com", half: true },
  { key: "contractorAddress", label: "Contractor Address", input: "text", placeholder: "Street, City, State, ZIP" },
  { key: "services", label: "Description of Services", input: "textarea", required: true, placeholder: "Describe the work to be performed…" },
  { key: "startDate", label: "Start Date", input: "date", half: true },
  { key: "endDate", label: "End Date (or leave blank for ongoing)", input: "date", half: true },
  { key: "compensation", label: "Compensation", input: "text", required: true, placeholder: "e.g. $5,000 flat / $100 per hour", half: true },
  { key: "paymentTerms", label: "Payment Terms", input: "select", half: true, defaultValue: "Net 30",
    options: ["Upon completion", "Net 15", "Net 30", "Monthly", "Per milestone"] },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, placeholder: "e.g. Texas", defaultValue: "Texas" },
];

function contractorRenderBody(v: Record<string, string>): string {
  const client = v.clientName || "[Client]";
  const contractor = v.contractorName || "[Contractor]";
  const state = v.governingState || "Texas";
  return `
    <h1>INDEPENDENT CONTRACTOR AGREEMENT</h1>
    <h2>Services Engagement</h2>
    <div class="tpl-divider"></div>
    <p>This Independent Contractor Agreement (this <strong>"Agreement"</strong>) is made as of ${fill(today())} between ${fill(client)} (the <strong>"Client"</strong>) and ${fill(contractor)}, ${fill(v.contractorEntity, "an individual")} (the <strong>"Contractor"</strong>).</p>
    <div class="tpl-parties">
      <div><div class="tpl-plabel">Client</div><div class="tpl-pval">${fill(client)}</div></div>
      <div><div class="tpl-plabel">Contractor</div><div class="tpl-pval">${fill(contractor)}</div>
        <div class="tpl-psub">${fill(v.contractorAddress, "[Address]")}${v.contractorEmail ? `<br>${esc(v.contractorEmail)}` : ""}</div></div>
    </div>
    <div class="tpl-section">1. Services</div>
    <p>Contractor shall perform the following services (the <strong>"Services"</strong>): ${fill(v.services, "[Description of Services]")}</p>
    <div class="tpl-section">2. Term</div>
    <p>This Agreement begins on ${fill(v.startDate, "[Start Date]")} and continues ${v.endDate ? `until ${fill(v.endDate)}` : "until the Services are complete or terminated as provided herein"}. Either party may terminate on ten (10) days' written notice.</p>
    <div class="tpl-section">3. Compensation</div>
    <p>Client shall pay Contractor <strong>${fill(v.compensation, "[Compensation]")}</strong>, payable <strong>${fill(v.paymentTerms, "Net 30")}</strong>. Contractor is responsible for all taxes on amounts received.</p>
    <div class="tpl-section">4. Independent Contractor Status</div>
    <p>Contractor is an independent contractor, not an employee, partner, or agent of Client. Contractor controls the manner and means of performing the Services and is not entitled to employee benefits. Contractor is responsible for all self-employment and income taxes.</p>
    <div class="tpl-section">5. Work Product &amp; Intellectual Property</div>
    <p>All deliverables, work product, and intellectual property created in connection with the Services shall be the sole property of Client as "work made for hire." Contractor hereby assigns all right, title, and interest in such work product to Client.</p>
    <div class="tpl-section">6. Confidentiality</div>
    <p>Contractor shall keep confidential all non-public information of Client and shall not use or disclose it except to perform the Services. This obligation survives termination.</p>
    <div class="tpl-section">7. Indemnification &amp; Governing Law</div>
    <div class="tpl-highlight">
      <strong>Indemnification:</strong> Each party shall indemnify the other against claims arising from its own negligence or breach.<br><br>
      <strong>Governing Law:</strong> This Agreement is governed by the laws of the State of ${esc(state)}.<br><br>
      <strong>Entire Agreement:</strong> This is the entire agreement between the parties and supersedes all prior understandings.
    </div>
    <div class="tpl-section">Signatures</div>
    <div class="tpl-parties">
      <div><div class="tpl-plabel">Client</div><div class="tpl-pval" style="margin-top:6px">${esc(client)}</div><div class="tpl-psub">Date: ${esc(today())}</div></div>
      <div><div class="tpl-plabel">Contractor</div><div class="tpl-pval" style="margin-top:6px">${fill(contractor, "[Contractor]")}</div><div class="tpl-psub">Date: ${esc(today())}</div></div>
    </div>
  `;
}

const contractor: FormTemplate = {
  id: "contractor",
  kind: "form",
  name: "Independent Contractor Agreement",
  category: "Business",
  icon: "\u{1F9F0}",
  description: "Engage a freelancer or contractor — scope, pay, IP ownership, and confidentiality.",
  fields: contractorFields,
  consentText:
    "I have read and agree to be bound by this Independent Contractor Agreement, and I confirm I am authorized to sign. " +
    "I understand this electronic signature is legally binding under the E-SIGN Act and applicable state UETA.",
  renderBody: contractorRenderBody,
};

// ════════════════════════════════════════════════════════════════
// W-9 — Request for Taxpayer Identification Number and Certification
// ════════════════════════════════════════════════════════════════
const w9Fields: TemplateFieldDef[] = [
  { key: "name", label: "Name (as shown on your tax return)", input: "text", required: true, placeholder: "Full legal name" },
  { key: "businessName", label: "Business / Disregarded Entity Name (if different)", input: "text", placeholder: "Business name" },
  { key: "taxClass", label: "Federal Tax Classification", input: "select", required: true,
    options: ["Individual / sole proprietor", "C Corporation", "S Corporation", "Partnership", "Trust / estate", "Limited liability company"] },
  { key: "llcClass", label: "If LLC, tax classification (C, S, or P)", input: "text", half: true, placeholder: "C, S, or P" },
  { key: "exemptCode", label: "Exempt Payee Code (if any)", input: "text", half: true, placeholder: "Optional" },
  { key: "address", label: "Address (number, street, apt/suite)", input: "text", required: true, placeholder: "Street address" },
  { key: "cityStateZip", label: "City, State, ZIP", input: "text", required: true, placeholder: "City, ST ZIP", half: true },
  { key: "tin", label: "Taxpayer ID (SSN or EIN)", input: "text", required: true, placeholder: "XXX-XX-XXXX or XX-XXXXXXX", half: true },
  { key: "requester", label: "Requester's Name & Address (optional)", input: "text", placeholder: "Who requested this W-9" },
];

function w9RenderBody(v: Record<string, string>): string {
  return `
    <h1>FORM W-9</h1>
    <h2>Request for Taxpayer Identification Number and Certification</h2>
    <div class="tpl-divider"></div>
    <p style="font-size:11px;color:#888;">This is a stock equivalent of IRS Form W-9 for convenience. For official filing, use the current form at irs.gov.</p>
    <div class="tpl-parties">
      <div><div class="tpl-plabel">Name</div><div class="tpl-pval">${fill(v.name, "[Name]")}</div></div>
      <div><div class="tpl-plabel">Business Name</div><div class="tpl-pval">${fill(v.businessName, "—")}</div></div>
    </div>
    <div class="tpl-section">Federal Tax Classification</div>
    <p>${fill(v.taxClass, "[Classification]")}${v.llcClass ? ` (LLC tax class: ${esc(v.llcClass)})` : ""}${v.exemptCode ? ` — Exempt payee code: ${esc(v.exemptCode)}` : ""}</p>
    <div class="tpl-section">Address</div>
    <p>${fill(v.address, "[Address]")}<br>${fill(v.cityStateZip, "[City, State, ZIP]")}</p>
    <div class="tpl-section">Part I — Taxpayer Identification Number (TIN)</div>
    <p>SSN / EIN: <strong>${fill(v.tin, "[TIN]")}</strong></p>
    <div class="tpl-section">Part II — Certification</div>
    <div class="tpl-highlight">Under penalties of perjury, I certify that: (1) the number shown on this form is my correct taxpayer identification number; (2) I am not subject to backup withholding; (3) I am a U.S. citizen or other U.S. person; and (4) any FATCA code(s) entered are correct. The Internal Revenue Service does not require your consent to any provision of this document other than the certifications required to avoid backup withholding.</div>
    ${v.requester ? `<p style="font-size:11px;color:#888;">Requested by: ${esc(v.requester)}</p>` : ""}
    <div class="tpl-section">Signature</div>
    <p>Signature of U.S. person — Date: ${esc(today())}</p>
  `;
}

const w9: FormTemplate = {
  id: "w9",
  kind: "form",
  name: "W-9 (Taxpayer ID & Certification)",
  category: "Finance",
  icon: "\u{1F9FE}",
  description: "Collect a contractor or vendor's taxpayer info. The most-requested US tax form.",
  fields: w9Fields,
  consentText:
    "Under penalties of perjury, I certify the information above is true and correct, and that I am a U.S. person. " +
    "I understand this electronic signature is legally binding. (For official IRS filing, use the current Form W-9 at irs.gov.)",
  renderBody: w9RenderBody,
};

// ════════════════════════════════════════════════════════════════
// EMPLOYMENT OFFER LETTER
// ════════════════════════════════════════════════════════════════
const offerFields: TemplateFieldDef[] = [
  { key: "companyName", label: "Company", input: "text", required: true, placeholder: "Company name", half: true },
  { key: "candidateName", label: "Candidate Full Name", input: "text", required: true, placeholder: "Candidate name", half: true },
  { key: "jobTitle", label: "Job Title", input: "text", required: true, placeholder: "e.g. Software Engineer", half: true },
  { key: "employmentType", label: "Employment Type", input: "select", half: true, defaultValue: "Full-time",
    options: ["Full-time", "Part-time", "Contract", "Temporary"] },
  { key: "salary", label: "Compensation Amount", input: "text", required: true, placeholder: "e.g. $120,000", half: true },
  { key: "payPeriod", label: "Pay Period", input: "select", half: true, defaultValue: "per year",
    options: ["per year", "per hour", "per month"] },
  { key: "startDate", label: "Start Date", input: "date", required: true, half: true },
  { key: "manager", label: "Reports To", input: "text", placeholder: "Manager name & title", half: true },
  { key: "atWillState", label: "Governing Law (State)", input: "text", half: true, placeholder: "e.g. Texas", defaultValue: "Texas" },
  { key: "offerExpires", label: "Offer Expiration Date", input: "date", half: true },
];

function offerRenderBody(v: Record<string, string>): string {
  const company = v.companyName || "[Company]";
  const candidate = v.candidateName || "[Candidate]";
  const state = v.atWillState || "Texas";
  return `
    <h1>EMPLOYMENT OFFER LETTER</h1>
    <h2>${esc(company)}</h2>
    <div class="tpl-divider"></div>
    <p>${esc(today())}</p>
    <p>Dear ${fill(candidate)},</p>
    <p>${esc(company)} is pleased to offer you the position of <strong>${fill(v.jobTitle, "[Job Title]")}</strong> (${fill(v.employmentType, "Full-time")}). We are excited about the contributions you will make to our team.</p>
    <div class="tpl-section">Position &amp; Start Date</div>
    <p>Your start date will be ${fill(v.startDate, "[Start Date]")}${v.manager ? `, reporting to ${esc(v.manager)}` : ""}.</p>
    <div class="tpl-section">Compensation</div>
    <p>You will be paid <strong>${fill(v.salary, "[Amount]")} ${fill(v.payPeriod, "per year")}</strong>, subject to standard withholdings and payable per the Company's regular payroll schedule. You may be eligible for benefits per Company policy.</p>
    <div class="tpl-section">At-Will Employment</div>
    <p>Your employment with ${esc(company)} is <strong>at-will</strong>, meaning either you or the Company may terminate the employment relationship at any time, with or without cause or notice, subject to the laws of the State of ${esc(state)}.</p>
    <div class="tpl-section">Contingencies</div>
    <div class="tpl-highlight">This offer is contingent upon: (a) your authorization to work in the United States; (b) satisfactory completion of any background check; and (c) your signing of the Company's confidentiality and proprietary-rights agreement.</div>
    <p>${v.offerExpires ? `This offer expires on ${fill(v.offerExpires)} if not accepted.` : ""} To accept, please sign below.</p>
    <div class="tpl-section">Acceptance</div>
    <div class="tpl-parties">
      <div><div class="tpl-plabel">${esc(company)}</div><div class="tpl-psub">Authorized Representative<br>Date: ${esc(today())}</div></div>
      <div><div class="tpl-plabel">Accepted by</div><div class="tpl-pval" style="margin-top:6px">${fill(candidate, "[Candidate]")}</div><div class="tpl-psub">Date: ${esc(today())}</div></div>
    </div>
  `;
}

const offer: FormTemplate = {
  id: "offer-letter",
  kind: "form",
  name: "Employment Offer Letter",
  category: "HR",
  icon: "\u{2709}\u{FE0F}",
  description: "Extend a job offer — title, compensation, start date, and at-will terms.",
  fields: offerFields,
  consentText:
    "I accept this offer of employment and agree to its terms, including at-will employment. " +
    "I understand this electronic signature is legally binding under the E-SIGN Act and applicable state UETA.",
  renderBody: offerRenderBody,
};

// ════════════════════════════════════════════════════════════════
// LIABILITY WAIVER / RELEASE
// ════════════════════════════════════════════════════════════════
const waiverFields: TemplateFieldDef[] = [
  { key: "organization", label: "Organization / Provider", input: "text", required: true, placeholder: "Hosting organization", half: true },
  { key: "participant", label: "Participant Full Name", input: "text", required: true, placeholder: "Participant name", half: true },
  { key: "participantAddress", label: "Participant Address", input: "text", placeholder: "Street, City, State, ZIP" },
  { key: "activity", label: "Activity / Event", input: "textarea", required: true, placeholder: "Describe the activity or event…" },
  { key: "eventDate", label: "Activity Date", input: "date", half: true },
  { key: "emergencyContact", label: "Emergency Contact", input: "text", placeholder: "Name", half: true },
  { key: "emergencyPhone", label: "Emergency Phone", input: "tel", placeholder: "(555) 000-0000", half: true },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, placeholder: "e.g. Texas", defaultValue: "Texas" },
  { key: "minorName", label: "Minor Participant Name (if applicable)", input: "text", placeholder: "Leave blank if not a minor", half: true },
  { key: "guardianName", label: "Parent / Guardian Name (if minor)", input: "text", placeholder: "Guardian name", half: true },
];

function waiverRenderBody(v: Record<string, string>): string {
  const org = v.organization || "[Organization]";
  const participant = v.participant || "[Participant]";
  const state = v.governingState || "Texas";
  const isMinor = !!(v.minorName && v.minorName.trim());
  return `
    <h1>RELEASE OF LIABILITY &amp; ASSUMPTION OF RISK</h1>
    <h2>Waiver Agreement</h2>
    <div class="tpl-divider"></div>
    <p>In consideration of being permitted to participate in the activity described below provided by ${fill(org)}, the undersigned (<strong>"Participant"</strong>) agrees as follows:</p>
    <div class="tpl-parties">
      <div><div class="tpl-plabel">Provider</div><div class="tpl-pval">${fill(org)}</div></div>
      <div><div class="tpl-plabel">Participant</div><div class="tpl-pval">${fill(participant)}</div>
        <div class="tpl-psub">${fill(v.participantAddress, "[Address]")}</div></div>
    </div>
    <div class="tpl-section">Activity</div>
    <p>${fill(v.activity, "[Activity Description]")}${v.eventDate ? ` (Date: ${fill(v.eventDate)})` : ""}</p>
    <div class="tpl-section">1. Assumption of Risk</div>
    <p>Participant understands that the activity involves inherent risks, including risk of serious injury, illness, or death, and property damage. Participant knowingly and voluntarily assumes all such risks, both known and unknown.</p>
    <div class="tpl-section">2. Release &amp; Waiver</div>
    <p>Participant hereby releases, waives, and discharges ${esc(org)}, its owners, employees, and agents (the <strong>"Released Parties"</strong>) from any and all liability, claims, or demands arising out of or related to participation in the activity, including those caused by the negligence of the Released Parties, to the fullest extent permitted by law.</p>
    <div class="tpl-section">3. Indemnification</div>
    <p>Participant agrees to indemnify and hold harmless the Released Parties from any loss or liability incurred as a result of Participant's participation.</p>
    <div class="tpl-section">4. Medical Authorization &amp; Governing Law</div>
    <div class="tpl-highlight">
      <strong>Medical:</strong> Participant authorizes the Released Parties to secure emergency medical treatment if needed, at Participant's expense.${v.emergencyContact ? ` Emergency contact: ${esc(v.emergencyContact)}${v.emergencyPhone ? `, ${esc(v.emergencyPhone)}` : ""}.` : ""}<br><br>
      <strong>Governing Law:</strong> This Release is governed by the laws of the State of ${esc(state)} and is intended to be as broad as permitted by law. If any provision is held invalid, the remainder shall continue in effect.
    </div>
    <div class="tpl-section">Signature</div>
    ${isMinor
      ? `<p>As parent/legal guardian of the minor <strong>${fill(v.minorName)}</strong>, I execute this Release on the minor's behalf and on my own behalf.</p>
         <div class="tpl-parties"><div><div class="tpl-plabel">Parent / Guardian</div><div class="tpl-pval" style="margin-top:6px">${fill(v.guardianName, "[Guardian]")}</div><div class="tpl-psub">Date: ${esc(today())}</div></div>
         <div><div class="tpl-plabel">Minor Participant</div><div class="tpl-pval" style="margin-top:6px">${fill(v.minorName)}</div></div></div>`
      : `<div class="tpl-parties"><div><div class="tpl-plabel">Participant</div><div class="tpl-pval" style="margin-top:6px">${fill(participant, "[Participant]")}</div><div class="tpl-psub">Date: ${esc(today())}</div></div></div>`
    }
  `;
}

const waiver: FormTemplate = {
  id: "liability-waiver",
  kind: "form",
  name: "Liability Waiver / Release",
  category: "Personal",
  icon: "\u{1F6E1}\u{FE0F}",
  description: "Waiver of liability and assumption of risk for an activity or event. Supports minors.",
  fields: waiverFields,
  consentText:
    "I have read this Release of Liability and Assumption of Risk, I understand I am giving up substantial legal rights, " +
    "and I sign it freely and voluntarily. I understand this electronic signature is legally binding.",
  renderBody: waiverRenderBody,
};

// ════════════════════════════════════════════════════════════════
// RESIDENTIAL LEASE AGREEMENT
// ════════════════════════════════════════════════════════════════
const leaseFields: TemplateFieldDef[] = [
  { key: "landlord", label: "Landlord Name", input: "text", required: true, placeholder: "Landlord / owner", half: true },
  { key: "tenant", label: "Tenant Name", input: "text", required: true, placeholder: "Tenant name", half: true },
  { key: "propertyAddress", label: "Property Address", input: "text", required: true, placeholder: "Street, Unit, City, State, ZIP" },
  { key: "leaseStart", label: "Lease Start", input: "date", required: true, half: true },
  { key: "leaseEnd", label: "Lease End", input: "date", required: true, half: true },
  { key: "rent", label: "Monthly Rent", input: "text", required: true, placeholder: "e.g. $1,800", half: true },
  { key: "dueDay", label: "Rent Due Day", input: "text", placeholder: "e.g. 1st of month", half: true },
  { key: "deposit", label: "Security Deposit", input: "text", required: true, placeholder: "e.g. $1,800", half: true },
  { key: "lateFee", label: "Late Fee", input: "text", placeholder: "e.g. $50 after the 5th", half: true },
  { key: "occupants", label: "Permitted Occupants", input: "text", placeholder: "Names of all occupants" },
  { key: "pets", label: "Pets Allowed?", input: "select", half: true, defaultValue: "No", options: ["No", "Yes (with deposit)", "Yes"] },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, placeholder: "e.g. Texas", defaultValue: "Texas" },
];

function leaseRenderBody(v: Record<string, string>): string {
  const landlord = v.landlord || "[Landlord]";
  const tenant = v.tenant || "[Tenant]";
  const state = v.governingState || "Texas";
  return `
    <h1>RESIDENTIAL LEASE AGREEMENT</h1>
    <h2>${fill(v.propertyAddress, "[Property Address]")}</h2>
    <div class="tpl-divider"></div>
    <p>This Residential Lease Agreement (this <strong>"Lease"</strong>) is made as of ${fill(today())} between ${fill(landlord)} (<strong>"Landlord"</strong>) and ${fill(tenant)} (<strong>"Tenant"</strong>).</p>
    <div class="tpl-section">1. Premises</div>
    <p>Landlord leases to Tenant the residential property located at ${fill(v.propertyAddress, "[Property Address]")} (the <strong>"Premises"</strong>) for residential use only.${v.occupants ? ` Permitted occupants: ${esc(v.occupants)}.` : ""}</p>
    <div class="tpl-section">2. Term</div>
    <p>The Lease term begins ${fill(v.leaseStart, "[Start]")} and ends ${fill(v.leaseEnd, "[End]")}, unless terminated earlier as provided herein.</p>
    <div class="tpl-section">3. Rent</div>
    <p>Tenant shall pay rent of <strong>${fill(v.rent, "[Rent]")}</strong> per month, due ${fill(v.dueDay, "on the 1st")} of each month.${v.lateFee ? ` Late fee: ${esc(v.lateFee)}.` : ""}</p>
    <div class="tpl-section">4. Security Deposit</div>
    <p>Tenant shall pay a security deposit of <strong>${fill(v.deposit, "[Deposit]")}</strong>, to be returned within the period required by law after move-out, less lawful deductions for damages beyond normal wear and tear.</p>
    <div class="tpl-section">5. Use, Pets &amp; Maintenance</div>
    <div class="tpl-highlight">
      <strong>Use:</strong> The Premises shall be used as a private residence only.<br><br>
      <strong>Pets:</strong> ${esc(v.pets || "No")}.<br><br>
      <strong>Maintenance:</strong> Tenant shall keep the Premises clean and promptly report needed repairs. Tenant is responsible for damage caused by Tenant or guests.<br><br>
      <strong>Utilities:</strong> Except as otherwise agreed in writing, Tenant is responsible for utilities.
    </div>
    <div class="tpl-section">6. Default &amp; Governing Law</div>
    <p>If Tenant fails to pay rent or breaches this Lease, Landlord may pursue all remedies available under the laws of the State of ${esc(state)}, including termination and eviction as permitted by law. This Lease is governed by the laws of the State of ${esc(state)}.</p>
    <div class="tpl-section">Signatures</div>
    <div class="tpl-parties">
      <div><div class="tpl-plabel">Landlord</div><div class="tpl-pval" style="margin-top:6px">${fill(landlord, "[Landlord]")}</div><div class="tpl-psub">Date: ${esc(today())}</div></div>
      <div><div class="tpl-plabel">Tenant</div><div class="tpl-pval" style="margin-top:6px">${fill(tenant, "[Tenant]")}</div><div class="tpl-psub">Date: ${esc(today())}</div></div>
    </div>
  `;
}

const lease: FormTemplate = {
  id: "residential-lease",
  kind: "form",
  name: "Residential Lease Agreement",
  category: "Real Estate",
  icon: "\u{1F3E0}",
  description: "Rent out a residential property — term, rent, deposit, and house rules.",
  fields: leaseFields,
  consentText:
    "I have read and agree to be bound by the terms of this Residential Lease Agreement. " +
    "I understand this electronic signature is legally binding under the E-SIGN Act and applicable state UETA.",
  renderBody: leaseRenderBody,
};

// ── registry ──────────────────────────────────────────────────────
export const TEMPLATES: Template[] = [
  nda,
  contractor,
  offer,
  w9,
  waiver,
  lease,
];

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
