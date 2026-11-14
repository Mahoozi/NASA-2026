/**
 * Build data/investigations.json and data/corpus.json from raw NASA sources.
 *
 *   npm run build:corpus
 *
 * Reads  data/raw/psi-combustion-investigations-<date>.json (PSI API snapshot,
 *        never modified), data/runs.json (for hasRunData) and
 *        data/guide-pages.json (Researcher's Guide page text, written by
 *        pipeline/corpus_extract_guide.ts from the PDF in data/raw/)
 * Writes data/investigations.json, data/corpus.json, pipeline/corpus_report.md
 *
 * Text is copied verbatim from PSI and the guide. Nothing is summarised or filled in.
 * NASA web pages (nasa-web-<slug>) are read from the HTML saved in data/raw/:
 * title = the page's <h1>, text = the article body (.entry-content), verbatim.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { parse } from "node-html-parser";
import type { CorpusDoc, Investigation, Run, SafetyArea } from "../lib/schema";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const RAW_PSI = "data/raw/psi-combustion-investigations-2026-11-14.json";
export const pageUrl = (id: string) => `https://psi.nasa.gov/physci/repo/data/investigations/${id}`;

// The Researcher's Guide PDF. Its text is extracted once by
// pipeline/corpus_extract_guide.ts into GUIDE_PAGES, which is committed; the PDF
// itself is git-ignored. bytes and sha256 identify the exact file that was read.
export const GUIDE = {
  title: "A Researcher’s Guide to: Combustion Science", // as printed on the cover (p. 1)
  pageUrl: "https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/",
  pdfUrl:
    "https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
  file: "np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
  bytes: 1500825,
  sha256: "5fe046efe4e35e506023e27a9784d041e893026f19c9987591483614aea5d6b6",
};
export const GUIDE_PAGES = "data/guide-pages.json";

// NASA web pages saved unmodified on 2026-11-14. bytes and sha256 identify the exact files.
export const NASA_WEB = [
  { slug: "glenn-combustion-science", url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/", file: "nasa-web-glenn-combustion-science-2026-11-14.html", bytes: 334306, sha256: "fa8865f29d7dfda09536a3256548c2f4e21c593e79484143cd2446e7fd1fbcfa" },
  { slug: "apollo-1", url: "https://www.nasa.gov/history/55-years-ago-the-apollo-1-fire-and-its-aftermath/", file: "nasa-web-apollo-1-2026-11-14.html", bytes: 304349, sha256: "12838d04cd0378ecd7f7f6ca879997ae9019ede5abf9deb6619b880390c69cfd" },
  { slug: "apollo-13", url: "https://www.nasa.gov/missions/apollo/apollo-13-mission-details/", file: "nasa-web-apollo-13-2026-11-14.html", bytes: 306017, sha256: "07e184e3efcbbd636d80fcc00f45da59394660893516899ad74abf8f7fddf16a" },
  { slug: "mir-fire", url: "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/", file: "nasa-web-mir-fire-2026-11-14.html", bytes: 271842, sha256: "ba947c2cd1a11b478381b66d0251622fca2459ccb4aa13a2ea3bd764a59606d3" },
];
export type WebPage = { slug: string; url: string; title: string; text: string };

/** Title (<h1>) and article body text of a nasa.gov page, verbatim. */
export function extractArticle(html: string): { title: string; text: string } {
  const root = parse(html);
  const body = root.querySelector(".entry-content");
  if (!body) return { title: "", text: "" };
  for (const el of body.querySelectorAll("script, style, noscript, iframe")) el.remove();
  return { title: collapse(root.querySelector("h1")?.text), text: collapse(body.structuredText) };
}

type FuelPhase = Investigation["fuelPhase"][number];
type PsiRecord = Record<string, unknown> & { Accession: string };

// safetyArea follows the team handoff, which takes it from the challenge text:
// BASS, BASS-II, Saffire and ACME BRE are prevention (material flammability);
// SAME, SAME-R and DAFT (instrument for SAME) are detection; FLEX is
// suppression; everything else is fundamental.
export const SAFETY: Record<string, SafetyArea[]> = {
  "PSI-26": ["prevention"], // BASS
  "PSI-25": ["prevention"], // BASS-II
  "PSI-98": ["prevention"], // SAFFIRE-I
  "PSI-99": ["prevention"], // SAFFIRE-II
  "PSI-100": ["prevention"], // SAFFIRE-III
  "PSI-20": ["prevention"], // ACME BRE
  "PSI-102": ["detection"], // SAME
  "PSI-101": ["detection"], // SAME-R
  "PSI-47": ["detection"], // DAFT / DAFT-2
  "PSI-69": ["suppression"], // FLEX
};

