import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

type ManifestEntry = { file: string; label: string; category: "fake" | "safe" | "outlier" };

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "fixtures");
    const manifest = JSON.parse(
      await fs.readFile(path.join(dir, "manifest.json"), "utf-8")
    ) as ManifestEntry[];
    const samples = await Promise.all(
      manifest.map(async (entry) => ({
        id: entry.file.replace(/\.txt$/, ""),
        label: entry.label,
        category: entry.category,
        text: await fs.readFile(path.join(dir, entry.file), "utf-8"),
      }))
    );
    return NextResponse.json({ samples });
  } catch {
    return NextResponse.json({ samples: [] });
  }
}
