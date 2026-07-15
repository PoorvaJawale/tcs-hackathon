/**
 * PII redaction — runs BEFORE any text is sent to OpenAI or Tavily.
 *
 * If PRESIDIO_ANALYZER_URL is set (Microsoft Presidio analyzer REST endpoint,
 * e.g. the official docker image on http://localhost:5002), it is used for
 * NER-grade detection. Otherwise a built-in regex redactor covers the most
 * damaging identifiers (Aadhaar, PAN, cards, phones, email local-parts).
 *
 * Email domains are deliberately PRESERVED — the domain is required for
 * company verification; only the personal local-part is masked.
 */

export type RedactionResult = {
  text: string;
  counts: Record<string, number>;
};

type PresidioFinding = {
  entity_type: string;
  start: number;
  end: number;
  score: number;
};

const PRESIDIO_KEEP_DOMAIN = new Set(["EMAIL_ADDRESS", "URL"]);

async function presidioRedact(text: string, url: string): Promise<RedactionResult | null> {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: "en" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const findings = (await res.json()) as PresidioFinding[];
    const counts: Record<string, number> = {};
    // Replace from the end so offsets stay valid
    let out = text;
    const sorted = findings
      .filter((f) => f.score >= 0.5 && !PRESIDIO_KEEP_DOMAIN.has(f.entity_type))
      .sort((a, b) => b.start - a.start);
    for (const f of sorted) {
      counts[f.entity_type] = (counts[f.entity_type] ?? 0) + 1;
      out = out.slice(0, f.start) + `[${f.entity_type}]` + out.slice(f.end);
    }
    return { text: maskEmailLocalParts(out, counts), counts };
  } catch {
    return null;
  }
}

function maskEmailLocalParts(text: string, counts: Record<string, number>): string {
  return text.replace(
    /\b([a-zA-Z0-9._%+-]+)(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    (_m, local: string, domain: string) => {
      counts["EMAIL_LOCAL_PART"] = (counts["EMAIL_LOCAL_PART"] ?? 0) + 1;
      const keep = local.slice(0, 2);
      return `${keep}***${domain}`;
    }
  );
}

const FALLBACK_PATTERNS: Array<{ label: string; re: RegExp; replacement: string }> = [
  { label: "AADHAAR", re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: "[AADHAAR]" },
  { label: "PAN", re: /\b[A-Z]{5}\d{4}[A-Z]\b/g, replacement: "[PAN]" },
  { label: "CARD", re: /\b(?:\d[ -]?){13,16}\b/g, replacement: "[CARD]" },
  { label: "IFSC", re: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g, replacement: "[IFSC]" },
  {
    label: "PHONE",
    re: /(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}\b/g,
    replacement: "[PHONE]",
  },
  { label: "ACCOUNT", re: /\b\d{11,18}\b/g, replacement: "[ACCOUNT]" },
];

function fallbackRedact(text: string): RedactionResult {
  const counts: Record<string, number> = {};
  let out = text;
  for (const { label, re, replacement } of FALLBACK_PATTERNS) {
    out = out.replace(re, () => {
      counts[label] = (counts[label] ?? 0) + 1;
      return replacement;
    });
  }
  out = maskEmailLocalParts(out, counts);
  return { text: out, counts };
}

export async function redactPii(text: string): Promise<RedactionResult> {
  const presidioUrl = process.env.PRESIDIO_ANALYZER_URL;
  if (presidioUrl) {
    const result = await presidioRedact(text, presidioUrl);
    if (result) return result;
  }
  return fallbackRedact(text);
}
