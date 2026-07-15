import type {
  ExtractedEntities,
  Indicator,
  RiskLevel,
  VerificationResult,
} from "./schemas";
import { extractDomain, registrableDomain } from "./typosquat";

type Signal = Indicator & { weight: number };

/**
 * Deterministic, weighted scoring — the explainable backbone of the verdict.
 * The LLM layer can raise the risk level but never lower it below what these
 * rules establish, which keeps the tool resistant to prompt injection hidden
 * in the offer text.
 */
export function scoreOffer(
  entities: ExtractedEntities,
  verification: VerificationResult
): { score: number; level: RiskLevel; indicators: Indicator[] } {
  const signals: Signal[] = [];

  const payments = entities.paymentRequests.filter((p) => p.mentioned);
  if (payments.length > 0) {
    const detail = payments
      .map((p) => [p.amount, p.purpose].filter(Boolean).join(" for "))
      .filter(Boolean)
      .join("; ");
    signals.push({
      id: "payment-request",
      title: `Asks for money before you start${detail ? ` (${detail})` : ""}`,
      whyItMatters:
        "Legitimate internships never charge a fee, deposit or 'security amount' to release an offer letter. This is the single strongest scam indicator.",
      severity: "high",
      source: "rule",
      weight: 35,
    });
  }

  if (verification.domainMatch === "typosquat") {
    signals.push({
      id: "typosquat-domain",
      title: `Sender domain imitates the real company domain (${verification.emailDomain} vs ${verification.officialDomain})`,
      whyItMatters:
        "Scammers register lookalike domains — a missing letter or different ending — so the email appears official at a glance.",
      severity: "high",
      source: "verification",
      weight: 30,
    });
  } else if (verification.domainMatch === "mismatch" && !verification.freeEmailProvider) {
    signals.push({
      id: "domain-mismatch",
      title: `Sender domain does not match the company's official website`,
      whyItMatters:
        "An offer claiming to be from a company should come from that company's own email domain.",
      severity: "high",
      source: "verification",
      weight: 25,
    });
  }

  if (verification.freeEmailProvider) {
    signals.push({
      id: "free-email",
      title: `Corporate offer sent from a free personal email (${verification.emailDomain})`,
      whyItMatters:
        "Real HR teams use company email addresses. Gmail/Yahoo/Rediffmail for an official offer is a strong red flag.",
      severity: "medium",
      source: "rule",
      weight: 20,
    });
  }

  if (entities.noInterviewMentioned) {
    signals.push({
      id: "no-interview",
      title: "Selection without any interview or assessment",
      whyItMatters:
        "Companies do not hire interns they have never spoken to. 'Selected without interview' is a hallmark of fee-collection scams.",
      severity: "medium",
      source: "rule",
      weight: 15,
    });
  }

  if (entities.urgencyPhrases.length > 0) {
    signals.push({
      id: "urgency-pressure",
      title: `Pressure to act immediately ("${entities.urgencyPhrases[0]}")`,
      whyItMatters:
        "Artificial deadlines are designed to stop you from verifying the offer with your placement cell or family.",
      severity: "medium",
      source: "rule",
      weight: 12,
    });
  }

  if (entities.salaryTooGoodToBeTrue) {
    signals.push({
      id: "unrealistic-salary",
      title: `Stipend/salary looks unrealistic for the role (${entities.salary ?? "amount stated"})`,
      whyItMatters:
        "Far-above-market pay for entry-level work is bait — the scammer recovers it through 'fees' you pay first.",
      severity: "medium",
      source: "rule",
      weight: 12,
    });
  }

  if (verification.companyExists === "not_found") {
    signals.push({
      id: "company-not-found",
      title: "Company could not be verified to exist",
      whyItMatters:
        "No official website or public footprint was found for this company name — a legitimate employer is findable online.",
      severity: "medium",
      source: "verification",
      weight: 15,
    });
  }

  if (entities.vaguenessSignals.length >= 2) {
    signals.push({
      id: "vague-details",
      title: `Missing basic company details (${entities.vaguenessSignals.slice(0, 3).join(", ")})`,
      whyItMatters:
        "Real offers include an address, official domain and a verifiable role description. Vagueness hides the absence of a real company.",
      severity: "low",
      source: "rule",
      weight: 8,
    });
  }

  if (entities.genericGreeting) {
    signals.push({
      id: "generic-greeting",
      title: 'Mass greeting ("Dear Student/Candidate") instead of your name',
      whyItMatters:
        "Bulk scam messages are sent to thousands of students at once, so they cannot address you personally.",
      severity: "low",
      source: "rule",
      weight: 5,
    });
  }

  const linkDomains = entities.links
    .map((l) => extractDomain(l))
    .filter((d): d is string => !!d)
    .map(registrableDomain);
  const officialish = new Set(
    [verification.officialDomain, verification.emailDomain && registrableDomain(verification.emailDomain)]
      .filter(Boolean) as string[]
  );
  const foreignLinks = linkDomains.filter(
    (d) => officialish.size > 0 && !officialish.has(d) && !["bit.ly", "forms.gle", "docs.google.com"].includes(d)
  );
  const shorteners = linkDomains.filter((d) =>
    ["bit.ly", "tinyurl.com", "t.ly", "rb.gy", "cutt.ly"].includes(d)
  );
  if (shorteners.length > 0) {
    signals.push({
      id: "shortened-links",
      title: "Uses shortened links that hide the real destination",
      whyItMatters:
        "URL shorteners in an offer letter usually conceal a phishing or payment page.",
      severity: "medium",
      source: "rule",
      weight: 10,
    });
  } else if (foreignLinks.length > 0) {
    signals.push({
      id: "off-domain-links",
      title: "Contains links that point away from the company's domain",
      whyItMatters:
        "Links in a genuine offer normally lead to the company's own website or portal.",
      severity: "low",
      source: "rule",
      weight: 8,
    });
  }

  const score = Math.min(
    100,
    signals.reduce((sum, s) => sum + s.weight, 0)
  );
  const level: RiskLevel = score >= 55 ? "high_risk" : score >= 20 ? "suspicious" : "safe";

  return {
    score,
    level,
    indicators: signals.map(({ weight: _weight, ...indicator }) => indicator),
  };
}

export const RISK_RANK: Record<RiskLevel, number> = {
  safe: 0,
  suspicious: 1,
  high_risk: 2,
};
