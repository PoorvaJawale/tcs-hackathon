import { NextResponse } from "next/server";
import { FileParseError, parseOfferFile } from "@/lib/parse-files";
import { checkRateLimit, clientKey } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rate = checkRateLimit(clientKey(req));
  if (!rate.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rate.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    // Parsed in-memory only; the file is never written to disk or persisted.
    const { text, truncated } = await parseOfferFile(file);
    return NextResponse.json({ text, truncated, filename: file.name });
  } catch (err) {
    if (err instanceof FileParseError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to read this file. Try pasting the offer text instead." },
      { status: 422 }
    );
  }
}
