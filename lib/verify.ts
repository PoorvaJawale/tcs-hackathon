import type { VerificationResult } from "./schemas";
import {
  FREE_EMAIL_PROVIDERS,
  compareDomains,
  extractDomain,
  registrableDomain,
} from "./typosquat";

/** Domains that show up in search results but are never a company's own site */
const AGGREGATOR_DOMAINS = new Set([
  "linkedin.com",
  "wikipedia.org",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "glassdoor.com",
  "glassdoor.co.in",
  "indeed.com",
  "in.indeed.com",
  "naukri.com",
  "internshala.com",
  "ambitionbox.com",
  "justdial.com",
  "crunchbase.com",
  "zaubacorp.com",
  "tofler.in",
  "quora.com",
  "reddit.com",
  "medium.com",
]);

type TavilyResult = { title: string; url: string; content: string };

async function tavilySearch(query: string): Promise<TavilyResult[] | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, max_results: 6, search_depth: "basic" }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: TavilyResult[] };
    return data.results ?? [];
  } catch {
    return null;
  }
}

function unknownResult(notes: string[], degraded: boolean): VerificationResult {
  return {
    emailDomain: null,
    freeEmailProvider: false,
    officialDomain: null,
    officialSite: null,
    domainMatch: "unknown",
    companyExists: "unknown",
    evidence: [],
    notes,
    confidence: { domainMatch: 0, companyExists: 0 },
    degraded,
  };
}

export async function verifyCompany(
  companyName: string | null,
  senderEmail: string | null,
  claimedWebsite: string | null
): Promise<VerificationResult> {
  const emailDomain = senderEmail ? extractDomain(senderEmail) : null;
  const freeEmailProvider = emailDomain
    ? FREE_EMAIL_PROVIDERS.has(registrableDomain(emailDomain))
    : false;

  const base: VerificationResult = {
    ...unknownResult([], false),
    emailDomain,
    freeEmailProvider,
  };

  if (!companyName) {
    base.notes.push(
      "No company name could be identified in the offer — this alone is a vagueness signal."
    );
    base.companyExists = "not_found";
    base.confidence.companyExists = 40;
    return base;
  }

  const results = await tavilySearch(`"${companyName}" official website careers`);
  if (results === null) {
    base.degraded = true;
    base.notes.push(
      "Company verification could not be completed (search unavailable). Treat unverified claims with extra caution."
    );
    return base;
  }

  const organic = results.filter(
    (r) => !AGGREGATOR_DOMAINS.has(registrableDomain(extractDomain(r.url) ?? ""))
  );

  const nameTokens = companyName
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  const mentioned = results.some((r) =>
    nameTokens.some(
      (t) => r.title.toLowerCase().includes(t) || r.content.toLowerCase().includes(t)
    )
  );

  base.companyExists = mentioned ? "verified" : "not_found";
  base.confidence.companyExists = mentioned ? 80 : 60;
  base.evidence = results
    .slice(0, 4)
    .map((r) => `${r.title} — ${r.url}: ${r.content.slice(0, 180)}`);

  const officialCandidate = organic[0] ?? null;
  if (officialCandidate) {
    const officialHost = extractDomain(officialCandidate.url);
    if (officialHost) {
      base.officialDomain = registrableDomain(officialHost);
      base.officialSite = officialCandidate.url;
    }
  }

  if (claimedWebsite && !base.officialDomain) {
    base.notes.push(
      `The offer claims the website ${claimedWebsite}, but no independent official site was found to confirm it.`
    );
  }

  if (emailDomain && freeEmailProvider) {
    base.domainMatch = "mismatch";
    base.confidence.domainMatch = 90;
    base.notes.push(
      `The offer was sent from a free ${registrableDomain(emailDomain)} address — companies send offers from their own domain.`
    );
  } else if (emailDomain && base.officialDomain) {
    base.domainMatch = compareDomains(emailDomain, base.officialDomain);
    base.confidence.domainMatch =
      base.domainMatch === "exact" ? 90 : base.domainMatch === "typosquat" ? 85 : 70;
    if (base.domainMatch === "typosquat") {
      base.notes.push(
        `Sender domain "${registrableDomain(emailDomain)}" is a near-miss lookalike of the official "${base.officialDomain}" — a classic impersonation technique.`
      );
    } else if (base.domainMatch === "mismatch") {
      base.notes.push(
        `Sender domain "${registrableDomain(emailDomain)}" does not match the company's official domain "${base.officialDomain}".`
      );
    } else {
      base.notes.push(
        `Sender domain matches the official company domain "${base.officialDomain}".`
      );
    }
  } else if (!emailDomain) {
    base.notes.push(
      "No sender email was provided or found, so domain verification was skipped — ask the sender for an official company email."
    );
  }

  return base;
}