// fuelPhase is set only where the PSI record supports it. Each entry quotes the
// PSI text it rests on; the build fails if the quote is not in the record.
// basis "material": the record names the fuel/material, not its phase.
// Investigations not listed get [] (phase not stated, or not a fuel study).
export const FUEL: Record<string, { phase: FuelPhase[]; quote: string; basis?: "material" }> = {
  "PSI-10": { phase: ["gas"], quote: "Flames of Gaseous Fuels" },
  "PSI-20": { phase: ["gas"], quote: "Flames of Gaseous Fuels" },
  "PSI-21": { phase: ["gas"], quote: "Flames of gaseous fuel" },
  "PSI-22": { phase: ["gas"], quote: "The gas-jet burner" },
  "PSI-23": { phase: ["gas"], quote: "Conventional gaseous fuels" },
  "PSI-25": { phase: ["solid"], quote: "Solid Fuels" },
  "PSI-26": { phase: ["solid"], quote: "Burning and Suppression of Solids" },
  "PSI-39": { phase: ["liquid droplet"], quote: "Droplet combustion" },
  "PSI-60": { phase: ["gas"], quote: "Gaseous" },
  "PSI-62": { phase: ["solid"], quote: "solid fuel combustion processes" },
  "PSI-68": { phase: ["liquid droplet"], quote: "droplet combustion" },
  "PSI-69": { phase: ["liquid droplet"], quote: "flammability limits of liquid fuels" },
  "PSI-98": { phase: ["solid"], quote: "Solid burning rate" },
  "PSI-99": { phase: ["solid"], quote: "SIBAL, silicone, structure PMMA, flat PMMA, and PMMA with Nomex", basis: "material" },
  "PSI-100": { phase: ["solid"], quote: "used SIBAL as the sample material", basis: "material" },
  "PSI-106": { phase: ["gas"], quote: "methane, ethylene, and nitrogen-diluted mixtures", basis: "material" },
  "PSI-107": { phase: ["gas"], quote: "ethylene, propane, and propylene mixtures", basis: "material" },
  "PSI-117": { phase: ["liquid droplet"], quote: "droplet cool flames" },
  "PSI-159": { phase: ["gas"], quote: "Flames of Gaseous Fuels" },
};

// [PSI field, corpus id section, heading]
const SECTIONS: [string, string, string][] = [
  ["Objectives", "objectives", "Objectives"],
  ["Approach", "approach", "Approach"],
  ["Hypothesis", "hypothesis", "Hypothesis"],
  ["Research Impacts/Earth Benefits", "earth-benefits", "Research Impacts / Earth Benefits"],
];

const str = (v: unknown) => (typeof v === "string" ? v : "");
/** Field value for investigations.json: verbatim, only line endings and outer whitespace trimmed. */
const clean = (v: unknown) => str(v).replace(/\r\n/g, "\n").trim();
/** Corpus text: verbatim with whitespace collapsed (plan/B.md). */
export const collapse = (v: unknown) => str(v).replace(/\s+/g, " ").trim();
/** PSI separates multiple values with runs of spaces. */
const splitMulti = (v: unknown) => clean(v).split(/\s{2,}/).map((x) => x.trim()).filter(Boolean);
const num = (id: string) => Number(id.replace(/^PSI-/, ""));

export type GuidePage = { page: number; text: string };

// Published NASA papers from NTRS (plan/B.md B3b.1). Page text is extracted by
// pipeline/corpus_fetch_ntrs.ts into NTRS_PAPERS, which is committed.
export const NTRS_PAPERS_FILE = "data/ntrs-papers.json";
type NtrsPaperData = {
  papers: {
    id: string; title: string; authors: string[]; year: number; stiType: string;
    determinationType: string; citationUrl: string; pdfUrl: string; bytes: number; sha256: string;
    pages: { page: number; text: string }[];
  }[];
  skipped: { id: string; title: string; reason: string }[];
};

/**
 * Pages kept per paper. The ECLSS report (112 pages) is mostly about life-support
 * hardware; only its pages that mention flammability, combustion, fire or
 * ignition go into the corpus, so they don't crowd out on-topic sources.
 */
