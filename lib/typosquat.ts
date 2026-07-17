import type { DomainMatch } from "./schemas";

export const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.in",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "rediffmail.com",
  "protonmail.com",
  "proton.me",
  "icloud.com",
  "aol.com",
  "mail.com",
  "gmx.com",
  "yandex.com",
]);

/** "com.sg", "co.in", "gov.uk"… — generic second-level labels under a ccTLD */
const MULTIPART_SLDS = new Set(["co", "com", "net", "org", "gov", "ac", "edu", "in"]);

function isMultipartTld(lastTwo: string): boolean {
  const [sld, tld] = lastTwo.split(".");
  return tld.length === 2 && MULTIPART_SLDS.has(sld);
}

export function extractDomain(emailOrUrl: string): string | null {
  const trimmed = emailOrUrl.trim().toLowerCase();
  const atIdx = trimmed.lastIndexOf("@");
  if (atIdx !== -1) return trimmed.slice(atIdx + 1).replace(/[>\s].*$/, "") || null;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** "careers.infosys.com" -> "infosys.com"; handles co.in-style TLDs */
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().replace(/^www\./, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  if (isMultipartTld(lastTwo)) return labels.slice(-3).join(".");
  return lastTwo;
}

function secondLevel(host: string): string {
  return registrableDomain(host).split(".")[0];
}

/** Normalize common homoglyph/lookalike substitutions used in typosquats */
function normalizeHomoglyphs(s: string): string {
  return s
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/@/g, "a");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i, ...new Array<number>(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[n];
}

/**
 * Compare the domain an offer was sent from against the company's official
 * domain. Returns "typosquat" for near-misses (missing letter, homoglyphs,
 * brand-plus-extra-words, same name under a different TLD) — these are MORE
 * dangerous than a plain mismatch because they are designed to deceive.
 */
export function compareDomains(candidate: string, official: string): DomainMatch {
  const c = registrableDomain(candidate);
  const o = registrableDomain(official);
  if (!c || !o) return "unknown";
  if (c === o) return "exact";

  const cSld = secondLevel(c);
  const oSld = secondLevel(o);

  if (cSld === oSld) return "typosquat"; // same name, wrong TLD
  if (normalizeHomoglyphs(cSld) === normalizeHomoglyphs(oSld)) return "typosquat";

  const dist = levenshtein(cSld, oSld);
  if (dist <= 2 && Math.min(cSld.length, oSld.length) >= 5) return "typosquat";

  // brand embedded with extra tokens: "infosys-careers" vs "infosys"
  // Guard: only flag if candidate is ≤1.5× the brand length.
  // This lets genuine sub-brands like "tatacommunications" (4.5× "tata") pass
  // while still catching short impersonations like "infosys-hr" (1.4× "infosys").
  const cTokens = cSld.split(/[-_]/);
  const ratio = oSld.length > 0 ? cSld.length / oSld.length : Infinity;
  if (oSld.length >= 4 && ratio <= 1.5 && (cTokens.includes(oSld) || cSld.includes(oSld))) {
    return "typosquat";
  }

  return "mismatch";
}
