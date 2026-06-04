import type { FormTemplate, TemplateFieldDef } from "./types";
import { esc, fill, today, pick } from "./template-utils";

/**
 * Additional stock business agreements (form templates).
 * All are starting points, NOT legal advice — reviewed-by-attorney disclaimer
 * applies (see LEGAL_DISCLAIMER in templates.ts).
 */

const SIGN_CONSENT =
  "I have read and agree to be bound by this agreement, and I confirm I am authorized to sign. " +
  "I understand this electronic signature is legally binding under the E-SIGN Act and applicable state UETA.";

const NONBINDING_CONSENT =
  "I acknowledge this document reflects the parties' current intentions and is non-binding except where it states otherwise. " +
  "I confirm I am authorized to sign, and that this electronic signature is legally binding.";

/** Two-party signature block. aName/bName should already be fill()'d. */
function sig(aLabel: string, aName: string, bLabel: string, bName: string): string {
  return `
    <div class="tpl-section">Signatures</div>
    <div class="tpl-parties">
      <div><div class="tpl-plabel">${esc(aLabel)}</div><div class="tpl-pval" style="margin-top:6px">${aName}</div><div class="tpl-psub">Date: ${esc(today())}</div></div>
      <div><div class="tpl-plabel">${esc(bLabel)}</div><div class="tpl-pval" style="margin-top:6px">${bName}</div><div class="tpl-psub">Date: ${esc(today())}</div></div>
    </div>`;
}

function S(title: string): string {
  return `<div class="tpl-section">${esc(title)}</div>`;
}

const PAYMENT_TERMS = ["Upon receipt", "Net 15", "Net 30", "Net 45", "Monthly", "Per milestone", "Other"];

/** Companion "Specify…" text field for a payment-terms select set to "Other". */
function paymentOther(key: string): TemplateFieldDef {
  return {
    key: `${key}Other`, label: "Specify Payment Terms", input: "text", half: true,
    placeholder: "e.g. 50% upfront, 50% on delivery", showWhen: { key, value: "Other" },
  };
}

