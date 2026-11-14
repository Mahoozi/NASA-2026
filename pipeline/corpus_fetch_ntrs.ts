/**
 * Fetch the published NASA papers for Stage 3b from NTRS and extract their text.
 *
 *   npm run fetch:ntrs
 *
 * For each NTRS id in NTRS_IDS:
 *   - saves the NTRS API record, unmodified, to data/raw/ntrs-<id>.json (committed)
 *   - skips the paper unless NTRS marks it reusable (REUSE_OK), and says why
 *   - downloads the PDF to data/raw/ntrs-<id>.pdf (git-ignored)
 *   - extracts each page's text layer, unedited, with unpdf
 * Writes data/ntrs-papers.json (committed) so the corpus can be rebuilt without
 * the PDFs. Raw files are never overwritten.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extractText, getDocumentProxy } from "unpdf";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://ntrs.nasa.gov/api/citations";
export const NTRS_PAPERS = "data/ntrs-papers.json";

/** The NTRS sources listed in plan/B.md B3b.1. */
export const NTRS_IDS = [
  "20160000593", // BASS-II results
  "20150008962", // BASS/BASS-II fabric
  "20170008805", // Saffire large-scale results
  "20180005168", // Saffire overview
  "20210022402", // partial-gravity flammability
  "20240015307", // FM2
  "20260003925", // reduced-pressure ECLSS
];

/** NTRS copyright determinations that allow reuse. Anything else is skipped. */
const REUSE_OK = new Set(["PUBLIC_USE_PERMITTED", "GOV_PERMITTED", "GOV_PUBLIC_USE_PERMITTED"]);

export type NtrsPaper = {
  id: string;
  title: string;
  authors: string[];
  year: number;
  stiType: string;
  determinationType: string;
  citationUrl: string;
  pdfUrl: string;
  bytes: number;
  sha256: string;
  pages: { page: number; text: string }[];
};
export type NtrsSkipped = { id: string; title: string; reason: string };

type NtrsRecord = {
  title: string;
  stiType?: string;
  submittedDate?: string;
  copyright?: { determinationType?: string };
  authorAffiliations?: { meta?: { author?: { name?: string } } }[];
  publications?: { publicationDate?: string }[];
  downloads?: { mimetype?: string; links?: { pdf?: string } }[];
};

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res;
}

/** Save a raw file once; if it exists, use the saved copy (raw files are never overwritten). */
async function rawOnce(file: string, get: () => Promise<Uint8Array>): Promise<Uint8Array> {
  const path = join(ROOT, "data", "raw", file);
  if (existsSync(path)) return new Uint8Array(readFileSync(path));
  const bytes = await get();
  writeFileSync(path, bytes);
  return bytes;
}

async function main() {
  const papers: NtrsPaper[] = [];
  const skipped: NtrsSkipped[] = [];

  for (const id of NTRS_IDS) {
    const recordBytes = await rawOnce(`ntrs-${id}.json`, async () =>
      new Uint8Array(await (await fetchOk(`${API}/${id}`)).arrayBuffer()),
    );
    const r = JSON.parse(Buffer.from(recordBytes).toString("utf8")) as NtrsRecord;
    const title = r.title.replace(/\s+/g, " ").trim();
    const determination = r.copyright?.determinationType ?? "NOT_SET";

    if (!REUSE_OK.has(determination)) {
      skipped.push({ id, title, reason: `NTRS copyright determination is ${determination}` });
      console.log(`skip ${id}: ${determination}`);
      continue;
    }
    const pdfLink = r.downloads?.find((d) => /pdf/i.test(d.mimetype ?? ""))?.links?.pdf;
    if (!pdfLink) {
      skipped.push({ id, title, reason: "no PDF in the NTRS record" });
      console.log(`skip ${id}: no PDF`);
      continue;
    }
    const pdfUrl = new URL(pdfLink, "https://ntrs.nasa.gov").href;
    const pdf = await rawOnce(`ntrs-${id}.pdf`, async () =>
      new Uint8Array(await (await fetchOk(pdfUrl)).arrayBuffer()),
    );

    const doc = await getDocumentProxy(new Uint8Array(pdf));
    const { totalPages, text } = await extractText(doc, { mergePages: false });
    if (text.length !== totalPages) throw new Error(`${id}: got text for ${text.length} of ${totalPages} pages`);

    const date = r.publications?.[0]?.publicationDate ?? r.submittedDate ?? "";
    const year = Number(date.slice(0, 4));
    if (!Number.isInteger(year) || year < 1950) throw new Error(`${id}: no publication year in the NTRS record`);

    papers.push({
      id,
      title,
      authors: (r.authorAffiliations ?? [])
        .map((a) => a.meta?.author?.name?.replace(/\s+/g, " ").trim())
        .filter((n): n is string => !!n),
      year,
      stiType: r.stiType ?? "",
      determinationType: determination,
      citationUrl: `https://ntrs.nasa.gov/citations/${id}`,
      pdfUrl,
      bytes: pdf.length,
      sha256: createHash("sha256").update(pdf).digest("hex"),
      pages: text.map((t, i) => ({ page: i + 1, text: t })),
    });
    const empty = text.filter((t) => !t.trim()).length;
    console.log(`ok   ${id}: ${totalPages} pages (${empty} without text) — ${title}`);
  }

  writeFileSync(join(ROOT, NTRS_PAPERS), JSON.stringify({ papers, skipped }, null, 2) + "\n");
  console.log(`\n${NTRS_PAPERS}: ${papers.length} papers, ${skipped.length} skipped`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
