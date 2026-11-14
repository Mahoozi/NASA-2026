/**
 * Extract the text of each page of NASA's Researcher's Guide PDF.
 *
 *   npx tsx pipeline/corpus_extract_guide.ts
 *
 * Reads  data/raw/<GUIDE.file> (git-ignored; download it from GUIDE.pdfUrl)
 * Writes data/guide-pages.json as [{ page, text }], committed, so the corpus
 *        can be rebuilt without the PDF.
 *
 * Text is what the PDF's text layer holds, page by page, unedited. The build
 * fails if the PDF is not the exact file recorded in GUIDE (size + sha256).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extractText, getDocumentProxy } from "unpdf";
import { GUIDE, GUIDE_PAGES, type GuidePage } from "./corpus_build";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const bytes = readFileSync(join(ROOT, "data", "raw", GUIDE.file));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== GUIDE.bytes || sha256 !== GUIDE.sha256) {
    throw new Error(
      `data/raw/${GUIDE.file} is not the recorded file: got ${bytes.length} bytes, sha256 ${sha256}`,
    );
  }

  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  if (text.length !== totalPages) throw new Error(`Got text for ${text.length} of ${totalPages} pages`);

  const pages: GuidePage[] = text.map((t, i) => ({ page: i + 1, text: t }));
  writeFileSync(join(ROOT, GUIDE_PAGES), JSON.stringify(pages, null, 2) + "\n");
  const empty = pages.filter((p) => !p.text.trim()).map((p) => p.page);
  console.log(`${GUIDE_PAGES}: ${pages.length} pages, ${empty.length} without text${empty.length ? ` (${empty.join(", ")})` : ""}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
