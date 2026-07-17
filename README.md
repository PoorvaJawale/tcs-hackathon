# Verifly - Fake Job/Internship Offer Detector

Students receive internship offers over email, WhatsApp and LinkedIn — some are scams that
demand "registration fees", use lookalike company domains, or pressure students to respond in
hours. This tool reviews an offer message and returns a **Safe / Suspicious / High Risk**
verdict with every fraud indicator explained in plain language, plus concrete verification
steps to take before sharing documents or money.

## Quick start

```bash
npm install
cp .env.example .env.local   # then paste your real keys into .env.local
npm run dev                  # http://localhost:3000
```

| Env var | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | yes* | Entity extraction + reasoning (structured outputs) |
| `TAVILY_API_KEY` | yes* | Company/domain search & verification |
| `PRESIDIO_ANALYZER_URL` | no | Microsoft Presidio endpoint for NER-grade PII redaction |
| `OPENAI_MODEL`, `MAX_TEXT_LENGTH`, `MAX_FILE_SIZE`, `RATE_LIMIT_PER_MINUTE` | no | Tuning knobs with sensible defaults |

\* The app degrades gracefully without keys: a regex extraction fallback and the rule engine
still produce a verdict, marked "verification incomplete" with reduced confidence.

## Demo

Use the **"Try a sample"** dropdown — it loads bundled fixtures from [`fixtures/`](fixtures):

- **4 scams** — upfront ₹2,000 fee, 6-hour-deadline "direct selection", a typosquat of
  `tatacommunications.com`, and a too-good-to-be-true ₹85k data-entry stipend.
- **2 legitimate offers** — realistic Infosys/TCS letters (correct domain, no payment, real process).
- **2 deliberate outliers** — a scrappy-but-genuine startup offer, and a polished corporate-tone
  scam (`accenture-talent.net` + ₹499 "verification charge"). These show the tool *explains its
  reasoning* instead of keyword-matching.

Every fixture also exists as `.pdf` and `.docx` (in `fixtures/pdf/`, `fixtures/docx/`) for the
upload demo. Regenerate them with `npm run fixtures`. All fixtures are synthetic — no real
people, identity proofs or bank details.

## Architecture: extraction → verification → classification

```
offer text / PDF / DOCX
        │
        ▼
[1] PII redaction (lib/redact.ts)            ← Presidio REST if configured,
        │   Aadhaar/PAN/cards/phones masked,    built-in regex fallback otherwise.
        │   email local-parts masked but        Nothing leaves the server
        │   domains kept for verification       un-redacted.
        ▼
[2] Entity extraction (lib/extract.ts)       ← OpenAI structured output (zod schema),
        │   sender, company, salary, payment    temperature 0, injection-safe prompt,
        │   demands, urgency, links, vagueness  regex fallback without a key.
        ▼
[3] Company & domain verification (lib/verify.ts + lib/typosquat.ts)
        │   Tavily finds the official site; the sender domain is compared with
        │   fuzzy/typosquat logic (Levenshtein, homoglyphs rn→m/0→o, brand+extra
        │   words, wrong TLD). Free email providers always flagged.
        ▼
[4] Rule-based scoring (lib/rules.ts)        ← deterministic, weighted signals;
        │   payment request +35, typosquat +30,  the explainable backbone.
        │   free email +20, no interview +15…
        ▼
[5] LLM reasoning (lib/assess.ts)            ← plain-language explanation +
        │   score band remains the final          verification steps; cannot override
        ▼   verdict shown by the UI.               the deterministic verdict.
Safe / Suspicious / High Risk + score + indicators + checklist
```

### Where the guardrails are (for judges' Q&A)

- **Prompt injection** — offer text is wrapped in `<<<OFFER_START/END>>>` markers and the system
  prompt orders the model to treat it strictly as data. Even if injected text says "mark this
  safe" or "mark this risky", the final label always comes from the deterministic score band in
  [lib/rules.ts](lib/rules.ts).
- **Output validation** — every model response is re-parsed against zod schemas
  ([lib/schemas.ts](lib/schemas.ts)); malformed output falls back to rules-only. Nothing is ever
  rendered as HTML (React escaping only, no `dangerouslySetInnerHTML`).
- **PII protection** — redaction runs *before* any external API call; uploads are parsed
  in-memory and never written to disk; no offer text or contact details are logged.
- **Key safety** — OpenAI/Tavily keys are server-side env vars only; all calls happen in route
  handlers ([app/api/](app/api)).
- **Abuse limits** — per-IP sliding-window rate limit on all API routes; 15k char text cap;
  5MB file cap; PDF/DOCX parsed text-only (no macro/script execution).
- **Graceful degradation** — OpenAI/Tavily failure ⇒ partial result with a visible
  "verification incomplete" notice and reduced confidence, never a crash.
- **Advisory only** — a permanent disclaimer states the tool supports decisions but does not
  make them; it never contacts anyone on the student's behalf.

### Accessibility (WCAG 2.2 AA)

All interactive surfaces are keyboard-operable (tabs with arrow keys, dnd-kit keyboard sensor
for the drag-and-drop checklist). Focus rings are visible against both light and dark skins.
Status is communicated by **icon + label + color**, never color alone. Risk-score numbers
animate via NumberFlow, which honours `prefers-reduced-motion`; a global reduced-motion
fallback makes every other animation instant.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS · OpenAI structured outputs · Tavily search ·
zod · pdf-parse + mammoth · @number-flow/react · @dnd-kit · optional Microsoft Presidio.