// ════════════════════════════════════════════════════════════════
// 1. MASTER SERVICE AGREEMENT
// ════════════════════════════════════════════════════════════════
const msaFields: TemplateFieldDef[] = [
  { key: "provider", label: "Service Provider (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "client", label: "Client", input: "text", required: true, half: true, placeholder: "Client company" },
  { key: "services", label: "Overview of Services", input: "textarea", required: true, placeholder: "The general categories of services to be provided under SOWs…" },
  { key: "effectiveDate", label: "Effective Date", input: "date", half: true },
  { key: "term", label: "Term", input: "text", half: true, defaultValue: "One (1) year, auto-renewing", placeholder: "e.g. 1 year, auto-renewing" },
  { key: "paymentTerms", label: "Payment Terms", input: "select", half: true, defaultValue: "Net 30", options: PAYMENT_TERMS },
  paymentOther("paymentTerms"),
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function msaBody(v: Record<string, string>): string {
  const p = v.provider || "[Provider]", c = v.client || "[Client]", st = v.governingState || "Texas";
  return `
    <h1>MASTER SERVICE AGREEMENT</h1><h2>Framework for Ongoing Services</h2><div class="tpl-divider"></div>
    <p>This Master Service Agreement (this <strong>"Agreement"</strong>) is entered into as of ${fill(v.effectiveDate, today())} between ${fill(p)} (<strong>"Provider"</strong>) and ${fill(c)} (<strong>"Client"</strong>).</p>
    ${S("1. Services")}<p>Provider will perform services described in one or more Statements of Work (each, an <strong>"SOW"</strong>) executed under this Agreement. Each SOW is governed by these terms. General scope: ${fill(v.services, "[Overview of Services]")}.</p>
    ${S("2. Term")}<p>This Agreement begins on the Effective Date and continues for ${fill(v.term, "one (1) year")}, unless terminated earlier. Either party may terminate for material breach on 30 days' written notice if uncured.</p>
    ${S("3. Fees & Payment")}<p>Client shall pay the fees stated in each SOW, due <strong>${fill(pick(v, "paymentTerms"), "Net 30")}</strong>. Late amounts accrue interest at the lesser of 1.5%/month or the maximum lawful rate.</p>
    ${S("4. Confidentiality & IP")}<div class="tpl-highlight"><strong>Confidentiality:</strong> Each party protects the other's non-public information and uses it only to perform under this Agreement.<br><br><strong>Work Product:</strong> Unless an SOW states otherwise, deliverables are owned by Client upon full payment; Provider retains its pre-existing and general tools/know-how.</div>
    ${S("5. Warranty & Liability")}<p>Provider will perform in a professional, workmanlike manner. EXCEPT FOR CONFIDENTIALITY AND INDEMNITY OBLIGATIONS, NEITHER PARTY IS LIABLE FOR INDIRECT OR CONSEQUENTIAL DAMAGES, AND EACH PARTY'S TOTAL LIABILITY IS LIMITED TO THE FEES PAID UNDER THE APPLICABLE SOW.</p>
    ${S("6. Governing Law")}<p>This Agreement is governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Provider", fill(p), "Client", fill(c))}`;
}
const msa: FormTemplate = {
  id: "msa", kind: "form", name: "Master Service Agreement (MSA)", category: "Business", icon: "\u{1F91D}",
  description: "Umbrella terms for an ongoing service relationship; pair with Statements of Work.",
  fields: msaFields, consentText: SIGN_CONSENT, renderBody: msaBody,
};

// ════════════════════════════════════════════════════════════════
// 2. STATEMENT OF WORK
// ════════════════════════════════════════════════════════════════
const sowFields: TemplateFieldDef[] = [
  { key: "provider", label: "Service Provider (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "client", label: "Client", input: "text", required: true, half: true, placeholder: "Client company" },
  { key: "msaRef", label: "Governing MSA (date)", input: "text", half: true, placeholder: "MSA dated …" },
  { key: "projectTitle", label: "Project Title", input: "text", required: true, half: true, placeholder: "Project name" },
  { key: "scope", label: "Scope of Work", input: "textarea", required: true, placeholder: "What will be done…" },
  { key: "deliverables", label: "Deliverables", input: "textarea", placeholder: "Specific deliverables and acceptance criteria…" },
  { key: "startDate", label: "Start Date", input: "date", half: true },
  { key: "endDate", label: "Target Completion", input: "date", half: true },
  { key: "fee", label: "Fees", input: "text", required: true, half: true, placeholder: "e.g. $20,000 fixed" },
  { key: "paymentSchedule", label: "Payment Schedule", input: "select", half: true, defaultValue: "Per milestone", options: PAYMENT_TERMS },
  paymentOther("paymentSchedule"),
];
function sowBody(v: Record<string, string>): string {
  const p = v.provider || "[Provider]", c = v.client || "[Client]";
  return `
    <h1>STATEMENT OF WORK</h1><h2>${fill(v.projectTitle, "[Project Title]")}</h2><div class="tpl-divider"></div>
    <p>This Statement of Work (<strong>"SOW"</strong>) is entered into as of ${fill(today())} between ${fill(p)} (<strong>"Provider"</strong>) and ${fill(c)} (<strong>"Client"</strong>)${v.msaRef ? `, under the ${esc(v.msaRef)}` : ""}, and incorporates the terms of the parties' Master Service Agreement.</p>
    ${S("1. Scope of Work")}<p>${fill(v.scope, "[Scope of Work]")}</p>
    ${S("2. Deliverables")}<p>${fill(v.deliverables, "As described in the scope above.")}</p>
    ${S("3. Timeline")}<p>Work begins ${fill(v.startDate, "[Start]")} with target completion ${fill(v.endDate, "[Completion]")}.</p>
    ${S("4. Fees")}<p>Fees: <strong>${fill(v.fee, "[Fees]")}</strong>, invoiced <strong>${fill(pick(v, "paymentSchedule"), "per milestone")}</strong>, subject to the payment terms of the MSA.</p>
    ${S("5. Acceptance")}<div class="tpl-highlight">Deliverables are deemed accepted if Client does not provide written notice of material non-conformance within ten (10) business days of delivery.</div>
    ${sig("Provider", fill(p), "Client", fill(c))}`;
}
const sow: FormTemplate = {
  id: "sow", kind: "form", name: "Statement of Work (SOW)", category: "Business", icon: "\u{1F4CB}",
  description: "Project-specific scope, deliverables, timeline, and fees under an MSA.",
  fields: sowFields, consentText: SIGN_CONSENT, renderBody: sowBody,
};

// ════════════════════════════════════════════════════════════════
// 3. SERVICE AGREEMENT
// ════════════════════════════════════════════════════════════════
const serviceFields: TemplateFieldDef[] = [
  { key: "provider", label: "Service Provider (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "client", label: "Client", input: "text", required: true, half: true, placeholder: "Client name" },
  { key: "services", label: "Services", input: "textarea", required: true, placeholder: "Describe the services…" },
  { key: "startDate", label: "Start Date", input: "date", half: true },
  { key: "fee", label: "Fee", input: "text", required: true, half: true, placeholder: "e.g. $2,500" },
  { key: "paymentTerms", label: "Payment Terms", input: "select", half: true, defaultValue: "Net 15", options: PAYMENT_TERMS },
  paymentOther("paymentTerms"),
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function serviceBody(v: Record<string, string>): string {
  const p = v.provider || "[Provider]", c = v.client || "[Client]", st = v.governingState || "Texas";
  return `
    <h1>SERVICE AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Service Agreement is made as of ${fill(today())} between ${fill(p)} (<strong>"Provider"</strong>) and ${fill(c)} (<strong>"Client"</strong>).</p>
    ${S("1. Services")}<p>Provider agrees to perform the following services: ${fill(v.services, "[Services]")}, beginning ${fill(v.startDate, "[Start Date]")}.</p>
    ${S("2. Fees")}<p>Client shall pay <strong>${fill(v.fee, "[Fee]")}</strong>, due <strong>${fill(pick(v, "paymentTerms"), "Net 15")}</strong>.</p>
    ${S("3. Independent Contractor")}<p>Provider is an independent contractor and not an employee or agent of Client.</p>
    ${S("4. Ownership & Warranty")}<div class="tpl-highlight">Deliverables become Client's property upon full payment. Provider warrants the services will be performed in a professional manner. Provider's total liability shall not exceed the fees paid.</div>
    ${S("5. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Provider", fill(p), "Client", fill(c))}`;
}
const service: FormTemplate = {
  id: "service-agreement", kind: "form", name: "Service Agreement", category: "Business", icon: "\u{1F6E0}\u{FE0F}",
  description: "A simple one-off services agreement — scope, fee, and ownership.",
  fields: serviceFields, consentText: SIGN_CONSENT, renderBody: serviceBody,
};

// ════════════════════════════════════════════════════════════════
// 4. CONSULTING AGREEMENT
// ════════════════════════════════════════════════════════════════
const consultingFields: TemplateFieldDef[] = [
  { key: "company", label: "Company (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "consultant", label: "Consultant", input: "text", required: true, half: true, placeholder: "Consultant name" },
  { key: "services", label: "Consulting Services", input: "textarea", required: true, placeholder: "Advisory/consulting scope…" },
  { key: "startDate", label: "Start Date", input: "date", half: true },
  { key: "compensation", label: "Compensation", input: "text", required: true, half: true, placeholder: "e.g. $200/hour" },
  { key: "paymentTerms", label: "Payment Terms", input: "select", half: true, defaultValue: "Net 30", options: PAYMENT_TERMS },
  paymentOther("paymentTerms"),
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function consultingBody(v: Record<string, string>): string {
  const co = v.company || "[Company]", cn = v.consultant || "[Consultant]", st = v.governingState || "Texas";
  return `
    <h1>CONSULTING AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Consulting Agreement is made as of ${fill(today())} between ${fill(co)} (<strong>"Company"</strong>) and ${fill(cn)} (<strong>"Consultant"</strong>).</p>
    ${S("1. Engagement")}<p>Company engages Consultant to provide: ${fill(v.services, "[Consulting Services]")}, commencing ${fill(v.startDate, "[Start Date]")}.</p>
    ${S("2. Compensation")}<p>Company shall pay <strong>${fill(v.compensation, "[Compensation]")}</strong>, payable <strong>${fill(pick(v, "paymentTerms"), "Net 30")}</strong>. Consultant is responsible for all taxes.</p>
    ${S("3. Independent Contractor")}<p>Consultant is an independent contractor. Nothing herein creates an employment, partnership, or agency relationship.</p>
    ${S("4. Confidentiality & IP")}<div class="tpl-highlight">Consultant shall keep Company's confidential information in strict confidence. All work product created for Company is assigned to Company upon payment.</div>
    ${S("5. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Company", fill(co), "Consultant", fill(cn))}`;
}
const consulting: FormTemplate = {
  id: "consulting", kind: "form", name: "Consulting Agreement", category: "Business", icon: "\u{1F4BC}",
  description: "Engage an advisor or consultant — scope, fees, confidentiality, and IP.",
  fields: consultingFields, consentText: SIGN_CONSENT, renderBody: consultingBody,
};

// ════════════════════════════════════════════════════════════════
// 5. SALES / PURCHASE AGREEMENT
// ════════════════════════════════════════════════════════════════
const salesFields: TemplateFieldDef[] = [
  { key: "seller", label: "Seller", input: "text", required: true, half: true, placeholder: "Seller name" },
  { key: "buyer", label: "Buyer", input: "text", required: true, half: true, placeholder: "Buyer name" },
  { key: "goods", label: "Goods / Assets", input: "textarea", required: true, placeholder: "Describe what is being sold…" },
  { key: "price", label: "Purchase Price", input: "text", required: true, half: true, placeholder: "e.g. $10,000" },
  { key: "paymentTerms", label: "Payment Terms", input: "select", half: true, defaultValue: "Upon receipt", options: PAYMENT_TERMS },
  paymentOther("paymentTerms"),
  { key: "deliveryDate", label: "Delivery Date", input: "date", half: true },
  { key: "deliveryTerms", label: "Delivery Terms", input: "text", half: true, placeholder: "e.g. FOB Seller's location" },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function salesBody(v: Record<string, string>): string {
  const s = v.seller || "[Seller]", b = v.buyer || "[Buyer]", st = v.governingState || "Texas";
  return `
    <h1>SALES / PURCHASE AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Agreement is made as of ${fill(today())} between ${fill(s)} (<strong>"Seller"</strong>) and ${fill(b)} (<strong>"Buyer"</strong>).</p>
    ${S("1. Sale of Goods")}<p>Seller agrees to sell and Buyer agrees to purchase: ${fill(v.goods, "[Goods / Assets]")}.</p>
    ${S("2. Price & Payment")}<p>Purchase price: <strong>${fill(v.price, "[Price]")}</strong>, payable <strong>${fill(pick(v, "paymentTerms"), "upon receipt")}</strong>.</p>
    ${S("3. Delivery")}<p>Delivery on or about ${fill(v.deliveryDate, "[Delivery Date]")}${v.deliveryTerms ? `, ${esc(v.deliveryTerms)}` : ""}. Title and risk of loss pass to Buyer upon delivery.</p>
    ${S("4. Warranties")}<div class="tpl-highlight">Seller warrants good title and the right to sell. EXCEPT AS STATED, THE GOODS ARE SOLD "AS IS" WITHOUT OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.</div>
    ${S("5. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Seller", fill(s), "Buyer", fill(b))}`;
}
const sales: FormTemplate = {
  id: "sales-agreement", kind: "form", name: "Sales / Purchase Agreement", category: "Business", icon: "\u{1F4E6}",
  description: "Sale of goods or assets — price, payment, delivery, and title transfer.",
  fields: salesFields, consentText: SIGN_CONSENT, renderBody: salesBody,
};

// ════════════════════════════════════════════════════════════════
// 6. LETTER OF INTENT
// ════════════════════════════════════════════════════════════════
const loiFields: TemplateFieldDef[] = [
  { key: "partyA", label: "Party A (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "partyB", label: "Party B", input: "text", required: true, half: true, placeholder: "Other party" },
  { key: "transaction", label: "Proposed Transaction", input: "textarea", required: true, placeholder: "Describe the proposed deal…" },
  { key: "keyTerms", label: "Key Terms", input: "textarea", placeholder: "Price, structure, conditions…" },
  { key: "exclusivityDays", label: "Exclusivity Period (days)", input: "text", half: true, placeholder: "e.g. 30" },
  { key: "expirationDate", label: "Expiration Date", input: "date", half: true },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function loiBody(v: Record<string, string>): string {
  const a = v.partyA || "[Party A]", b = v.partyB || "[Party B]", st = v.governingState || "Texas";
  return `
    <h1>LETTER OF INTENT</h1><h2>Non-Binding</h2><div class="tpl-divider"></div>
    <p>This Letter of Intent (<strong>"LOI"</strong>), dated ${fill(today())}, sets out the intentions of ${fill(a)} and ${fill(b)} regarding a proposed transaction.</p>
    ${S("1. Proposed Transaction")}<p>${fill(v.transaction, "[Proposed Transaction]")}</p>
    ${S("2. Key Terms")}<p>${fill(v.keyTerms, "To be negotiated in a definitive agreement.")}</p>
    ${S("3. Non-Binding")}<div class="tpl-highlight">Except for the sections on Exclusivity, Confidentiality, and Governing Law, this LOI is <strong>non-binding</strong> and creates no obligation to complete the transaction. A binding obligation arises only upon a definitive written agreement signed by both parties.</div>
    ${S("4. Exclusivity & Expiration")}<p>${v.exclusivityDays ? `For ${esc(v.exclusivityDays)} days, the parties will negotiate exclusively with each other.` : "The parties intend to negotiate in good faith."} This LOI expires on ${fill(v.expirationDate, "[Expiration Date]")} if a definitive agreement is not reached.</p>
    ${S("5. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Party A", fill(a), "Party B", fill(b))}`;
}
const loi: FormTemplate = {
  id: "loi", kind: "form", name: "Letter of Intent (LOI)", category: "Business", icon: "\u{1F4DD}",
  description: "Outline a proposed deal's terms — mostly non-binding, with exclusivity and confidentiality.",
  fields: loiFields, consentText: NONBINDING_CONSENT, renderBody: loiBody,
};

// ════════════════════════════════════════════════════════════════
// 7. MUTUAL TERMINATION & RELEASE
// ════════════════════════════════════════════════════════════════
const termFields: TemplateFieldDef[] = [
  { key: "partyA", label: "Party A (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "partyB", label: "Party B", input: "text", required: true, half: true, placeholder: "Other party" },
  { key: "originalAgreement", label: "Agreement Being Terminated", input: "text", required: true, placeholder: "e.g. Service Agreement dated …" },
  { key: "terminationDate", label: "Termination Effective Date", input: "date", required: true, half: true },
  { key: "releaseTerms", label: "Settlement / Final Terms", input: "textarea", placeholder: "Any final payments or obligations…" },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function termBody(v: Record<string, string>): string {
  const a = v.partyA || "[Party A]", b = v.partyB || "[Party B]", st = v.governingState || "Texas";
  return `
    <h1>MUTUAL TERMINATION &amp; RELEASE</h1><div class="tpl-divider"></div>
    <p>This Mutual Termination and Release Agreement is made as of ${fill(today())} between ${fill(a)} and ${fill(b)} (together, the <strong>"Parties"</strong>).</p>
    ${S("1. Termination")}<p>The Parties agree that ${fill(v.originalAgreement, "[Agreement]")} (the <strong>"Original Agreement"</strong>) is terminated effective ${fill(v.terminationDate, "[Date]")}.</p>
    ${S("2. Final Terms")}<p>${fill(v.releaseTerms, "Each party has satisfied its obligations; no further payments are due.")}</p>
    ${S("3. Mutual Release")}<div class="tpl-highlight">Each Party releases and forever discharges the other from any and all claims arising out of or relating to the Original Agreement, except obligations expressly surviving termination (such as confidentiality and accrued payment obligations).</div>
    ${S("4. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Party A", fill(a), "Party B", fill(b))}`;
}
const termination: FormTemplate = {
  id: "mutual-termination", kind: "form", name: "Mutual Termination & Release", category: "Business", icon: "\u{1F91D}",
  description: "Cleanly end an existing agreement with a mutual release of claims.",
  fields: termFields, consentText: SIGN_CONSENT, renderBody: termBody,
};

// ════════════════════════════════════════════════════════════════
// 8. REFERRAL / FINDER'S FEE
// ════════════════════════════════════════════════════════════════
const referralFields: TemplateFieldDef[] = [
  { key: "company", label: "Company (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "referrer", label: "Referrer", input: "text", required: true, half: true, placeholder: "Referrer name" },
  { key: "fee", label: "Referral Fee", input: "text", required: true, placeholder: "e.g. 10% of first-year revenue" },
  { key: "scope", label: "Referral Scope", input: "textarea", placeholder: "What kind of referrals qualify…" },
  { key: "termMonths", label: "Term (months)", input: "text", half: true, placeholder: "e.g. 12" },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function referralBody(v: Record<string, string>): string {
  const co = v.company || "[Company]", r = v.referrer || "[Referrer]", st = v.governingState || "Texas";
  return `
    <h1>REFERRAL / FINDER'S FEE AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Agreement is made as of ${fill(today())} between ${fill(co)} (<strong>"Company"</strong>) and ${fill(r)} (<strong>"Referrer"</strong>).</p>
    ${S("1. Referrals")}<p>Referrer may introduce prospective customers to Company. ${fill(v.scope, "Qualifying referrals are new customers not already known to Company.")}</p>
    ${S("2. Referral Fee")}<p>For each qualifying referral that becomes a paying customer, Company shall pay Referrer <strong>${fill(v.fee, "[Referral Fee]")}</strong>, paid within 30 days after Company receives the corresponding payment.</p>
    ${S("3. Relationship")}<div class="tpl-highlight">Referrer is an independent contractor, is non-exclusive, and has no authority to bind Company or negotiate terms. Referrer shall not make representations on Company's behalf.</div>
    ${S("4. Term")}<p>This Agreement continues for ${fill(v.termMonths, "twelve (12)")} months and may be terminated on 30 days' notice; fees accrued before termination remain payable.</p>
    ${S("5. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Company", fill(co), "Referrer", fill(r))}`;
}
const referral: FormTemplate = {
  id: "referral", kind: "form", name: "Referral / Finder's Fee Agreement", category: "Business", icon: "\u{1F517}",
  description: "Pay a fee for qualified referrals — fee structure, scope, and term.",
  fields: referralFields, consentText: SIGN_CONSENT, renderBody: referralBody,
};

// ════════════════════════════════════════════════════════════════
// 9. COMMISSION / SALES REP
// ════════════════════════════════════════════════════════════════
const commissionFields: TemplateFieldDef[] = [
  { key: "company", label: "Company (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "rep", label: "Sales Representative", input: "text", required: true, half: true, placeholder: "Rep name" },
  { key: "territory", label: "Territory", input: "text", half: true, placeholder: "e.g. Western US" },
  { key: "products", label: "Products / Services", input: "textarea", placeholder: "What the rep will sell…" },
  { key: "rate", label: "Commission Rate", input: "text", required: true, half: true, placeholder: "e.g. 8% of net sales" },
  { key: "schedule", label: "Payment Schedule", input: "select", half: true, defaultValue: "Monthly", options: PAYMENT_TERMS },
  paymentOther("schedule"),
  { key: "termMonths", label: "Term (months)", input: "text", half: true, placeholder: "e.g. 12" },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function commissionBody(v: Record<string, string>): string {
  const co = v.company || "[Company]", r = v.rep || "[Representative]", st = v.governingState || "Texas";
  return `
    <h1>SALES COMMISSION AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Agreement is made as of ${fill(today())} between ${fill(co)} (<strong>"Company"</strong>) and ${fill(r)} (<strong>"Representative"</strong>).</p>
    ${S("1. Appointment")}<p>Company appoints Representative to solicit sales of ${fill(v.products, "Company's products and services")}${v.territory ? ` in ${esc(v.territory)}` : ""} on a non-exclusive basis.</p>
    ${S("2. Commission")}<p>Representative earns <strong>${fill(v.rate, "[Commission Rate]")}</strong> on collected sales, paid <strong>${fill(pick(v, "schedule"), "monthly")}</strong>. Commissions are earned when Company receives payment from the customer.</p>
    ${S("3. Duties")}<div class="tpl-highlight">Representative is an independent contractor, bears its own expenses, and has no authority to bind Company. Company sets all prices and may accept or reject any order.</div>
    ${S("4. Term")}<p>This Agreement continues for ${fill(v.termMonths, "twelve (12)")} months and may be terminated on 30 days' notice. Commissions on sales closed before termination remain payable.</p>
    ${S("5. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Company", fill(co), "Representative", fill(r))}`;
}
const commission: FormTemplate = {
  id: "commission", kind: "form", name: "Sales Commission Agreement", category: "Business", icon: "\u{1F4B0}",
  description: "Engage a sales rep — territory, products, commission rate, and payout.",
  fields: commissionFields, consentText: SIGN_CONSENT, renderBody: commissionBody,
};

// ════════════════════════════════════════════════════════════════
// 10. SUBCONTRACTOR AGREEMENT
// ════════════════════════════════════════════════════════════════
const subFields: TemplateFieldDef[] = [
  { key: "prime", label: "Prime Contractor (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "sub", label: "Subcontractor", input: "text", required: true, half: true, placeholder: "Subcontractor name" },
  { key: "scope", label: "Scope of Subcontracted Work", input: "textarea", required: true, placeholder: "The portion of work being subcontracted…" },
  { key: "compensation", label: "Compensation", input: "text", required: true, half: true, placeholder: "e.g. $15,000" },
  { key: "startDate", label: "Start Date", input: "date", half: true },
  { key: "paymentTerms", label: "Payment Terms", input: "select", half: true, defaultValue: "Net 30", options: PAYMENT_TERMS },
  paymentOther("paymentTerms"),
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function subBody(v: Record<string, string>): string {
  const pr = v.prime || "[Prime]", su = v.sub || "[Subcontractor]", st = v.governingState || "Texas";
  return `
    <h1>SUBCONTRACTOR AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Agreement is made as of ${fill(today())} between ${fill(pr)} (<strong>"Contractor"</strong>) and ${fill(su)} (<strong>"Subcontractor"</strong>).</p>
    ${S("1. Scope")}<p>Subcontractor shall perform: ${fill(v.scope, "[Scope]")}, beginning ${fill(v.startDate, "[Start Date]")}.</p>
    ${S("2. Compensation")}<p>Contractor shall pay <strong>${fill(v.compensation, "[Compensation]")}</strong>, due <strong>${fill(pick(v, "paymentTerms"), "Net 30")}</strong> after acceptance of the work.</p>
    ${S("3. Independent Contractor & Indemnity")}<div class="tpl-highlight">Subcontractor is an independent contractor, responsible for its own taxes, tools, and insurance, and shall indemnify Contractor against claims arising from Subcontractor's work or negligence.</div>
    ${S("4. Confidentiality")}<p>Subcontractor shall keep confidential all non-public information of Contractor and its clients.</p>
    ${S("5. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Contractor", fill(pr), "Subcontractor", fill(su))}`;
}
const subcontractor: FormTemplate = {
  id: "subcontractor", kind: "form", name: "Subcontractor Agreement", category: "Business", icon: "\u{1F477}",
  description: "Subcontract part of your work — scope, pay, indemnity, and confidentiality.",
  fields: subFields, consentText: SIGN_CONSENT, renderBody: subBody,
};

// ════════════════════════════════════════════════════════════════
// 11. PROMISSORY NOTE
// ════════════════════════════════════════════════════════════════
const noteFields: TemplateFieldDef[] = [
  { key: "lender", label: "Lender", input: "text", required: true, half: true, placeholder: "Lender name" },
  { key: "borrower", label: "Borrower", input: "text", required: true, half: true, placeholder: "Borrower name" },
  { key: "principal", label: "Principal Amount", input: "text", required: true, half: true, placeholder: "e.g. $10,000" },
  { key: "interest", label: "Interest Rate", input: "text", half: true, placeholder: "e.g. 5% per annum", defaultValue: "5% per annum" },
  { key: "repayment", label: "Repayment Terms", input: "textarea", required: true, placeholder: "e.g. 12 equal monthly payments beginning …" },
  { key: "maturityDate", label: "Maturity Date", input: "date", half: true },
  { key: "lateFee", label: "Late Fee", input: "text", half: true, placeholder: "e.g. $25 after 10 days" },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function noteBody(v: Record<string, string>): string {
  const l = v.lender || "[Lender]", bo = v.borrower || "[Borrower]", st = v.governingState || "Texas";
  return `
    <h1>PROMISSORY NOTE</h1><div class="tpl-divider"></div>
    <p>For value received, ${fill(bo)} (<strong>"Borrower"</strong>) promises to pay ${fill(l)} (<strong>"Lender"</strong>) the principal sum of <strong>${fill(v.principal, "[Principal]")}</strong>, with interest at ${fill(v.interest, "5% per annum")}, as of ${fill(today())}.</p>
    ${S("1. Repayment")}<p>${fill(v.repayment, "[Repayment Terms]")} All unpaid principal and accrued interest are due no later than ${fill(v.maturityDate, "[Maturity Date]")}.</p>
    ${S("2. Prepayment")}<p>Borrower may prepay all or part of the principal at any time without penalty.</p>
    ${S("3. Default")}<div class="tpl-highlight">If any payment is more than 10 days late${v.lateFee ? ` (late fee: ${esc(v.lateFee)})` : ""}, or upon Borrower's insolvency, Lender may declare the entire unpaid balance immediately due. Borrower shall pay reasonable collection costs, including attorneys' fees.</div>
    ${S("4. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Lender", fill(l), "Borrower", fill(bo))}`;
}
const promissory: FormTemplate = {
  id: "promissory-note", kind: "form", name: "Promissory Note", category: "Finance", icon: "\u{1F4B5}",
  description: "A written promise to repay a loan — principal, interest, schedule, and default.",
  fields: noteFields, consentText: SIGN_CONSENT, renderBody: noteBody,
};

// ════════════════════════════════════════════════════════════════
// 12. MEMORANDUM OF UNDERSTANDING
// ════════════════════════════════════════════════════════════════
const mouFields: TemplateFieldDef[] = [
  { key: "partyA", label: "Party A (you)", input: "text", required: true, half: true, placeholder: "Your organization" },
  { key: "partyB", label: "Party B", input: "text", required: true, half: true, placeholder: "Other organization" },
  { key: "purpose", label: "Purpose", input: "textarea", required: true, placeholder: "The shared goal or collaboration…" },
  { key: "responsibilities", label: "Roles & Responsibilities", input: "textarea", placeholder: "What each party will do…" },
  { key: "termMonths", label: "Term (months)", input: "text", half: true, placeholder: "e.g. 12" },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function mouBody(v: Record<string, string>): string {
  const a = v.partyA || "[Party A]", b = v.partyB || "[Party B]", st = v.governingState || "Texas";
  return `
    <h1>MEMORANDUM OF UNDERSTANDING</h1><h2>Non-Binding</h2><div class="tpl-divider"></div>
    <p>This Memorandum of Understanding (<strong>"MOU"</strong>), dated ${fill(today())}, records the understanding between ${fill(a)} and ${fill(b)} (the <strong>"Parties"</strong>).</p>
    ${S("1. Purpose")}<p>${fill(v.purpose, "[Purpose]")}</p>
    ${S("2. Roles & Responsibilities")}<p>${fill(v.responsibilities, "Each party will contribute resources as mutually agreed.")}</p>
    ${S("3. Non-Binding")}<div class="tpl-highlight">This MOU expresses the Parties' intentions and is <strong>not legally binding</strong>, except for any confidentiality obligations. It does not create enforceable financial or legal commitments.</div>
    ${S("4. Term")}<p>This MOU remains in effect for ${fill(v.termMonths, "twelve (12)")} months unless extended or terminated by either party.</p>
    ${S("5. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Party A", fill(a), "Party B", fill(b))}`;
}
const mou: FormTemplate = {
  id: "mou", kind: "form", name: "Memorandum of Understanding (MOU)", category: "Business", icon: "\u{1F91D}",
  description: "Record a shared understanding or collaboration — non-binding.",
  fields: mouFields, consentText: NONBINDING_CONSENT, renderBody: mouBody,
};

// ════════════════════════════════════════════════════════════════
// 13. AMENDMENT TO AGREEMENT
// ════════════════════════════════════════════════════════════════
const amendFields: TemplateFieldDef[] = [
  { key: "partyA", label: "Party A (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "partyB", label: "Party B", input: "text", required: true, half: true, placeholder: "Other party" },
  { key: "originalAgreement", label: "Agreement Being Amended", input: "text", required: true, placeholder: "e.g. Service Agreement dated …" },
  { key: "changes", label: "Amendments", input: "textarea", required: true, placeholder: "Describe exactly what changes…" },
  { key: "effectiveDate", label: "Amendment Effective Date", input: "date", half: true },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function amendBody(v: Record<string, string>): string {
  const a = v.partyA || "[Party A]", b = v.partyB || "[Party B]", st = v.governingState || "Texas";
  return `
    <h1>AMENDMENT TO AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Amendment, effective ${fill(v.effectiveDate, today())}, is between ${fill(a)} and ${fill(b)} and amends ${fill(v.originalAgreement, "[Original Agreement]")} (the <strong>"Original Agreement"</strong>).</p>
    ${S("1. Amendments")}<p>The Original Agreement is amended as follows: ${fill(v.changes, "[Amendments]")}</p>
    ${S("2. No Other Changes")}<div class="tpl-highlight">Except as expressly amended above, all terms of the Original Agreement remain in full force and effect. In the event of a conflict, this Amendment controls.</div>
    ${S("3. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Party A", fill(a), "Party B", fill(b))}`;
}
const amendment: FormTemplate = {
  id: "amendment", kind: "form", name: "Amendment to Agreement", category: "Business", icon: "\u{270F}\u{FE0F}",
  description: "Modify an existing signed contract while leaving the rest intact.",
  fields: amendFields, consentText: SIGN_CONSENT, renderBody: amendBody,
};

// ════════════════════════════════════════════════════════════════
// 14. NON-SOLICITATION
// ════════════════════════════════════════════════════════════════
const nonsolFields: TemplateFieldDef[] = [
  { key: "company", label: "Company (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "party", label: "Restricted Party", input: "text", required: true, half: true, placeholder: "Person/company restricted" },
  { key: "durationMonths", label: "Duration (months)", input: "text", required: true, half: true, defaultValue: "12", placeholder: "e.g. 12" },
  { key: "scope", label: "What's Restricted", input: "select", half: true, defaultValue: "Employees and customers", options: ["Employees", "Customers", "Employees and customers"] },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function nonsolBody(v: Record<string, string>): string {
  const co = v.company || "[Company]", p = v.party || "[Restricted Party]", st = v.governingState || "Texas";
  return `
    <h1>NON-SOLICITATION AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Agreement is made as of ${fill(today())} between ${fill(co)} (<strong>"Company"</strong>) and ${fill(p)} (<strong>"Restricted Party"</strong>).</p>
    ${S("1. Non-Solicitation")}<p>For ${fill(v.durationMonths, "12")} months following the date of this Agreement, the Restricted Party shall not, directly or indirectly, solicit ${fill(v.scope, "Company's employees and customers")} for a competing purpose.</p>
    ${S("2. Consideration")}<p>This restriction is given in exchange for the Restricted Party's access to Company's confidential information and relationships, the sufficiency of which is acknowledged.</p>
    ${S("3. Remedies")}<div class="tpl-highlight">The Restricted Party agrees that a breach would cause irreparable harm, entitling Company to injunctive relief in addition to other remedies. If any restriction is found overbroad, it shall be enforced to the maximum extent permitted by law.</div>
    ${S("4. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Company", fill(co), "Restricted Party", fill(p))}`;
}
const nonsolicit: FormTemplate = {
  id: "non-solicitation", kind: "form", name: "Non-Solicitation Agreement", category: "Business", icon: "\u{1F6AB}",
  description: "Restrict soliciting your employees or customers for a set period.",
  fields: nonsolFields, consentText: SIGN_CONSENT, renderBody: nonsolBody,
};

// ════════════════════════════════════════════════════════════════
// 15. NON-COMPETE (enforceability varies — strong caution)
// ════════════════════════════════════════════════════════════════
const noncompFields: TemplateFieldDef[] = [
  { key: "company", label: "Company (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "party", label: "Restricted Party", input: "text", required: true, half: true, placeholder: "Person/company restricted" },
  { key: "durationMonths", label: "Duration (months)", input: "text", required: true, half: true, defaultValue: "12", placeholder: "e.g. 12" },
  { key: "geography", label: "Geographic Scope", input: "text", required: true, half: true, placeholder: "e.g. State of Texas" },
  { key: "activities", label: "Restricted Activities", input: "textarea", required: true, placeholder: "The specific competing activities restricted…" },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function noncompBody(v: Record<string, string>): string {
  const co = v.company || "[Company]", p = v.party || "[Restricted Party]", st = v.governingState || "Texas";
  return `
    <h1>NON-COMPETE AGREEMENT</h1><div class="tpl-divider"></div>
    <p style="font-size:11px;color:#8b1a1a;"><strong>Caution:</strong> Non-compete enforceability varies significantly by state and some jurisdictions limit or prohibit them. Attorney review is strongly recommended before use.</p>
    <p>This Agreement is made as of ${fill(today())} between ${fill(co)} (<strong>"Company"</strong>) and ${fill(p)} (<strong>"Restricted Party"</strong>).</p>
    ${S("1. Covenant Not to Compete")}<p>For ${fill(v.durationMonths, "12")} months, within ${fill(v.geography, "[Geographic Scope]")}, the Restricted Party shall not engage in: ${fill(v.activities, "[Restricted Activities]")}.</p>
    ${S("2. Consideration")}<p>This covenant is supported by the Restricted Party's access to Company's confidential information, goodwill, and specialized training.</p>
    ${S("3. Reasonableness & Severability")}<div class="tpl-highlight">The parties intend these restrictions to be reasonable in scope, duration, and geography. If a court finds any part unenforceable, it shall be modified ("blue-penciled") to the maximum extent permitted by applicable law rather than voided entirely.</div>
    ${S("4. Remedies & Governing Law")}<p>Breach entitles Company to injunctive relief. Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Company", fill(co), "Restricted Party", fill(p))}`;
}
const noncompete: FormTemplate = {
  id: "non-compete", kind: "form", name: "Non-Compete Agreement", category: "Business", icon: "\u{26D4}",
  description: "Restrict competing activity for a period and area. Enforceability varies by state — review carefully.",
  fields: noncompFields,
  consentText: SIGN_CONSENT + " I understand non-compete enforceability varies by jurisdiction and that legal review is recommended.",
  renderBody: noncompBody,
};

// ════════════════════════════════════════════════════════════════
// 16. RESELLER / CHANNEL PARTNER
// ════════════════════════════════════════════════════════════════
const resellerFields: TemplateFieldDef[] = [
  { key: "vendor", label: "Vendor (you)", input: "text", required: true, half: true, placeholder: "Your company" },
  { key: "reseller", label: "Reseller", input: "text", required: true, half: true, placeholder: "Reseller name" },
  { key: "products", label: "Products / Services", input: "textarea", required: true, placeholder: "What the reseller may sell…" },
  { key: "territory", label: "Territory", input: "text", half: true, placeholder: "e.g. North America" },
  { key: "margin", label: "Reseller Discount / Margin", input: "text", required: true, half: true, placeholder: "e.g. 25% off list" },
  { key: "exclusivity", label: "Exclusivity", input: "select", half: true, defaultValue: "Non-exclusive", options: ["Non-exclusive", "Exclusive"] },
  { key: "termMonths", label: "Term (months)", input: "text", half: true, placeholder: "e.g. 12" },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" },
];
function resellerBody(v: Record<string, string>): string {
  const ve = v.vendor || "[Vendor]", re = v.reseller || "[Reseller]", st = v.governingState || "Texas";
  return `
    <h1>RESELLER / CHANNEL PARTNER AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Agreement is made as of ${fill(today())} between ${fill(ve)} (<strong>"Vendor"</strong>) and ${fill(re)} (<strong>"Reseller"</strong>).</p>
    ${S("1. Appointment")}<p>Vendor appoints Reseller as a <strong>${fill(v.exclusivity, "non-exclusive")}</strong> reseller of ${fill(v.products, "Vendor's products and services")}${v.territory ? ` in ${esc(v.territory)}` : ""}.</p>
    ${S("2. Pricing")}<p>Reseller may purchase at <strong>${fill(v.margin, "[Discount / Margin]")}</strong> and resell to end customers. Vendor may update list prices on reasonable notice.</p>
    ${S("3. Obligations & Trademarks")}<div class="tpl-highlight">Reseller shall market the products in good faith, comply with Vendor's policies, and use Vendor's trademarks only as authorized. Reseller is an independent contractor and may not bind Vendor.</div>
    ${S("4. Term")}<p>This Agreement continues for ${fill(v.termMonths, "twelve (12)")} months and may be terminated on 30 days' notice.</p>
    ${S("5. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    ${sig("Vendor", fill(ve), "Reseller", fill(re))}`;
}
const reseller: FormTemplate = {
  id: "reseller", kind: "form", name: "Reseller / Channel Partner Agreement", category: "Business", icon: "\u{1F501}",
  description: "Authorize a partner to resell your products — pricing, territory, and trademarks.",
  fields: resellerFields, consentText: SIGN_CONSENT, renderBody: resellerBody,
};

// ════════════════════════════════════════════════════════════════
// 17. LLC OPERATING AGREEMENT
// ════════════════════════════════════════════════════════════════
const operatingFields: TemplateFieldDef[] = [
  { key: "company", label: "LLC Name", input: "text", required: true, half: true, placeholder: "Company, LLC" },
  { key: "state", label: "State of Formation", input: "text", required: true, half: true, defaultValue: "Texas" },
  { key: "members", label: "Members", input: "textarea", required: true, placeholder: "List all members, one per line" },
  { key: "ownership", label: "Ownership Split", input: "textarea", placeholder: "e.g. Alice 50%, Bob 50%" },
  { key: "contributions", label: "Capital Contributions", input: "textarea", placeholder: "What each member contributes…" },
  { key: "management", label: "Management", input: "select", half: true, defaultValue: "Member-managed", options: ["Member-managed", "Manager-managed"] },
  { key: "effectiveDate", label: "Effective Date", input: "date", half: true },
];
function operatingBody(v: Record<string, string>): string {
  const co = v.company || "[Company]", st = v.state || "Texas";
  return `
    <h1>LLC OPERATING AGREEMENT</h1><h2>${fill(co)}</h2><div class="tpl-divider"></div>
    <p>This Operating Agreement of ${fill(co)}, a ${esc(st)} limited liability company (the <strong>"Company"</strong>), is effective ${fill(v.effectiveDate, today())} among its members (the <strong>"Members"</strong>).</p>
    ${S("1. Formation")}<p>The Company is formed under the laws of the State of ${esc(st)}. Its existence is perpetual unless dissolved as provided herein.</p>
    ${S("2. Members & Ownership")}<p>Members: ${fill(v.members, "[Members]")}.<br>Ownership: ${fill(v.ownership, "as set out in the Company records")}.</p>
    ${S("3. Capital Contributions")}<p>${fill(v.contributions, "Each Member's initial contribution is recorded in the Company's books.")}</p>
    ${S("4. Management")}<p>The Company is <strong>${fill(v.management, "member-managed")}</strong>. Major decisions require approval of Members holding a majority of ownership interests, except where unanimous consent is required by law.</p>
    ${S("5. Profits, Transfers & Dissolution")}<div class="tpl-highlight">Profits and losses are allocated in proportion to ownership. A Member may not transfer its interest without the consent of the other Members. Upon dissolution, assets are distributed first to creditors, then to Members per their interests.</div>
    ${S("6. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    <div class="tpl-section">Signatures</div>
    <p style="font-size:12px;color:#666;">Executed by the Members as of ${esc(today())}. Each Member's electronic signature is captured below.</p>
    <div class="tpl-parties"><div><div class="tpl-plabel">Member</div><div class="tpl-pval" style="margin-top:6px">${fill(v.members ? v.members.split(/\n|,/)[0].trim() : "", "[Member]")}</div><div class="tpl-psub">Date: ${esc(today())}</div></div></div>`;
}
const operating: FormTemplate = {
  id: "operating-agreement", kind: "form", name: "LLC Operating Agreement", category: "Business", icon: "\u{1F3DB}\u{FE0F}",
  description: "Govern an LLC — members, ownership, capital, management, and dissolution.",
  fields: operatingFields, consentText: SIGN_CONSENT, renderBody: operatingBody,
};

// ════════════════════════════════════════════════════════════════
// 18. PARTNERSHIP AGREEMENT
// ════════════════════════════════════════════════════════════════
const partnershipFields: TemplateFieldDef[] = [
  { key: "name", label: "Partnership Name", input: "text", required: true, half: true, placeholder: "Partnership name" },
  { key: "state", label: "State", input: "text", half: true, defaultValue: "Texas" },
  { key: "partners", label: "Partners", input: "textarea", required: true, placeholder: "List all partners, one per line" },
  { key: "purpose", label: "Business Purpose", input: "textarea", required: true, placeholder: "What the partnership does…" },
  { key: "contributions", label: "Capital Contributions", input: "textarea", placeholder: "What each partner contributes…" },
  { key: "profitSplit", label: "Profit / Loss Split", input: "text", half: true, defaultValue: "Equally", placeholder: "e.g. equally, or 60/40" },
  { key: "effectiveDate", label: "Effective Date", input: "date", half: true },
];
function partnershipBody(v: Record<string, string>): string {
  const nm = v.name || "[Partnership]", st = v.state || "Texas";
  return `
    <h1>PARTNERSHIP AGREEMENT</h1><h2>${fill(nm)}</h2><div class="tpl-divider"></div>
    <p>This Partnership Agreement is effective ${fill(v.effectiveDate, today())} among the partners listed below (the <strong>"Partners"</strong>), forming the partnership known as ${fill(nm)}.</p>
    ${S("1. Formation & Purpose")}<p>The Partners form a general partnership under the laws of the State of ${esc(st)} for the purpose of: ${fill(v.purpose, "[Business Purpose]")}.</p>
    ${S("2. Partners & Contributions")}<p>Partners: ${fill(v.partners, "[Partners]")}.<br>Capital: ${fill(v.contributions, "as recorded in the partnership books")}.</p>
    ${S("3. Profits & Losses")}<p>Profits and losses are shared <strong>${fill(v.profitSplit, "equally")}</strong> among the Partners.</p>
    ${S("4. Management")}<div class="tpl-highlight">Each Partner has an equal voice in management unless otherwise agreed; ordinary decisions are made by majority, and fundamental decisions (admitting partners, dissolving, incurring major debt) require unanimous consent.</div>
    ${S("5. Withdrawal & Dissolution")}<p>A Partner may withdraw on written notice. Upon dissolution, assets are applied first to liabilities, then to the Partners per their interests.</p>
    ${S("6. Governing Law")}<p>Governed by the laws of the State of ${esc(st)}.</p>
    <div class="tpl-section">Signatures</div>
    <p style="font-size:12px;color:#666;">Executed by the Partners as of ${esc(today())}.</p>
    <div class="tpl-parties"><div><div class="tpl-plabel">Partner</div><div class="tpl-pval" style="margin-top:6px">${fill(v.partners ? v.partners.split(/\n|,/)[0].trim() : "", "[Partner]")}</div><div class="tpl-psub">Date: ${esc(today())}</div></div></div>`;
}
const partnership: FormTemplate = {
  id: "partnership", kind: "form", name: "Partnership Agreement", category: "Business", icon: "\u{1F46F}",
  description: "Form a general partnership — purpose, contributions, profit split, and management.",
  fields: partnershipFields, consentText: SIGN_CONSENT, renderBody: partnershipBody,
};

// ── export ────────────────────────────────────────────────────────
export const EXTRA_TEMPLATES: FormTemplate[] = [
  msa, sow, service, consulting, sales, loi,
  termination, referral, commission, subcontractor, mou, amendment,
  nonsolicit, noncompete, reseller, promissory, operating, partnership,
];