const NTRS_PAGE_FILTER: Record<string, RegExp> = {
  "20260003925": /flammab|combust|\bfire\b|ignit/i,
};

/** Sources listed in plan/B.md B3b.1 that are not in the corpus, and why. */
export const PAPERS_NOT_ADDED = [
  { source: "Olson, ICES-2019, Flammability Limits from BASS-II vs normal gravity", url: "https://ttu-ir.tdl.org/items/1922ad9f-ef4c-4f52-96a4-980c23debe5e", reason: "not on NTRS; CorpusDoc has no source value for non-NTRS papers (schema change requested)" },
  { source: "Link et al. 2018, Scientific Reports", url: "https://link.springer.com/10.1038/s41598-017-18398-4", reason: "not on NTRS; CorpusDoc has no source value for non-NTRS papers (schema change requested)" },
];

/** "Ferkul, Paul V." or "Sandra L. Olson" → surname. */
const surname = (name: string) => (name.includes(",") ? name.split(",")[0] : name.split(" ").at(-1) ?? name).trim();
export const paperCitation = (p: { authors: string[]; year: number }) =>
  `${p.authors.length ? surname(p.authors[0]) + (p.authors.length > 1 ? " et al." : "") : "NASA"} (${p.year})`;

/** One CorpusDoc per kept page: id ntrs-<id>-p<page>, source "ntrs", text whitespace-collapsed. */
export function paperDocs(data: NtrsPaperData): { docs: CorpusDoc[]; errors: string[]; kept: Record<string, number[]> } {
  const docs: CorpusDoc[] = [];
  const errors: string[] = [];
  const kept: Record<string, number[]> = {};
  for (const p of data.papers) {
    if (!Number.isInteger(p.year)) errors.push(`ntrs-${p.id}: no year`);
    const filter = NTRS_PAGE_FILTER[p.id];
    kept[p.id] = [];
    for (const pg of p.pages) {
      const text = collapse(pg.text);
      if (!text || (filter && !filter.test(text))) continue;
      kept[p.id].push(pg.page);
      docs.push({
        id: `ntrs-${p.id}-p${pg.page}`,
        source: "ntrs",
        title: `${paperCitation(p)}. ${p.title}, p. ${pg.page}`,
        url: p.citationUrl,
        page: pg.page,
        text,
      });
    }
    if (!kept[p.id].length) errors.push(`ntrs-${p.id}: no pages kept`);
  }
  return { docs, errors, kept };
}

