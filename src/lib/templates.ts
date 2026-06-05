import type { Template, FormTemplate, TemplateCategory, TemplateFieldDef } from "./types";
import { esc, fill, today, pick, DEFAULT_TEMPLATE_VERSION, TEMPLATE_LAST_REVIEWED, templateFooter, applySignature, sigAnchor } from "./template-utils";
import { EXTRA_TEMPLATES } from "./templates-extra";
import { MORE_TEMPLATES } from "./templates-more";

/**
 * Stock template catalog (static / code-defined for v1).
 * Every template is a starting point, NOT legal advice — see LEGAL_DISCLAIMER.
 */

export const LEGAL_DISCLAIMER =
  "This is a stock template provided for convenience and general informational " +
  "purposes only. It is not legal advice and may not fit your situation or " +
  "jurisdiction. Have it reviewed by a licensed attorney before use.";

const COMMON_SIGN_CONSENT =
  "I have read this document, I agree to be legally bound by its terms, I confirm I am authorized to sign, and I intend my electronic signature to have the same legal effect as a handwritten signature under the E-SIGN Act and applicable state UETA.";

const TEMPLATE_META: Record<string, Partial<Template>> = {
  nda: {
    version: "1.1.0", riskLevel: "medium", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Confirm whether you need mutual or one-way confidentiality before sending."],
    tags: ["confidentiality", "business"],
  },
  contractor: {
    version: "1.1.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Worker classification, IP ownership, tax, and benefits rules can vary by jurisdiction."],
    tags: ["contractor", "ip", "services"],
  },
  "offer-letter": {
    version: "1.1.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Employment terms, background checks, pay disclosures, and at-will language can vary by state."],
    tags: ["hr", "employment"],
  },
  w9: {
    version: "1.1.0", riskLevel: "high", officialFormSensitive: true, attorneyReviewRecommended: true,
    sourceUrl: "https://www.irs.gov/forms-pubs/about-form-w-9",
    warnings: ["Use the current official IRS Form W-9 for tax records when required."],
    tags: ["tax", "irs", "finance"],
  },
  "liability-waiver": {
    version: "1.1.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Waiver enforceability, minor releases, gross negligence, and activity-specific rules vary by jurisdiction."],
    tags: ["waiver", "release"],
  },
  "residential-lease": {
    version: "1.1.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Lease disclosures, deposits, fees, eviction rights, and local housing rules vary heavily."],
    tags: ["real-estate", "lease"],
  },
  "non-compete": {
    version: "1.1.0", riskLevel: "restricted", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    sourceUrl: "https://www.ftc.gov/nonmerger/noncompete",
    warnings: [
      "Non-competes are heavily restricted or prohibited in many jurisdictions.",
      "Consider safer alternatives first: NDA, invention assignment, non-solicitation, or customer confidentiality terms.",
    ],
    tags: ["restricted", "employment", "competition"],
  },
  "non-solicitation": {
    version: "1.1.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Non-solicit enforceability varies and may be treated like a non-compete in some jurisdictions."],
    tags: ["restricted-covenant"],
  },
  "promissory-note": {
    version: "1.1.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Interest, usury, default, and collection rules vary by jurisdiction."],
    tags: ["finance", "loan"],
  },
  "operating-agreement": {
    version: "1.1.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Entity governance, tax, transfer, deadlock, and fiduciary duties should be tailored to the company."],
    tags: ["llc", "governance"],
  },
  partnership: {
    version: "1.1.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["General partnerships can create personal liability. Consider entity and tax review."],
    tags: ["partnership", "governance"],
  },
  "one-way-nda": {
    version: "1.0.0", riskLevel: "medium", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Use when only one party discloses confidential information."],
    tags: ["confidentiality"],
  },
  "invention-assignment": {
    version: "1.0.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Employee invention assignment laws vary, and some states protect inventions developed outside company work."],
    tags: ["ip", "work-product"],
  },
  "proprietary-information-inventions": {
    version: "1.0.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Employee/contractor IP and confidentiality terms should match local employment law."],
    tags: ["hr", "ip", "confidentiality"],
  },
  "data-processing-agreement": {
    version: "1.0.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Privacy obligations depend on the data, locations, roles, and applicable laws such as GDPR, CCPA/CPRA, and sector rules."],
    tags: ["privacy", "vendor"],
  },
  "saas-order-form": {
    version: "1.0.0", riskLevel: "medium", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Pair with full SaaS terms, acceptable use terms, privacy terms, and a DPA when personal data is processed."],
    tags: ["saas", "subscription"],
  },
  "media-release": {
    version: "1.0.0", riskLevel: "medium", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Extra care is required for minors, paid endorsements, healthcare contexts, and sensitive uses."],
    tags: ["media", "release"],
  },
  "model-release": {
    version: "1.0.0", riskLevel: "medium", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Commercial likeness rights, minors, and sensitive uses can require tailored language."],
    tags: ["media", "likeness"],
  },
  "employee-handbook-acknowledgment": {
    version: "1.0.0", riskLevel: "medium", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Handbook acknowledgments should not accidentally create an employment contract."],
    tags: ["hr", "policy"],
  },
  "equipment-loan": { version: "1.0.0", riskLevel: "low", tags: ["equipment", "property"] },
  "company-property-return": { version: "1.0.0", riskLevel: "low", tags: ["hr", "offboarding"] },
  "bill-of-sale": {
    version: "1.0.0", riskLevel: "medium", jurisdictionSensitive: true,
    warnings: ["Vehicles, regulated goods, liens, and titled assets may require official forms or notarization."],
    tags: ["sale", "property"],
  },
  "lease-addendum": {
    version: "1.0.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Lease changes may require notices, disclosures, or local addenda."],
    tags: ["real-estate", "lease"],
  },
  "move-in-move-out-checklist": {
    version: "1.0.0", riskLevel: "medium", jurisdictionSensitive: true,
    warnings: ["Security deposit and inspection rules vary by jurisdiction."],
    tags: ["real-estate", "condition"],
  },
  "board-written-consent": {
    version: "1.0.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Confirm corporate law, bylaws, quorum, voting, and whether unanimous consent is required."],
    tags: ["corporate", "governance"],
  },
  "llc-member-written-consent": {
    version: "1.0.0", riskLevel: "high", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    warnings: ["Confirm the operating agreement, required approval thresholds, and state LLC law."],
    tags: ["llc", "governance"],
  },
  "hipaa-business-associate-agreement": {
    version: "1.0.0", riskLevel: "restricted", jurisdictionSensitive: true, attorneyReviewRecommended: true,
    sourceUrl: "https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions/index.html",
    warnings: [
      "HIPAA matters are high-risk and should be reviewed by healthcare privacy counsel.",
      "Confirm the parties' HIPAA roles and any state medical privacy requirements before use.",
    ],
    tags: ["hipaa", "healthcare", "privacy"],
  },
};

