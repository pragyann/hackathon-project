/**
 * Employer archetypes rather than named companies, deliberately: we will not
 * fabricate claims about a real company's interview process. When the student
 * pastes a real job ad, THAT becomes the authoritative source about the role.
 */
export const ARCHETYPES = {
  enterprise: {
    label: "Enterprise graduate program",
    blurb: "A bank, telco or insurer. Structured, behavioural-heavy, fundamentals over frameworks.",
    style:
      "A structured graduate-program interview at a large Australian enterprise (a bank, telco or insurer). Formal but kind. Strict behavioural structure (STAR), fundamentals over frameworks, one question about working in a large regulated organisation.",
  },
  startup: {
    label: "Product startup",
    blurb: "Small Melbourne product team. Direct, practical, digs into what you have actually built.",
    style:
      "An interview at a small Melbourne product startup. Conversational and direct. Cares about what the candidate has actually built, how they learn fast, and whether they can ship with little supervision. Digs into any project mentioned.",
  },
  consultancy: {
    label: "Technology consultancy",
    blurb: "Client-facing work. Clear explanations matter as much as code.",
    style:
      "An interview at a technology consultancy. Client communication matters as much as code: expects clear explanations a non-technical client could follow, and one scenario about handling a difficult stakeholder.",
  },
} as const;

export type ArchetypeId = keyof typeof ARCHETYPES;

export type InterviewTurn = { speaker: "interviewer" | "candidate"; text: string };

export type Debrief = {
  overall: string;
  strengths: string[];
  improvements: { point: string; example: string }[];
  practiseNext: string;
};

/**
 * Real Australian employers a student can simulate. Each carries only
 * short, publicly verifiable facts (sector, products, where they hire).
 * The interviewer may adopt the company's public identity but is barred in
 * the prompt from inventing internal process details — and a pasted job ad
 * always outranks everything here.
 */
export const COMPANIES = {
  atlassian: {
    name: "Atlassian",
    sector: "Collaboration software",
    blurb: "Jira and Confluence. Sydney-founded, global engineering culture, well-known graduate program.",
  },
  canva: {
    name: "Canva",
    sector: "Design platform",
    blurb: "Sydney product company at global scale; hires graduate engineers, data and ML roles.",
  },
  commbank: {
    name: "Commonwealth Bank",
    sector: "Banking",
    blurb: "Australia's largest bank and one of its largest tech employers; big structured grad intake.",
  },
  nab: {
    name: "NAB",
    sector: "Banking",
    blurb: "Melbourne-headquartered big-four bank with large engineering, data and security teams.",
  },
  telstra: {
    name: "Telstra",
    sector: "Telecommunications",
    blurb: "National telco; networks, software and cyber security at infrastructure scale.",
  },
  seek: {
    name: "SEEK",
    sector: "Employment marketplace",
    blurb: "Melbourne-based; search, matching and data science over the job market itself.",
  },
  rea: {
    name: "REA Group",
    sector: "Property marketplace",
    blurb: "Melbourne home of realestate.com.au; strong graduate engineering program.",
  },
  xero: {
    name: "Xero",
    sector: "Accounting software",
    blurb: "Cloud accounting for small business; large Melbourne engineering presence.",
  },
  wisetech: {
    name: "WiseTech Global",
    sector: "Logistics software",
    blurb: "Sydney-listed logistics platform (CargoWise); deep technical interviews, C#-heavy stack.",
  },
  cultureamp: {
    name: "Culture Amp",
    sector: "Employee experience",
    blurb: "Melbourne-founded SaaS; product engineering and data science, values-forward culture.",
  },
  quantium: {
    name: "Quantium",
    sector: "Data science consultancy",
    blurb: "Analytics partner to Woolworths and others; classic first job for data analysts.",
  },
  myob: {
    name: "MYOB",
    sector: "Business software",
    blurb: "Melbourne business-management platform; graduate developer and data pathways.",
  },
} as const;

export type CompanyId = keyof typeof COMPANIES;
