import type { FormTemplate, TemplateFieldDef } from "./types";
import { esc, fill, today, pick, sigAnchor } from "./template-utils";

const SIGN_CONSENT =
  "I have read and agree to be bound by this document, I confirm I am authorized to sign, and I intend my electronic signature to have the same legal effect as a handwritten signature under the E-SIGN Act and applicable state UETA.";

function S(title: string): string {
  return `<div class="tpl-section">${esc(title)}</div>`;
}

function sig(aLabel: string, aName: string, bLabel?: string, bName?: string): string {
  return `
    <div class="tpl-section">Signatures</div>
    <div class="tpl-parties">
      <div><div class="tpl-plabel">${esc(aLabel)}</div><div class="tpl-pval" style="margin-top:6px">${aName}</div><div class="tpl-psub">${sigAnchor("primary")}Date: ${esc(today())}</div></div>
      ${bLabel ? `<div><div class="tpl-plabel">${esc(bLabel)}</div><div class="tpl-pval" style="margin-top:6px">${bName ?? ""}</div><div class="tpl-psub">${sigAnchor("counterparty")}Date: ${esc(today())}</div></div>` : ""}
    </div>`;
}

const stateField: TemplateFieldDef = { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas" };
const paymentTerms = ["Upon receipt", "Net 15", "Net 30", "Monthly", "Per milestone", "Other"];
function paymentOther(key: string): TemplateFieldDef {
  return { key: `${key}Other`, label: "Specify Payment Terms", input: "text", half: true, showWhen: { key, value: "Other" } };
}

const oneWayNdaFields: TemplateFieldDef[] = [
  { key: "discloser", label: "Disclosing Party", input: "text", required: true, half: true },
  { key: "recipient", label: "Receiving Party", input: "text", required: true, half: true },
  { key: "purpose", label: "Purpose", input: "textarea", required: true },
  { key: "termYears", label: "Confidentiality Term (years)", input: "text", half: true, defaultValue: "3" },
  stateField,
];
const oneWayNda: FormTemplate = {
  id: "one-way-nda", kind: "form", name: "One-Way NDA", category: "Business", icon: "\u{1F512}",
  description: "Protect confidential information disclosed by one party to another.",
  fields: oneWayNdaFields, consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>ONE-WAY NON-DISCLOSURE AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Agreement is made as of ${fill(today())} between ${fill(v.discloser, "[Disclosing Party]")} and ${fill(v.recipient, "[Receiving Party]")}.</p>
    ${S("1. Purpose")}<p>Recipient may receive confidential information solely to evaluate or perform: ${fill(v.purpose, "[Purpose]")}.</p>
    ${S("2. Confidential Information")}<p>Confidential Information includes non-public business, financial, technical, customer, product, and operational information disclosed in any form and reasonably understood to be confidential.</p>
    ${S("3. Restrictions")}<p>Recipient shall use Confidential Information only for the Purpose, protect it with reasonable care, and disclose it only to representatives who need to know and are bound by confidentiality obligations.</p>
    ${S("4. Exclusions")}<p>This Agreement does not cover information that is public without breach, already known without restriction, independently developed, or lawfully received from another source.</p>
    ${S("5. Return and Remedies")}<p>Upon request, Recipient shall return or destroy Confidential Information. Unauthorized disclosure may cause irreparable harm, and Discloser may seek injunctive relief.</p>
    ${S("6. Term and Law")}<p>Confidentiality obligations last ${fill(v.termYears, "three (3)")} years, except trade secrets remain protected as long as legally protectable. Governed by ${fill(v.governingState, "Texas")} law.</p>
    ${sig("Disclosing Party", fill(v.discloser, "[Discloser]"), "Receiving Party", fill(v.recipient, "[Recipient]"))}`,
};

const inventionAssignment: FormTemplate = {
  id: "invention-assignment", kind: "form", name: "Invention Assignment Agreement", category: "Business", icon: "\u{1F4A1}",
  description: "Assign inventions and work product created for a company.",
  fields: [
    { key: "company", label: "Company", input: "text", required: true, half: true },
    { key: "creator", label: "Creator / Contractor / Employee", input: "text", required: true, half: true },
    { key: "role", label: "Role or Engagement", input: "text", half: true },
    { key: "excludedIp", label: "Excluded Pre-Existing IP", input: "textarea", placeholder: "List anything not assigned, or write None" },
    stateField,
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>INVENTION ASSIGNMENT AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Agreement is between ${fill(v.company, "[Company]")} and ${fill(v.creator, "[Creator]")}.</p>
    ${S("1. Assignment")}<p>Creator assigns to Company all right, title, and interest in inventions, discoveries, designs, code, documentation, works of authorship, and other work product created for Company or using Company's confidential information or resources.</p>
    ${S("2. Further Assurances")}<p>Creator shall sign documents and provide reasonable assistance needed to confirm, register, or enforce Company's ownership rights.</p>
    ${S("3. Prior Inventions")}<p>Excluded pre-existing IP: ${fill(v.excludedIp, "None listed")}. Creator retains excluded IP but grants Company a perpetual, worldwide, royalty-free license to use it as incorporated into Company work product.</p>
    ${S("4. No Conflicting Obligations")}<p>Creator represents that performance will not violate obligations to any third party.</p>
    ${S("5. Governing Law")}<p>Governed by the laws of ${fill(v.governingState, "Texas")}.</p>
    ${sig("Company", fill(v.company, "[Company]"), "Creator", fill(v.creator, "[Creator]"))}`,
};

const piaa: FormTemplate = {
  id: "proprietary-information-inventions", kind: "form", name: "Proprietary Information & Inventions Agreement", category: "HR", icon: "\u{1F9EC}",
  description: "Employee/contractor confidentiality plus invention assignment.",
  fields: [
    { key: "company", label: "Company", input: "text", required: true, half: true },
    { key: "worker", label: "Employee / Contractor", input: "text", required: true, half: true },
    { key: "startDate", label: "Start Date", input: "date", half: true },
    { key: "excludedIp", label: "Excluded Prior IP", input: "textarea" },
    stateField,
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>PROPRIETARY INFORMATION &amp; INVENTIONS AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This Agreement is made between ${fill(v.company, "[Company]")} and ${fill(v.worker, "[Worker]")} effective ${fill(v.startDate, today())}.</p>
    ${S("1. Confidentiality")}<p>Worker shall protect Company's non-public information and use it only for Company business.</p>
    ${S("2. Inventions and Work Product")}<p>Worker assigns to Company all inventions and work product conceived, developed, or reduced to practice in connection with Company's business or Worker&apos;s services.</p>
    ${S("3. Prior IP")}<p>Excluded prior IP: ${fill(v.excludedIp, "None listed")}.</p>
    ${S("4. Return of Materials")}<p>Upon request or end of engagement, Worker shall return Company property and confidential information.</p>
    ${S("5. Governing Law")}<p>Governed by ${fill(v.governingState, "Texas")} law.</p>
    ${sig("Company", fill(v.company, "[Company]"), "Worker", fill(v.worker, "[Worker]"))}`,
};

const dpa: FormTemplate = {
  id: "data-processing-agreement", kind: "form", name: "Data Processing Agreement (DPA)", category: "Business", icon: "\u{1F5C4}",
  description: "Privacy addendum for vendors that process personal data.",
  fields: [
    { key: "controller", label: "Controller / Customer", input: "text", required: true, half: true },
    { key: "processor", label: "Processor / Vendor", input: "text", required: true, half: true },
    { key: "services", label: "Services", input: "textarea", required: true },
    { key: "dataTypes", label: "Personal Data Categories", input: "textarea", required: true },
    { key: "subprocessors", label: "Approved Subprocessors", input: "textarea" },
    stateField,
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>DATA PROCESSING AGREEMENT</h1><div class="tpl-divider"></div>
    <p>This DPA is between ${fill(v.controller, "[Controller]")} and ${fill(v.processor, "[Processor]")} for ${fill(v.services, "[Services]")}.</p>
    ${S("1. Processing Instructions")}<p>Processor shall process personal data only on documented instructions from Controller and only as necessary to provide the Services.</p>
    ${S("2. Data and Security")}<p>Data categories: ${fill(v.dataTypes, "[Data Categories]")}. Processor shall maintain reasonable administrative, technical, and physical safeguards.</p>
    ${S("3. Subprocessors")}<p>Approved subprocessors: ${fill(v.subprocessors, "None listed")}. Processor remains responsible for subprocessors' compliance.</p>
    ${S("4. Assistance and Incidents")}<p>Processor shall reasonably assist with data subject requests, security inquiries, and legally required incident notifications.</p>
    ${S("5. Return or Deletion")}<p>At termination, Processor shall return or delete personal data unless law requires retention.</p>
    ${S("6. Governing Law")}<p>Governed by ${fill(v.governingState, "Texas")} law.</p>
    ${sig("Controller", fill(v.controller, "[Controller]"), "Processor", fill(v.processor, "[Processor]"))}`,
};

const saasOrder: FormTemplate = {
  id: "saas-order-form", kind: "form", name: "SaaS Order Form / Subscription Agreement", category: "Business", icon: "\u{2601}\u{FE0F}",
  description: "Subscribe a customer to SaaS products with fees, term, and usage terms.",
  fields: [
    { key: "vendor", label: "Vendor", input: "text", required: true, half: true },
    { key: "customer", label: "Customer", input: "text", required: true, half: true },
    { key: "product", label: "Product / Plan", input: "text", required: true, half: true },
    { key: "users", label: "Seats / Usage Limits", input: "text", half: true },
    { key: "fees", label: "Subscription Fees", input: "text", required: true, half: true },
    { key: "paymentTerms", label: "Payment Terms", input: "select", half: true, defaultValue: "Net 30", options: paymentTerms },
    paymentOther("paymentTerms"),
    { key: "term", label: "Initial Term", input: "text", defaultValue: "One (1) year", half: true },
    stateField,
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>SAAS ORDER FORM</h1><div class="tpl-divider"></div>
    <p>${fill(v.customer, "[Customer]")} subscribes to ${fill(v.vendor, "[Vendor]")}'s ${fill(v.product, "[Product]")}.</p>
    ${S("1. Subscription")}<p>Plan: ${fill(v.product, "[Plan]")}. Seats/usage: ${fill(v.users, "As agreed in writing")}.</p>
    ${S("2. Fees")}<p>Fees: ${fill(v.fees, "[Fees]")}, payable ${fill(pick(v, "paymentTerms"), "Net 30")}.</p>
    ${S("3. Term")}<p>Initial term: ${fill(v.term, "one (1) year")}. Renewal requires written agreement unless otherwise stated in Vendor terms.</p>
    ${S("4. Use Restrictions")}<p>Customer shall not reverse engineer, resell, misuse, or use the service unlawfully. Vendor may suspend access for security risk, nonpayment, or material breach.</p>
    ${S("5. Data and Availability")}<p>Vendor will maintain reasonable safeguards and commercially reasonable availability, subject to maintenance and outages outside Vendor's control.</p>
    ${S("6. Governing Law")}<p>Governed by ${fill(v.governingState, "Texas")} law.</p>
    ${sig("Vendor", fill(v.vendor, "[Vendor]"), "Customer", fill(v.customer, "[Customer]"))}`,
};

const mediaRelease: FormTemplate = {
  id: "media-release", kind: "form", name: "Photo / Video / Media Release", category: "Personal", icon: "\u{1F4F8}",
  description: "Permission to use someone's image, voice, or likeness in media.",
  fields: [
    { key: "releasor", label: "Person Giving Permission", input: "text", required: true, half: true },
    { key: "organization", label: "Organization", input: "text", required: true, half: true },
    { key: "project", label: "Project / Use", input: "textarea", required: true },
    { key: "minorName", label: "Minor Name (if applicable)", input: "text", half: true },
    { key: "guardian", label: "Parent / Guardian (if minor)", input: "text", half: true },
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>PHOTO / VIDEO / MEDIA RELEASE</h1><div class="tpl-divider"></div>
    <p>${fill(v.releasor, "[Releasor]")} grants ${fill(v.organization, "[Organization]")} permission to record, photograph, publish, and use their name, image, likeness, voice, and statements for: ${fill(v.project, "[Project]")}.</p>
    ${S("1. Scope")}<p>This permission is worldwide, royalty-free, perpetual, and may be used in print, digital, social, advertising, educational, and promotional media.</p>
    ${S("2. No Further Approval")}<p>Organization may edit and use the materials without further approval, provided the use is not intentionally misleading or unlawful.</p>
    ${v.minorName ? `${S("3. Minor Consent")}<p>${fill(v.guardian, "[Guardian]")} signs as parent or legal guardian for ${fill(v.minorName, "[Minor]")}.</p>` : ""}
    ${sig(v.minorName ? "Parent / Guardian" : "Releasor", fill(v.guardian || v.releasor, "[Signer]"), "Organization", fill(v.organization, "[Organization]"))}`,
};

const modelRelease: FormTemplate = {
  id: "model-release", kind: "form", name: "Model Release", category: "Personal", icon: "\u{1F464}",
  description: "Commercial release for model likeness and content usage.",
  fields: [
    { key: "model", label: "Model", input: "text", required: true, half: true },
    { key: "producer", label: "Photographer / Producer", input: "text", required: true, half: true },
    { key: "shootDate", label: "Shoot Date", input: "date", half: true },
    { key: "compensation", label: "Compensation", input: "text", half: true, defaultValue: "Good and valuable consideration" },
    { key: "usage", label: "Permitted Usage", input: "textarea", required: true },
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>MODEL RELEASE</h1><div class="tpl-divider"></div>
    <p>For ${fill(v.compensation, "good and valuable consideration")}, ${fill(v.model, "[Model]")} grants ${fill(v.producer, "[Producer]")} the right to use images, video, voice, and likeness captured on ${fill(v.shootDate, today())}.</p>
    ${S("1. Usage")}<p>Permitted usage: ${fill(v.usage, "[Usage]")}.</p>
    ${S("2. Release")}<p>Model releases Producer and licensees from claims related to authorized use, including privacy, publicity, and attribution claims, to the fullest extent permitted by law.</p>
    ${sig("Model", fill(v.model, "[Model]"), "Producer", fill(v.producer, "[Producer]"))}`,
};

const handbookAck: FormTemplate = {
  id: "employee-handbook-acknowledgment", kind: "form", name: "Employee Handbook Acknowledgment", category: "HR", icon: "\u{1F4D8}",
  description: "Employee confirms receipt and understanding of handbook policies.",
  fields: [
    { key: "company", label: "Company", input: "text", required: true, half: true },
    { key: "employee", label: "Employee", input: "text", required: true, half: true },
    { key: "handbookVersion", label: "Handbook Version / Date", input: "text", required: true, half: true },
    stateField,
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>EMPLOYEE HANDBOOK ACKNOWLEDGMENT</h1><div class="tpl-divider"></div>
    <p>${fill(v.employee, "[Employee]")} acknowledges receipt of ${fill(v.company, "[Company]")}'s employee handbook version ${fill(v.handbookVersion, "[Version]")}.</p>
    ${S("Acknowledgment")}<p>Employee understands it is their responsibility to read, understand, and comply with the handbook and Company policies as amended from time to time.</p>
    ${S("At-Will Statement")}<p>Unless a signed written employment agreement states otherwise, employment is at-will and may be ended by either Employee or Company at any time, subject to applicable law.</p>
    ${S("Governing Law")}<p>Governed by ${fill(v.governingState, "Texas")} law.</p>
    ${sig("Employee", fill(v.employee, "[Employee]"), "Company", fill(v.company, "[Company]"))}`,
};

const equipmentLoan: FormTemplate = {
  id: "equipment-loan", kind: "form", name: "Equipment Loan Agreement", category: "Business", icon: "\u{1F4BB}",
  description: "Loan company equipment to an employee, contractor, or borrower.",
  fields: [
    { key: "owner", label: "Equipment Owner", input: "text", required: true, half: true },
    { key: "borrower", label: "Borrower", input: "text", required: true, half: true },
    { key: "equipment", label: "Equipment", input: "textarea", required: true },
    { key: "returnDate", label: "Return Date", input: "date", half: true },
    { key: "replacementValue", label: "Replacement Value", input: "text", half: true },
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>EQUIPMENT LOAN AGREEMENT</h1><div class="tpl-divider"></div>
    <p>${fill(v.owner, "[Owner]")} loans the following equipment to ${fill(v.borrower, "[Borrower]")}: ${fill(v.equipment, "[Equipment]")}.</p>
    ${S("Care and Use")}<p>Borrower shall use the equipment only for authorized purposes, keep it in good condition, and not transfer it to others.</p>
    ${S("Return")}<p>Borrower shall return the equipment by ${fill(v.returnDate, "[Return Date]")} or upon request.</p>
    ${S("Loss or Damage")}<p>Borrower is responsible for loss or damage beyond normal wear. Replacement value: ${fill(v.replacementValue, "as reasonably determined by Owner")}.</p>
    ${sig("Owner", fill(v.owner, "[Owner]"), "Borrower", fill(v.borrower, "[Borrower]"))}`,
};

const propertyReturn: FormTemplate = {
  id: "company-property-return", kind: "form", name: "Company Property Return Agreement", category: "HR", icon: "\u{1F4E5}",
  description: "Document the return of laptops, keys, badges, files, and access items.",
  fields: [
    { key: "company", label: "Company", input: "text", required: true, half: true },
    { key: "person", label: "Employee / Contractor", input: "text", required: true, half: true },
    { key: "items", label: "Returned Items", input: "textarea", required: true },
    { key: "missingItems", label: "Missing / Outstanding Items", input: "textarea" },
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>COMPANY PROPERTY RETURN ACKNOWLEDGMENT</h1><div class="tpl-divider"></div>
    <p>${fill(v.person, "[Person]")} confirms return of Company property to ${fill(v.company, "[Company]")}.</p>
    ${S("Returned Items")}<p>${fill(v.items, "[Returned Items]")}</p>
    ${S("Outstanding Items")}<p>${fill(v.missingItems, "None listed")}.</p>
    ${S("Continuing Duties")}<p>Person confirms they have not retained Company confidential information except as authorized and will maintain any continuing confidentiality obligations.</p>
    ${sig("Person", fill(v.person, "[Person]"), "Company", fill(v.company, "[Company]"))}`,
};

const billOfSale: FormTemplate = {
  id: "bill-of-sale", kind: "form", name: "Bill of Sale", category: "Personal", icon: "\u{1F9FE}",
  description: "Transfer ownership of personal property or business assets.",
  fields: [
    { key: "seller", label: "Seller", input: "text", required: true, half: true },
    { key: "buyer", label: "Buyer", input: "text", required: true, half: true },
    { key: "property", label: "Property Sold", input: "textarea", required: true },
    { key: "price", label: "Purchase Price", input: "text", required: true, half: true },
    { key: "saleDate", label: "Sale Date", input: "date", half: true },
    stateField,
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>BILL OF SALE</h1><div class="tpl-divider"></div>
    <p>On ${fill(v.saleDate, today())}, ${fill(v.seller, "[Seller]")} sells to ${fill(v.buyer, "[Buyer]")} the following property: ${fill(v.property, "[Property]")}.</p>
    ${S("Purchase Price")}<p>Buyer shall pay ${fill(v.price, "[Price]")}.</p>
    ${S("Title and Condition")}<p>Seller transfers all right, title, and interest in the property. Unless stated otherwise in writing, the property is sold as-is, where-is.</p>
    ${S("Governing Law")}<p>Governed by ${fill(v.governingState, "Texas")} law.</p>
    ${sig("Seller", fill(v.seller, "[Seller]"), "Buyer", fill(v.buyer, "[Buyer]"))}`,
};

const leaseAddendum: FormTemplate = {
  id: "lease-addendum", kind: "form", name: "Lease Addendum", category: "Real Estate", icon: "\u{1F3E0}",
  description: "Add or modify terms in an existing residential lease.",
  fields: [
    { key: "landlord", label: "Landlord", input: "text", required: true, half: true },
    { key: "tenant", label: "Tenant", input: "text", required: true, half: true },
    { key: "leaseRef", label: "Original Lease", input: "text", required: true },
    { key: "property", label: "Property Address", input: "text", required: true },
    { key: "terms", label: "Addendum Terms", input: "textarea", required: true },
    { key: "effectiveDate", label: "Effective Date", input: "date", half: true },
    stateField,
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>LEASE ADDENDUM</h1><div class="tpl-divider"></div>
    <p>This Addendum modifies ${fill(v.leaseRef, "[Lease]")} for ${fill(v.property, "[Property]")} between ${fill(v.landlord, "[Landlord]")} and ${fill(v.tenant, "[Tenant]")}.</p>
    ${S("Addendum Terms")}<p>${fill(v.terms, "[Terms]")}</p>
    ${S("No Other Changes")}<p>Except as changed by this Addendum, the lease remains in full force and effect. This Addendum is effective ${fill(v.effectiveDate, today())}.</p>
    ${S("Governing Law")}<p>Governed by ${fill(v.governingState, "Texas")} law.</p>
    ${sig("Landlord", fill(v.landlord, "[Landlord]"), "Tenant", fill(v.tenant, "[Tenant]"))}`,
};

const moveChecklist: FormTemplate = {
  id: "move-in-move-out-checklist", kind: "form", name: "Move-In / Move-Out Checklist", category: "Real Estate", icon: "\u{1F50D}",
  description: "Record property condition at move-in or move-out.",
  fields: [
    { key: "landlord", label: "Landlord / Manager", input: "text", required: true, half: true },
    { key: "tenant", label: "Tenant", input: "text", required: true, half: true },
    { key: "property", label: "Property Address", input: "text", required: true },
    { key: "inspectionType", label: "Inspection Type", input: "select", required: true, half: true, options: ["Move-In", "Move-Out"] },
    { key: "conditionNotes", label: "Condition Notes", input: "textarea", required: true },
    { key: "meterKeys", label: "Meters / Keys / Access Notes", input: "textarea" },
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>MOVE-IN / MOVE-OUT CHECKLIST</h1><div class="tpl-divider"></div>
    <p>${fill(v.inspectionType, "[Inspection Type]")} inspection for ${fill(v.property, "[Property]")}.</p>
    ${S("Condition Notes")}<p>${fill(v.conditionNotes, "[Condition Notes]")}</p>
    ${S("Meters / Keys / Access")}<p>${fill(v.meterKeys, "None listed")}.</p>
    ${S("Acknowledgment")}<p>The parties acknowledge this checklist records observed condition as of ${esc(today())} and may be used with the lease and security deposit records.</p>
    ${sig("Landlord / Manager", fill(v.landlord, "[Landlord]"), "Tenant", fill(v.tenant, "[Tenant]"))}`,
};

const boardConsent: FormTemplate = {
  id: "board-written-consent", kind: "form", name: "Board Written Consent", category: "Business", icon: "\u{1F3DB}\u{FE0F}",
  description: "Corporate board approval without a meeting.",
  fields: [
    { key: "company", label: "Company", input: "text", required: true, half: true },
    { key: "state", label: "State of Incorporation", input: "text", required: true, half: true, defaultValue: "Delaware" },
    { key: "directors", label: "Directors", input: "textarea", required: true },
    { key: "resolutions", label: "Resolutions Approved", input: "textarea", required: true },
    { key: "effectiveDate", label: "Effective Date", input: "date", half: true },
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>UNANIMOUS WRITTEN CONSENT OF THE BOARD</h1><h2>${fill(v.company, "[Company]")}</h2><div class="tpl-divider"></div>
    <p>The undersigned directors of ${fill(v.company, "[Company]")}, a ${fill(v.state, "[State]")} corporation, adopt the following resolutions by written consent effective ${fill(v.effectiveDate, today())}.</p>
    ${S("Directors")}<p>${fill(v.directors, "[Directors]")}</p>
    ${S("Resolutions")}<p>${fill(v.resolutions, "[Resolutions]")}</p>
    ${S("Effect")}<p>This written consent has the same force and effect as action taken at a duly called board meeting.</p>
    ${sig("Director", fill(v.directors ? v.directors.split(/\n|,/)[0].trim() : "", "[Director]"))}`,
};

const memberConsent: FormTemplate = {
  id: "llc-member-written-consent", kind: "form", name: "LLC Member Written Consent", category: "Business", icon: "\u{1F4DC}",
  description: "LLC member approval without a meeting.",
  fields: [
    { key: "company", label: "LLC Name", input: "text", required: true, half: true },
    { key: "state", label: "State of Formation", input: "text", required: true, half: true, defaultValue: "Texas" },
    { key: "members", label: "Members Signing", input: "textarea", required: true },
    { key: "actions", label: "Actions Approved", input: "textarea", required: true },
    { key: "effectiveDate", label: "Effective Date", input: "date", half: true },
  ], consentText: SIGN_CONSENT,
  renderBody: (v) => `
    <h1>WRITTEN CONSENT OF LLC MEMBERS</h1><h2>${fill(v.company, "[LLC]")}</h2><div class="tpl-divider"></div>
    <p>The undersigned members of ${fill(v.company, "[LLC]")}, a ${fill(v.state, "[State]")} limited liability company, approve the following actions effective ${fill(v.effectiveDate, today())}.</p>
    ${S("Members")}<p>${fill(v.members, "[Members]")}</p>
    ${S("Approved Actions")}<p>${fill(v.actions, "[Actions]")}</p>
    ${S("Effect")}<p>This consent is intended to satisfy the Company's operating agreement and applicable law.</p>
    ${sig("Member", fill(v.members ? v.members.split(/\n|,/)[0].trim() : "", "[Member]"))}`,
};

const baa: FormTemplate = {
  id: "hipaa-business-associate-agreement", kind: "form", name: "HIPAA Business Associate Agreement", category: "Healthcare", icon: "\u{1F3E5}",
  description: "HIPAA-focused agreement for vendors handling protected health information.",
  fields: [
    { key: "coveredEntity", label: "Covered Entity", input: "text", required: true, half: true },
    { key: "businessAssociate", label: "Business Associate", input: "text", required: true, half: true },
    { key: "services", label: "Services Involving PHI", input: "textarea", required: true },
    { key: "permittedUses", label: "Permitted Uses / Disclosures", input: "textarea", required: true },
    stateField,
  ], consentText: SIGN_CONSENT + " I understand HIPAA compliance is high-risk and attorney/privacy review is recommended.",
  renderBody: (v) => `
    <h1>BUSINESS ASSOCIATE AGREEMENT</h1><h2>HIPAA-Focused Template</h2><div class="tpl-divider"></div>
    <p>This Business Associate Agreement is between ${fill(v.coveredEntity, "[Covered Entity]")} and ${fill(v.businessAssociate, "[Business Associate]")} for services involving protected health information (PHI): ${fill(v.services, "[Services]")}.</p>
    ${S("1. Permitted Uses and Disclosures")}<p>Business Associate may use or disclose PHI only as permitted by this Agreement, the underlying services agreement, and applicable HIPAA requirements. Permitted uses: ${fill(v.permittedUses, "[Permitted Uses]")}.</p>
    ${S("2. Safeguards")}<p>Business Associate shall use appropriate administrative, physical, and technical safeguards to protect PHI and electronic PHI.</p>
    ${S("3. Reporting")}<p>Business Associate shall report unauthorized use, disclosure, security incidents, and breaches as required by law and the parties' agreement.</p>
    ${S("4. Subcontractors")}<p>Business Associate shall ensure subcontractors that create, receive, maintain, or transmit PHI agree to substantially similar restrictions.</p>
    ${S("5. Access, Amendment, Accounting")}<p>Business Associate shall reasonably assist Covered Entity with access, amendment, accounting, and compliance requests.</p>
    ${S("6. Termination")}<p>Upon termination, Business Associate shall return or destroy PHI if feasible, or continue protections if return or destruction is infeasible.</p>
    ${S("7. Governing Law")}<p>Governed by ${fill(v.governingState, "Texas")} law, subject to applicable federal healthcare privacy law.</p>
    ${sig("Covered Entity", fill(v.coveredEntity, "[Covered Entity]"), "Business Associate", fill(v.businessAssociate, "[Business Associate]"))}`,
};

export const MORE_TEMPLATES: FormTemplate[] = [
  oneWayNda,
  inventionAssignment,
  piaa,
  dpa,
  saasOrder,
  mediaRelease,
  modelRelease,
  handbookAck,
  equipmentLoan,
  propertyReturn,
  billOfSale,
  leaseAddendum,
  moveChecklist,
  boardConsent,
  memberConsent,
  baa,
];