function hardenTemplate<T extends Template>(template: T): T {
  const meta = TEMPLATE_META[template.id] ?? {};
  const merged = {
    ...template,
    version: meta.version ?? template.version ?? DEFAULT_TEMPLATE_VERSION,
    riskLevel: meta.riskLevel ?? template.riskLevel ?? "medium",
    jurisdictionSensitive: meta.jurisdictionSensitive ?? template.jurisdictionSensitive ?? false,
    attorneyReviewRecommended: meta.attorneyReviewRecommended ?? template.attorneyReviewRecommended ?? false,
    officialFormSensitive: meta.officialFormSensitive ?? template.officialFormSensitive ?? false,
    sourceUrl: meta.sourceUrl ?? template.sourceUrl,
    lastReviewed: meta.lastReviewed ?? template.lastReviewed ?? TEMPLATE_LAST_REVIEWED,
    warnings: [...(template.warnings ?? []), ...(meta.warnings ?? [])],
    tags: [...(template.tags ?? []), ...(meta.tags ?? [])],
  } as T;
  if (merged.kind === "form") {
    const renderBody = merged.renderBody;
    return {
      ...merged,
      consentText: merged.consentText || COMMON_SIGN_CONSENT,
      renderBody: (values: Record<string, string>) => {
        const html = renderBody(values) + templateFooter(merged);
        if (!values.__sigImg) return html;
        return applySignature(html, {
          img: values.__sigImg,
          name: values.__sigName ?? "",
          date: values.__sigDate || today(),
          role: values.__sigRole === "counterparty" ? "counterparty" : "primary",
        });
      },
    } as T;
  }
  return merged;
}

