/** Generates .pdf and .docx versions of every fixture .txt for the upload
 *  demo. Run with: npm run fixtures */
import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";

const FIXTURES = path.join(process.cwd(), "fixtures");

function wrapLine(line: string, max = 92): string[] {
  if (line.length <= max) return [line];
  const words = line.split(" ");
  const out: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > max) {
      if (current) out.push(current);
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) out.push(current);
  return out;
}

async function toPdf(text: string, outPath: string) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 11;
  const lineHeight = 15;
  const margin = 56;
  let page = doc.addPage([595, 842]); // A4
  let y = page.getHeight() - margin;
  // pdf-lib's WinAnsi encoding can't represent ₹ — spell it out instead
  const safe = text.replace(/₹/g, "Rs. ").replace(/[^\x00-\xFF]/g, "");
  for (const raw of safe.split("\n")) {
    for (const line of wrapLine(raw)) {
      if (y < margin) {
        page = doc.addPage([595, 842]);
        y = page.getHeight() - margin;
      }
      page.drawText(line, { x: margin, y, size, font });
      y -= lineHeight;
    }
  }
  await fs.writeFile(outPath, await doc.save());
}

async function toDocx(text: string, outPath: string) {
  const doc = new Document({
    sections: [
      {
        children: text.split("\n").map(
          (line) =>
            new Paragraph({ children: [new TextRun({ text: line, size: 22 })] })
        ),
      },
    ],
  });
  await fs.writeFile(outPath, await Packer.toBuffer(doc));
}

async function main() {
  const files = (await fs.readdir(FIXTURES)).filter((f) => f.endsWith(".txt"));
  await fs.mkdir(path.join(FIXTURES, "pdf"), { recursive: true });
  await fs.mkdir(path.join(FIXTURES, "docx"), { recursive: true });
  for (const file of files) {
    const text = await fs.readFile(path.join(FIXTURES, file), "utf-8");
    const base = file.replace(/\.txt$/, "");
    await toPdf(text, path.join(FIXTURES, "pdf", `${base}.pdf`));
    await toDocx(text, path.join(FIXTURES, "docx", `${base}.docx`));
    console.log(`generated pdf+docx for ${base}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
