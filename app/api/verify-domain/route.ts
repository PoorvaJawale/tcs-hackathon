import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCompany } from "@/lib/verify";
import { checkRateLimit, clientKey } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const BodySchema = z.object({
  companyName: z.string().min(1).max(200),
  senderEmail: z.string().email().optional(),
  claimedWebsite: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const rate = checkRateLimit(clientKey(req));
  if (!rate.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rate.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { companyName, senderEmail, claimedWebsite } = parsed.data;
  const result = await verifyCompany(companyName, senderEmail ?? null, claimedWebsite ?? null);
  return NextResponse.json(result);
}