// ════════════════════════════════════════════════════════════════
// NDA — Mutual / one-way confidentiality agreement
// ════════════════════════════════════════════════════════════════
const ndaFields: TemplateFieldDef[] = [
  { key: "partyA", label: "Party A — Your Company", input: "text", required: true, half: true, placeholder: "e.g. Total Relief LLC", defaultValue: "Total Relief LLC" },
  { key: "partyB", label: "Party B — Other Party", input: "text", required: true, half: true, placeholder: "Other company or individual" },
  { key: "transaction", label: "Purpose of the Transaction", input: "textarea", placeholder: "e.g. evaluating a possible partnership, investment, or service engagement" },
  { key: "termYears", label: "Term (years)", input: "text", half: true, defaultValue: "3", placeholder: "e.g. 3" },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, defaultValue: "Texas", placeholder: "e.g. Texas" },
  { key: "partyASigner", label: "Party A — Signatory Name", input: "text", half: true, placeholder: "Who signs for Party A" },
  { key: "partyATitle", label: "Party A — Signatory Title", input: "text", half: true, placeholder: "e.g. CEO" },
  { key: "partyBSigner", label: "Party B — Signatory Name", input: "text", half: true, placeholder: "Who signs for Party B" },
  { key: "partyBTitle", label: "Party B — Signatory Title", input: "text", half: true, placeholder: "e.g. Director" },
];