export function build(records: PsiRecord[], runs: Pick<Run, "investigationId">[], guidePages: GuidePage[], webPages: WebPage[] = []) {
  const errors: string[] = [];
  const notes: string[] = [];
  const investigations: Investigation[] = [];
  const corpus: CorpusDoc[] = [];
  const withRuns = new Set(runs.map((r) => r.investigationId));

  for (const r of records) {
    const id = r.Accession;
    if (r["Research Area"] !== "Combustion Science") errors.push(`${id}: not Combustion Science`);

    const fuel = FUEL[id];
    if (fuel) {
      const haystack = collapse(Object.values(r).map(str).join(" \n ")).toLowerCase();
      if (!haystack.includes(collapse(fuel.quote).toLowerCase())) {
        errors.push(`${id}: fuelPhase quote not found in PSI record: "${fuel.quote}"`);
      }
    }

    const hardware = (r["Experiment Hardware"] ?? {}) as { Name?: unknown };
    const platformRaw = clean(r["Flight Platform"]);
    const isGround = r["Project Type"] === "Ground Investigation";
    const platform = platformRaw && platformRaw !== "Not Applicable" ? platformRaw : isGround ? "Ground" : "";

    const inv: Investigation = {
      id,
      acronym: clean(r.Acronym),
      name: clean(r.Title),
      url: pageUrl(id),
      safetyArea: SAFETY[id] ?? ["fundamental"],
      fuelPhase: fuel?.phase ?? [],
      facility: splitMulti(hardware.Name).join("; "),
      platform,
      objectives: clean(r.Objectives),
      approach: clean(r.Approach),
      hasRunData: withRuns.has(id),
    };
    const hypothesis = clean(r.Hypothesis);
    if (hypothesis) inv.hypothesis = hypothesis;
    const earth = clean(r["Research Impacts/Earth Benefits"]);
    if (earth) inv.earthBenefits = earth;
    investigations.push(inv);

    if (!inv.acronym) notes.push(`${id}: no acronym in PSI`);
    if (!inv.facility) notes.push(`${id}: no Experiment Hardware in PSI`);
    if (!inv.platform) notes.push(`${id}: no Flight Platform in PSI`);
    if (!inv.fuelPhase.length) notes.push(`${id}: fuelPhase left empty (not stated in PSI record)`);
    if (fuel?.basis === "material") notes.push(`${id}: fuelPhase "${fuel.phase.join(", ")}" inferred from the named material: "${fuel.quote}"`);
    for (const [field] of SECTIONS) if (!clean(r[field])) notes.push(`${id}: PSI field "${field}" is empty`);

    const label = inv.acronym || inv.name;
    const n = id.toLowerCase();

    // Project facts, built only from labelled PSI fields.
    const project = (
      [
        ["Title", r.Title],
        ["Acronym", r.Acronym],
        ["Project Type", r["Project Type"]],
        ["Flight Platform", r["Flight Platform"]],
        ["Research Area", r["Research Area"]],
        ["SubResearch Area", r["SubResearch Area"]],
        ["Investigation Start Date", r["Investigation Start Date"]],
        ["Investigation End Date", r["Investigation End Date"]],
        ["Sponsoring Agency", r["Sponsoring Agency"]],
        ["Monitoring Center", r["Monitoring Center"]],
        ["Experiment Hardware", splitMulti(hardware.Name).join("; ")],
        ["Keywords", splitMulti(r.Keywords).join("; ")],
        ["Related Investigations", splitMulti(r["Related Investigations"]).join("; ")],
      ] as [string, unknown][]
    )
      .map(([k, v]) => [k, collapse(v)])
      .filter(([, v]) => v && v !== "Not Applicable")
      .map(([k, v]) => `${k}: ${v}.`)
      .join(" ");
    corpus.push({ id: `${n}-project`, source: "psi", investigationId: id, title: `${label}: Project (${id})`, url: inv.url, text: project });

    for (const [field, section, heading] of SECTIONS) {
      const text = collapse(r[field]);
      if (text) corpus.push({ id: `${n}-${section}`, source: "psi", investigationId: id, title: `${label}: ${heading} (${id})`, url: inv.url, text });
    }
  }

  // Researcher's Guide: one doc per PDF page. A page with no letters (blank,
  // or only its page number) is skipped and listed in the report.
  const skippedGuidePages: GuidePage[] = [];
  const seenPages = new Set<number>();
  for (const p of guidePages) {
    if (!Number.isInteger(p.page) || p.page < 1) errors.push(`guide: bad page number ${p.page}`);
    if (seenPages.has(p.page)) errors.push(`guide: duplicate page ${p.page}`);
    seenPages.add(p.page);
    const text = collapse(p.text);
    if (!/\p{L}/u.test(text)) {
      skippedGuidePages.push({ page: p.page, text });
      continue;
    }
    corpus.push({ id: `guide-p${p.page}`, source: "guide", title: `${GUIDE.title}, p. ${p.page}`, url: GUIDE.pageUrl, page: p.page, text });
  }
  if (!guidePages.length) errors.push(`guide: no pages in ${GUIDE_PAGES}`);

  for (const w of webPages) {
    if (!w.title) errors.push(`nasa-web-${w.slug}: no <h1> title`);
    corpus.push({ id: `nasa-web-${w.slug}`, source: "nasa-web", title: w.title, url: w.url, text: w.text });
  }

  // Asserts (plan/B.md Stage 1)
  for (const id of new Set([...Object.keys(SAFETY), ...Object.keys(FUEL)])) {
    if (!records.some((r) => r.Accession === id)) errors.push(`${id}: in curation tables but not in raw data`);
  }
  const ids = new Set<string>();
  for (const d of corpus) {
    if (ids.has(d.id)) errors.push(`duplicate corpus id ${d.id}`);
    ids.add(d.id);
    if (!d.text) errors.push(`${d.id}: empty text`);
    const host = new URL(d.url).hostname;
    if (!/(^|\.)(psi\.nasa\.gov|nasa\.gov|ntrs\.nasa\.gov)$/.test(host)) errors.push(`${d.id}: url not on a NASA host`);
  }
  for (const inv of investigations) {
    if (!corpus.some((d) => d.investigationId === inv.id)) errors.push(`${inv.id}: no corpus docs`);
  }

  investigations.sort((a, b) => num(a.id) - num(b.id));
  // PSI docs by investigation, then guide pages; stable, so section and page order are kept.
  const rank = (d: CorpusDoc) => (d.investigationId ? num(d.investigationId) : Number.MAX_SAFE_INTEGER);
  corpus.sort((a, b) => rank(a) - rank(b));
  notes.sort((a, b) => num(a.split(":")[0]) - num(b.split(":")[0]));
  return { investigations, corpus, errors, notes, skippedGuidePages, guidePageCount: guidePages.length };
}

