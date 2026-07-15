import { z } from "zod";

export const RiskLevel = z.enum(["safe", "suspicious", "high_risk"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const PaymentRequestSchema = z.object({
  mentioned: z.boolean(),
  amount: z.string().nullable(),
  purpose: z.string().nullable(),
  method: z.string().nullable(),
});

export const ExtractedEntitiesSchema = z.object({
  senderName: z.string().nullable(),
  senderEmail: z.string().nullable(),
  senderPhone: z.string().nullable(),
  companyName: z.string().nullable(),
  claimedWebsite: z.string().nullable(),
  roleTitle: z.string().nullable(),
  roleDescription: z.string().nullable(),
  salary: z.string().nullable(),
  paymentRequests: z.array(PaymentRequestSchema),
  urgencyPhrases: z.array(z.string()),
  deadline: z.string().nullable(),
  links: z.array(z.string()),
  noInterviewMentioned: z.boolean(),
  genericGreeting: z.boolean(),
  vaguenessSignals: z.array(z.string()),
  salaryTooGoodToBeTrue: z.boolean(),
});
export type ExtractedEntities = z.infer<typeof ExtractedEntitiesSchema>;

export const DomainMatch = z.enum(["exact", "typosquat", "mismatch", "unknown"]);
export type DomainMatch = z.infer<typeof DomainMatch>;

export const VerificationResultSchema = z.object({
  emailDomain: z.string().nullable(),
  freeEmailProvider: z.boolean(),
  officialDomain: z.string().nullable(),
  officialSite: z.string().nullable(),
  domainMatch: DomainMatch,
  companyExists: z.enum(["verified", "not_found", "unknown"]),
  evidence: z.array(z.string()),
  notes: z.array(z.string()),
  confidence: z.object({
    domainMatch: z.number(),
    companyExists: z.number(),
  }),
  degraded: z.boolean(),
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export const IndicatorSchema = z.object({
  id: z.string(),
  title: z.string(),
  whyItMatters: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  source: z.enum(["rule", "verification", "ai"]),
});
export type Indicator = z.infer<typeof IndicatorSchema>;

export const LlmAssessmentSchema = z.object({
  riskLevel: RiskLevel,
  summary: z.string(),
  rolePlausibility: z.enum(["plausible", "implausible", "unknown"]),
  indicators: z.array(
    z.object({ title: z.string(), whyItMatters: z.string() })
  ),
  verificationSteps: z.array(z.string()),
});
export type LlmAssessment = z.infer<typeof LlmAssessmentSchema>;

export const AnalyzeRequestSchema = z.object({
  text: z.string().min(40, "Offer text is too short to analyze").max(
    Number(process.env.MAX_TEXT_LENGTH ?? 15000),
    "Offer text exceeds the maximum allowed length"
  ),
  senderEmail: z
    .string()
    .email("Enter a valid sender email address")
    .optional()
    .or(z.literal("")),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const AnalyzeResponseSchema = z.object({
  verdict: RiskLevel,
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  entities: ExtractedEntitiesSchema,
  verification: VerificationResultSchema,
  indicators: z.array(IndicatorSchema),
  verificationSteps: z.array(z.string()),
  redaction: z.record(z.string(), z.number()),
  degraded: z.object({
    extraction: z.boolean(),
    verification: z.boolean(),
    reasoning: z.boolean(),
  }),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