function ndaRenderBody(v: Record<string, string>): string {
  const a = (v.partyA || "").trim() || "Total Relief LLC";
  const b = (v.partyB || "").trim();
  const state = (v.governingState || "Texas").trim();
  const term = (v.termYears || "3").trim();
  const txnRaw = (v.transaction || "").trim();
  const transactionHtml = txnRaw ? fill(txnRaw) : "the consideration of a possible business transaction or consultation";
  const aSigner = (v.partyASigner || "").trim();
  const aTitle = (v.partyATitle || "").trim();
  const bSigner = (v.partyBSigner || "").trim();
  const bTitle = (v.partyBTitle || "").trim();
  const dateStr = today();
  const blank = '<span class="tpl-blank"></span>';

  return `
    <h1>NON-DISCLOSURE AGREEMENT</h1>
    <h2>Mutual Confidentiality Agreement</h2>
    <div class="tpl-divider"></div>

    <p>WHEREAS, in connection with ${transactionHtml} (the <strong>"Transaction"</strong>) between ${fill(a)} and ${fill(b, "[Party B]")}, the parties may share certain financial and business information, which both consider proprietary and confidential. As a condition to, and in consideration of furnishing each other such information, each party agrees under this Non-Disclosure Agreement (the <strong>"Agreement"</strong>) as follows:</p>

    <div class="tpl-section">1. Confidentiality of Information</div>
    <p>The parties shall keep confidential and not disclose to any third party "Information," as defined herein, during the term of this Agreement and thereafter. Information shall be used only for the purpose of evaluating the Transaction and for no other purpose. The term <strong>"Information"</strong> shall include all information (regardless of the media or form in which it is presented or contained) provided by any party to any other party in connection with the Transaction and which is designated as confidential and/or reasonably considered by the providing party to be confidential or proprietary, including but not limited to information relating to its business, operations, financial condition, marketing efforts, or its business, financial, operational, or marketing plans. Each party shall limit dissemination of Information only on a "need to know" basis to its selected directors, officers, attorneys, and accountants (its <strong>"Representatives"</strong>), and shall use reasonable efforts to ensure the Information is kept confidential by such Representatives. Any party failing to ensure Information is kept confidential by its Representatives will be liable for the unauthorized disclosure as if such party had disclosed the Information itself.</p>

    <div class="tpl-section">2. Public Statements &amp; Compelled Disclosure</div>
    <p>The parties shall treat all discussions, term sheets, letters of interest, letters of intent, and pro-formas regarding the Transaction as Information and will not disclose the existence or content of such, whether through a press release or otherwise, except to such party's Representatives or as required by law, and then only after consultation with the other party to the extent legally permissible. If a party or its Representatives become legally compelled (by deposition, interrogatories, request for documents, subpoena, civil investigative demand, or similar process) to disclose any Information, the party upon whom the request is made shall, to the extent legally permissible, provide the other party prompt prior written notice so that party may seek a protective order or other remedy and/or waive compliance. If such protective order or remedy is not obtained, the party upon whom the request is made (i) agrees to furnish only that portion of the Information which it has been advised in writing by its legal counsel is legally required, and to exercise reasonable efforts to obtain assurance that confidential treatment will be accorded such Information, and (ii) shall not be liable for such disclosure unless it was caused by or resulted from such party's previous unauthorized disclosure.</p>

    <div class="tpl-section">3. No Obligation Until Definitive Agreement</div>
    <p>Unless and until a definitive transaction agreement has been executed and delivered, no contract or agreement providing for a transaction shall be deemed to exist between the parties, and neither party will be under any legal obligation of any kind with respect to the Transaction by virtue of this Agreement or any written or oral expression thereof, except for the matters specifically agreed to herein. For purposes of this Section, a "definitive transaction agreement" does not include an executed letter of intent or any other preliminary written agreement, nor any written or oral acceptance of an offer, bid, proposal, or expression of interest.</p>

    <div class="tpl-section">4. Survival</div>
    <p>Each party agrees to maintain the confidentiality of the Information regardless of the termination of discussions between the parties with respect to the Transaction.</p>

    <div class="tpl-section">5. Exclusions</div>
    <p>This Agreement shall not apply to Information which (i) is or becomes generally available to the public without violation of any obligation of confidentiality by either party; (ii) becomes available to a party on a non-confidential basis, provided the source is not known by such party to be bound by a confidentiality agreement concerning the Information; or (iii) has been independently acquired or developed by a party without violating its obligations under this Agreement.</p>

    <div class="tpl-section">6. No Waiver</div>
    <p>No failure or delay by either party in exercising any right, power, or privilege hereunder shall operate as a waiver thereof, nor shall any single or partial exercise thereof preclude any other or further exercise of any right, power, or privilege.</p>

    <div class="tpl-section">7. Ownership</div>
    <p>Notwithstanding any disclosures made hereunder or any discussions or communications between the parties, each party shall have and retain sole and exclusive ownership of its Information and other property owned by it at the time of disclosure to the other party.</p>

    <div class="tpl-section">8. Governing Law</div>
    <p>This Agreement shall be governed by the laws of the State of ${fill(state)}, without regard to its conflicts of laws provisions.</p>

    <div class="tpl-section">9. Binding Effect</div>
    <p>This Agreement shall be binding upon and shall inure to the benefit of the parties hereto, their Representatives, successors, and assigns.</p>

    <div class="tpl-section">10. Term &amp; Return of Information</div>
    <p>This Agreement shall remain in effect for ${fill(term)} years. Except as otherwise expressly agreed by the parties in writing, upon termination of this Agreement each party shall (a) immediately cease using the Information of the other party, and (b) promptly return to the other party all Information, including all copies thereof, disclosed hereunder.</p>

    <div class="tpl-section">11. Equitable Relief</div>
    <p>Each party acknowledges that remedies at law for any breach of this Agreement may be inadequate, since such breach may result in irreparable harm, and therefore, upon any such breach or threat of breach, the disclosing party shall be entitled to seek injunctive relief and any other appropriate equitable relief in addition to whatever remedies it might have at law.</p>

    <div class="tpl-section">12. Counterparts &amp; Electronic Signature</div>
    <p>This Agreement may be executed in counterparts, which taken together shall constitute one instrument. Delivery of a copy bearing an original signature by facsimile transmission, by electronic mail in portable document format (".pdf"), or by any other electronic means intended to preserve the document's original graphic and pictorial appearance, will have the same effect as physical delivery of the paper document bearing the original signature.</p>

    <div class="tpl-section">13. No Joint Venture</div>
    <p>This Agreement will not create a joint venture, partnership, or principal-and-agent relationship between the parties. Neither party will have, or represent that it has, the authority to assume or create any obligation, express or implied, on behalf of the other, except as expressly provided in this Agreement.</p>

    <div class="tpl-section">14. Authority</div>
    <p>Each person signing this Agreement represents and warrants to the other party that such signatory has full power and authority to execute and deliver this Agreement.</p>

    <div class="tpl-section">Agreed To By</div>
    <div class="tpl-parties">
      <div>
        <div class="tpl-plabel">Party A</div>
        <div class="tpl-pval" style="margin-top:6px">${fill(a)}</div>
        <div class="tpl-psub">${sigAnchor("primary")}By: ${aSigner ? esc(aSigner) : blank}<br>Title: ${aTitle ? esc(aTitle) : blank}<br>Date: ${esc(dateStr)}</div>
      </div>
      <div>
        <div class="tpl-plabel">Party B</div>
        <div class="tpl-pval" style="margin-top:6px">${fill(b, "[Party B]")}</div>
        <div class="tpl-psub">${sigAnchor("counterparty")}By: ${bSigner ? esc(bSigner) : blank}<br>Title: ${bTitle ? esc(bTitle) : blank}<br>Date: ${esc(dateStr)}</div>
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
    options: ["an individual", "a limited liability company", "a corporation", "a sole proprietorship", "Other"] },
  { key: "contractorEntityOther", label: "Specify Entity", input: "text", half: true, placeholder: "Describe the entity type", showWhen: { key: "contractorEntity", value: "Other" } },
  { key: "contractorEmail", label: "Contractor Email", input: "email", placeholder: "contractor@email.com", half: true },
  { key: "contractorAddress", label: "Contractor Address", input: "text", placeholder: "Street, City, State, ZIP" },
  { key: "services", label: "Description of Services", input: "textarea", required: true, placeholder: "Describe the work to be performed…" },
  { key: "startDate", label: "Start Date", input: "date", half: true },
  { key: "endDate", label: "End Date (or leave blank for ongoing)", input: "date", half: true },
  { key: "compensation", label: "Compensation", input: "text", required: true, placeholder: "e.g. $5,000 flat / $100 per hour", half: true },
  { key: "paymentTerms", label: "Payment Terms", input: "select", half: true, defaultValue: "Net 30",
    options: ["Upon completion", "Net 15", "Net 30", "Monthly", "Per milestone", "Other"] },
  { key: "paymentTermsOther", label: "Specify Payment Terms", input: "text", half: true, placeholder: "e.g. 50% upfront, 50% on delivery", showWhen: { key: "paymentTerms", value: "Other" } },
  { key: "governingState", label: "Governing Law (State)", input: "text", half: true, placeholder: "e.g. Texas", defaultValue: "Texas" },
];

function contractorRenderBody(v: Record<string, string>): string {
  const client = (v.clientName || "").trim() || "[Client]";
  const contractor = (v.contractorName || "").trim() || "[Contractor]";
  const state = (v.governingState || "Texas").trim();
  const entity = fill(pick(v, "contractorEntity"), "an individual");
  const pay = fill(pick(v, "paymentTerms"), "Net 30");
  const addr = (v.contractorAddress || "").trim();
  const email = (v.contractorEmail || "").trim();
  const contractorSub = [addr ? esc(addr) : "", email ? esc(email) : ""].filter(Boolean).join("<br>");

  return `
    <h1>INDEPENDENT CONTRACTOR AGREEMENT</h1>
    <h2>Services Engagement</h2>
    <div class="tpl-divider"></div>
    <p>This Independent Contractor Agreement (this <strong>"Agreement"</strong>) is made as of ${fill(today())} (the <strong>"Effective Date"</strong>) by and between ${fill(client)} (the <strong>"Client"</strong>) and ${fill(contractor)}, ${entity} (the <strong>"Contractor"</strong>).</p>
    <div class="tpl-parties">
      <div><div class="tpl-plabel">Client</div><div class="tpl-pval">${fill(client)}</div></div>
      <div><div class="tpl-plabel">Contractor</div><div class="tpl-pval">${fill(contractor)}</div>
        <div class="tpl-psub">${contractorSub}</div></div>
    </div>

    <div class="tpl-section">1. Services</div>
    <p>Contractor shall perform the following services (the <strong>"Services"</strong>): ${fill(v.services, "[Description of Services]")}. Contractor shall perform the Services in a professional and workmanlike manner, consistent with generally accepted industry standards, and shall determine the method, details, and means of performing the Services.</p>

    <div class="tpl-section">2. Term &amp; Termination</div>
    <p>This Agreement begins on ${fill(v.startDate, "[Start Date]")} and continues ${v.endDate ? `until ${fill(v.endDate)}` : "until the Services are complete"}, unless terminated earlier. Either party may terminate this Agreement (a) for convenience on ten (10) days' prior written notice, or (b) immediately for the other party's material breach that remains uncured for five (5) days after notice. Upon termination, Client shall pay for Services properly performed through the termination date.</p>

    <div class="tpl-section">3. Compensation &amp; Expenses</div>
    <p>Client shall pay Contractor <strong>${fill(v.compensation, "[Compensation]")}</strong>, payable <strong>${pay}</strong> against Contractor's invoices. Unless otherwise agreed in writing, Contractor is responsible for its own expenses. Contractor is solely responsible for all federal, state, and local taxes on amounts received, including self-employment taxes.</p>

    <div class="tpl-section">4. Independent Contractor Status</div>
    <p>Contractor is an independent contractor and not an employee, partner, joint venturer, or agent of Client. Nothing in this Agreement creates an employment relationship. Contractor is not entitled to any employee benefits and has no authority to bind Client or incur obligations on Client's behalf. Client will report payments to Contractor as required (e.g., IRS Form 1099) and will not withhold taxes.</p>

    <div class="tpl-section">5. Work Product &amp; Intellectual Property</div>
    <p>All deliverables, inventions, designs, code, and other work product created by Contractor in connection with the Services (the <strong>"Work Product"</strong>) are "works made for hire" and the sole and exclusive property of Client. To the extent any Work Product does not qualify as a work made for hire, Contractor hereby irrevocably assigns to Client all right, title, and interest in and to the Work Product, including all intellectual property rights. Contractor shall execute any further documents reasonably necessary to perfect Client's ownership. Contractor retains ownership of any pre-existing materials and grants Client a perpetual, royalty-free license to use them solely as incorporated into the Work Product.</p>

    <div class="tpl-section">6. Confidentiality</div>
    <p>Contractor shall hold in strict confidence all non-public information of Client and shall use it only to perform the Services. Contractor shall not disclose such information to any third party without Client's prior written consent. This obligation survives termination of this Agreement.</p>

    <div class="tpl-section">7. Representations &amp; Warranties</div>
    <p>Contractor represents and warrants that: (a) it has full authority to enter into this Agreement; (b) the Services and Work Product will be original and will not infringe any third party's intellectual property or other rights; (c) Contractor's performance does not breach any other agreement; and (d) Contractor will comply with all applicable laws in performing the Services.</p>

    <div class="tpl-section">8. Indemnification</div>
    <p>Contractor shall indemnify, defend, and hold harmless Client from any claims, damages, and reasonable expenses (including attorneys' fees) arising from Contractor's breach of this Agreement, negligence or willful misconduct, or infringement of third-party rights. Each party shall otherwise be responsible for claims arising from its own negligence or breach.</p>

    <div class="tpl-section">9. Limitation of Liability</div>
    <p>EXCEPT FOR BREACHES OF CONFIDENTIALITY, INDEMNIFICATION OBLIGATIONS, OR INFRINGEMENT, NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, AND EACH PARTY'S AGGREGATE LIABILITY SHALL NOT EXCEED THE TOTAL FEES PAID OR PAYABLE UNDER THIS AGREEMENT.</p>

    <div class="tpl-section">10. General</div>
    <div class="tpl-highlight">
      <strong>Governing Law:</strong> This Agreement is governed by the laws of the State of ${fill(state)}, without regard to conflicts of laws principles.<br><br>
      <strong>Assignment:</strong> Contractor may not assign this Agreement without Client's prior written consent.<br><br>
      <strong>Entire Agreement:</strong> This Agreement is the entire agreement between the parties and supersedes all prior understandings; it may be amended only in a writing signed by both parties.<br><br>
      <strong>Counterparts &amp; Electronic Signature:</strong> This Agreement may be executed in counterparts and by electronic signature, each of which has the same effect as an original.
    </div>

    <div class="tpl-section">Signatures</div>
    <div class="tpl-parties">
      <div><div class="tpl-plabel">Client</div><div class="tpl-pval" style="margin-top:6px">${fill(client)}</div><div class="tpl-psub">${sigAnchor("primary")}Date: ${esc(today())}</div></div>
      <div><div class="tpl-plabel">Contractor</div><div class="tpl-pval" style="margin-top:6px">${fill(contractor, "[Contractor]")}</div><div class="tpl-psub">${sigAnchor("counterparty")}Date: ${esc(today())}</div></div>
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
    <div class="tpl-parties">
      <div><div class="tpl-plabel">Signature of U.S. person</div><div class="tpl-psub">${sigAnchor("primary")}Date: ${esc(today())}</div></div>
    </div>
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
    options: ["Full-time", "Part-time", "Contract", "Temporary", "Other"] },
  { key: "employmentTypeOther", label: "Specify Employment Type", input: "text", half: true, placeholder: "Describe the employment type", showWhen: { key: "employmentType", value: "Other" } },
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
    <p>${esc(company)} is pleased to offer you the position of <strong>${fill(v.jobTitle, "[Job Title]")}</strong> (${fill(pick(v, "employmentType"), "Full-time")}). We are excited about the contributions you will make to our team.</p>
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
      <div><div class="tpl-plabel">${esc(company)}</div><div class="tpl-psub">${sigAnchor("primary")}Authorized Representative<br>Date: ${esc(today())}</div></div>
      <div><div class="tpl-plabel">Accepted by</div><div class="tpl-pval" style="margin-top:6px">${fill(candidate, "[Candidate]")}</div><div class="tpl-psub">${sigAnchor("counterparty")}Date: ${esc(today())}</div></div>
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
         <div class="tpl-parties"><div><div class="tpl-plabel">Parent / Guardian</div><div class="tpl-pval" style="margin-top:6px">${fill(v.guardianName, "[Guardian]")}</div><div class="tpl-psub">${sigAnchor("primary")}Date: ${esc(today())}</div></div>
         <div><div class="tpl-plabel">Minor Participant</div><div class="tpl-pval" style="margin-top:6px">${fill(v.minorName)}</div></div></div>`
      : `<div class="tpl-parties"><div><div class="tpl-plabel">Participant</div><div class="tpl-pval" style="margin-top:6px">${fill(participant, "[Participant]")}</div><div class="tpl-psub">${sigAnchor("primary")}Date: ${esc(today())}</div></div></div>`
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
      <div><div class="tpl-plabel">Landlord</div><div class="tpl-pval" style="margin-top:6px">${fill(landlord, "[Landlord]")}</div><div class="tpl-psub">${sigAnchor("primary")}Date: ${esc(today())}</div></div>
      <div><div class="tpl-plabel">Tenant</div><div class="tpl-pval" style="margin-top:6px">${fill(tenant, "[Tenant]")}</div><div class="tpl-psub">${sigAnchor("counterparty")}Date: ${esc(today())}</div></div>
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
  ...EXTRA_TEMPLATES,
  ...MORE_TEMPLATES,
].map(hardenTemplate);

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
