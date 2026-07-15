import mammoth from "mammoth";

export const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE ?? 5 * 1024 * 1024);
export const MAX_TEXT_LENGTH = Number(process.env.MAX_TEXT_LENGTH ?? 15000);

export type ParsedFile = {
  text: string;
  truncated: boolean;
};

export class FileParseError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Text-only extraction: macros, scripts and embedded objects in the file are
 *  never executed — pdf-parse and mammoth read text content exclusively. */
export async function parseOfferFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new FileParseError(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB.`,
      413
    );
  }

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  if (name.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (name.endsWith(".txt")) {
    text = buffer.toString("utf-8");
  } else {
    throw new FileParseError(
      "Unsupported file type. Upload a PDF, DOCX or TXT offer letter.",
      415
    );
  }

  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text || text.length < 40) {
    throw new FileParseError(
      "Could not extract readable text from this file. If it is a scanned image, paste the offer text manually."
    );
  }

  const truncated = text.length > MAX_TEXT_LENGTH;
  return { text: truncated ? text.slice(0, MAX_TEXT_LENGTH) : text, truncated };
}