function report(
  investigations: Investigation[],
  corpus: CorpusDoc[],
  notes: string[],
  guidePageCount: number,
  skippedGuidePages: GuidePage[],
) {
  const bySource = new Map<string, number>();
  for (const d of corpus) bySource.set(d.source, (bySource.get(d.source) ?? 0) + 1);
  const lines = [
    "# Corpus build report",
    "",
    "Generated by `npm run build:corpus` (pipeline/corpus_build.ts). Do not edit by hand.",
    "",
    `Raw PSI snapshot: \`${RAW_PSI}\``,
    "",
    "## Doc counts per source",
    "",
    "| Source | Docs |",
    "|---|---|",
    ...[...bySource].map(([s, c]) => `| ${s} | ${c} |`),
    "",
    "## Investigations",
    "",
    "| Id | Acronym | Safety area | Fuel phase | Platform | Run data | Docs |",
    "|---|---|---|---|---|---|---|",
    ...investigations.map(
      (i) =>
        `| ${i.id} | ${i.acronym || "—"} | ${i.safetyArea.join(", ")} | ${i.fuelPhase.join(", ") || "—"} | ${i.platform || "—"} | ${i.hasRunData ? "yes" : "no"} | ${corpus.filter((d) => d.investigationId === i.id).length} |`,
    ),
    "",
    "## Researcher's Guide PDF",
    "",
    `- Title (cover, p. 1): ${GUIDE.title}`,
    `- NASA page: ${GUIDE.pageUrl}`,
    `- PDF: ${GUIDE.pdfUrl}`,
    `- File: \`data/raw/${GUIDE.file}\` (git-ignored)`,
    `- Size: ${GUIDE.bytes} bytes`,
    `- sha256: \`${GUIDE.sha256}\``,
    `- Page text: \`${GUIDE_PAGES}\` (extracted by \`pipeline/corpus_extract_guide.ts\` with unpdf)`,
    `- Pages: ${guidePageCount}; docs: ${corpus.filter((d) => d.source === "guide").length} (\`guide-p<page>\`, page = PDF page number)`,
    "- Skipped pages (no text beyond the page number):",
    ...(skippedGuidePages.length
      ? skippedGuidePages.map((p) => `  - p. ${p.page}: ${p.text ? `"${p.text}"` : "no text"}`)
      : ["  - none"]),
    "",
    "## NASA web pages",
    "",
    "Saved unmodified in `data/raw/` on 2026-11-14. Title is the page's `<h1>`; text is the article body (`.entry-content`) with scripts removed and whitespace collapsed.",
    "",
    "| Doc id | Title | URL | Raw file | Bytes | sha256 | Text chars |",
    "|---|---|---|---|---|---|---|",
    ...NASA_WEB.map((w) => {
      const d = corpus.find((c) => c.id === `nasa-web-${w.slug}`);
      return `| nasa-web-${w.slug} | ${d?.title ?? "—"} | ${w.url} | \`${w.file}\` | ${w.bytes} | \`${w.sha256}\` | ${d?.text.length ?? 0} |`;
    }),
    "",
    "## How labels were set",
    "",
    "- `safetyArea`: from the challenge text as recorded in the team handoff (BASS, BASS-II, Saffire, ACME BRE = prevention; SAME, SAME-R, DAFT = detection; FLEX = suppression; all others = fundamental).",
    "- `fuelPhase`: only where the PSI record supports it; each label's supporting PSI quote is in `FUEL` in corpus_build.ts and is checked against the record on every build.",
    "- `hasRunData`: true when `data/runs.json` has runs for the investigation.",
    "- `doi`: not provided by the PSI search API; omitted.",
    "",
    "## Gaps and notes",
    "",
    ...notes.map((n) => `- ${n}`),
    "",
  ];
  return lines.join("\n");
}

