import { NextResponse } from "next/server";
import { AnalyzeRequestSchema, type AnalyzeResponse } from "@/lib/schemas";
import { redactPii } from "@/lib/redact";
import { extractEntities } from "@/lib/extract";
import { verifyCompany } from "@/lib/verify";
import { scoreOffer } from "@/lib/rules";
import { buildVerificationSteps, llmAssess, reconcile } from "@/lib/assess";
import { checkRateLimit, clientKey } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const rate = checkRateLimit(clientKey(req));
  if (!rate.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rate.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { text, senderEmail } = parsed.data;

  // 1. PII redaction — nothing leaves this server un-redacted.
  //    The raw text is never persisted or logged.
  const redacted = await redactPii(text);
  const redactedSender = senderEmail ? (await redactPii(senderEmail)).text : null;

  // 2. Entity extraction (OpenAI structured output, regex fallback)
  const { entities, degraded: extractionDegraded } = await extractEntities(redacted.text);
  const effectiveSender = redactedSender || entities.senderEmail;

  // 3. Company + domain verification (Tavily)
  const verification = await verifyCompany(
    entities.companyName,
    effectiveSender,
    entities.claimedWebsite
  );

  // 4. Deterministic rule-based scoring
  const { score, level: ruleLevel, indicators: ruleIndicators } = scoreOffer(
    entities,
    verification
  );

  // 5. LLM reasoning layer + cautious reconciliation
  const { assessment, degraded: reasoningDegraded } = await llmAssess(
    entities,
    verification,
    ruleIndicators,
    ruleLevel
  );
  const verdict = reconcile(ruleLevel, assessment);

  const ruleTitles = new Set(ruleIndicators.map((r) => r.title.toLowerCase()));
  const aiIndicators =
    assessment?.indicators
      .filter((ind) => !ruleTitles.has(ind.title.toLowerCase()))
      .slice(0, 4)
      .map((ind, i) => ({
      id: `ai-${i}`,
      title: ind.title,
      whyItMatters: ind.whyItMatters,
      severity: "medium" as const,
      source: "ai" as const,
    })) ?? [];

  const degradedStages = [extractionDegraded, verification.degraded, reasoningDegraded];
  const confidence = Math.max(
    30,
    90 - degradedStages.filter(Boolean).length * 15 -
      (verification.domainMatch === "unknown" ? 10 : 0)
  );

  const summary =
    assessment?.summary ??
    (verdict === "high_risk"
      ? "Multiple strong scam indicators fired for this offer. Do not pay anything or share documents until it is independently verified."
      : verdict === "suspicious"
        ? "Some warning signs were detected. Verify this offer through official channels before responding."
        : "No strong scam indicators were detected, but always confirm an offer through official channels before sharing documents.");

  const response: AnalyzeResponse = {
    verdict,
    score,
    confidence,
    summary,
    entities,
    verification,
    indicators: [...ruleIndicators, ...aiIndicators],
    verificationSteps: buildVerificationSteps(assessment),
    redaction: redacted.counts,
    degraded: {
      extraction: extractionDegraded,
      verification: verification.degraded,
      reasoning: reasoningDegraded,
    },
  };

  return NextResponse.json(response);
}