function papersReport(ntrs: NtrsPaperData, kept: Record<string, number[]>) {
  return [
    "",
    "## Published papers (NTRS)",
    "",
    `Fetched by \`npm run fetch:ntrs\` (pipeline/corpus_fetch_ntrs.ts) on 2026-11-14. NTRS API records saved unmodified as \`data/raw/ntrs-<id>.json\`; PDFs as \`data/raw/ntrs-<id>.pdf\` (git-ignored); page text, unedited, in \`${NTRS_PAPERS_FILE}\`. One doc per page (\`ntrs-<id>-p<page>\`, source \`ntrs\`, shown as "Published paper" on /ask). Only papers NTRS marks reusable (public use / government permitted) are included.`,
    "",
    "| NTRS id | Citation | Title | Type | NTRS reuse | PDF bytes | sha256 | Pages | Docs |",
    "|---|---|---|---|---|---|---|---|---|",
    ...ntrs.papers.map(
      (p) =>
        `| [${p.id}](${p.citationUrl}) | ${paperCitation(p)} | ${p.title} | ${p.stiType} | ${p.determinationType} | ${p.bytes} | \`${p.sha256}\` | ${p.pages.length} | ${kept[p.id]?.length ?? 0} |`,
    ),
    "",
    "Page filter: the ECLSS report (20260003925) keeps only pages that mention flammability, combustion, fire or ignition: " +
      (kept["20260003925"] ?? []).join(", ") + ".",
    "",
    "### Not added",
    "",
    ...ntrs.skipped.map((s) => `- NTRS ${s.id} (${s.title}): skipped, ${s.reason}.`),
    ...PAPERS_NOT_ADDED.map((s) => `- ${s.source} (${s.url}): ${s.reason}.`),
    "",
  ].join("\n");
}

function main() {
  const raw = JSON.parse(readFileSync(join(ROOT, RAW_PSI), "utf8")) as {
    hits: { total: number; hits: { _source: PsiRecord }[] };
  };
  const records = raw.hits.hits.map((h) => h._source);
  if (records.length !== raw.hits.total) throw new Error("Raw PSI snapshot is incomplete");
  const runs = JSON.parse(readFileSync(join(ROOT, "data", "runs.json"), "utf8")) as Run[];
  const guidePages = JSON.parse(readFileSync(join(ROOT, GUIDE_PAGES), "utf8")) as GuidePage[];

  const webPages: WebPage[] = NASA_WEB.map((w) => {
    const bytes = readFileSync(join(ROOT, "data", "raw", w.file));
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== w.bytes || sha !== w.sha256) throw new Error(`data/raw/${w.file} is not the recorded file`);
    return { slug: w.slug, url: w.url, ...extractArticle(bytes.toString("utf8")) };
  });

  const { investigations, corpus, errors, notes, skippedGuidePages, guidePageCount } = build(records, runs, guidePages, webPages);
  const ntrs = JSON.parse(readFileSync(join(ROOT, NTRS_PAPERS_FILE), "utf8")) as NtrsPaperData;
  const papers = paperDocs(ntrs);
  errors.push(...papers.errors);
  const seen = new Set(corpus.map((d) => d.id));
  for (const d of papers.docs) if (seen.has(d.id)) errors.push(`duplicate corpus id ${d.id}`);
  corpus.push(...papers.docs);
  // data/findings.json quotes must stay verbatim in the corpus this build writes.
  const findings = JSON.parse(readFileSync(join(ROOT, "data", "findings.json"), "utf8")) as {
    id: string; quote: string; sourceDocId: string;
  }[];
  for (const f of findings) {
    const doc = corpus.find((d) => d.id === f.sourceDocId);
    if (!doc || !collapse(doc.text).includes(collapse(f.quote))) {
      errors.push(`finding ${f.id}: quote is not verbatim in corpus doc ${f.sourceDocId}`);
    }
  }
  if (errors.length) throw new Error(`Build failed:\n${errors.join("\n")}`);

  writeFileSync(join(ROOT, "data", "investigations.json"), JSON.stringify(investigations, null, 2) + "\n");
  writeFileSync(join(ROOT, "data", "corpus.json"), JSON.stringify(corpus, null, 2) + "\n");
  writeFileSync(
    join(ROOT, "pipeline", "corpus_report.md"),
    report(investigations, corpus, notes, guidePageCount, skippedGuidePages) + papersReport(ntrs, papers.kept),
  );
  console.log(`investigations.json: ${investigations.length} investigations`);
  console.log(`corpus.json: ${corpus.length} docs (${corpus.filter((d) => d.source === "guide").length} guide pages, ${skippedGuidePages.length} skipped)`);
  console.log(`corpus_report.md: ${notes.length} notes`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
