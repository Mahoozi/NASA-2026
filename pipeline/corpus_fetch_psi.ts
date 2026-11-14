/**
 * Fetch every PSI investigation in the "Combustion Science" research area and
 * save the unmodified API response to data/raw/.
 *
 *   npm run fetch:psi
 *
 * Raw files are never edited: a re-run writes a new dated file and refuses to
 * overwrite an existing one. Point RAW_PSI in corpus_build.ts at the new file.
 */
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PSI_SEARCH_URL =
  "https://psi.nasa.gov/geode-py/ws/repo/search" +
  "?from=0&size=200&ffield=Research%20Area&fvalue=Combustion%20Science";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  const out = join(ROOT, "data", "raw", `psi-combustion-investigations-${date}.json`);
  if (existsSync(out)) throw new Error(`${out} already exists; raw files are not overwritten`);

  const res = await fetch(PSI_SEARCH_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`PSI API returned ${res.status}`);
  const body = await res.text();
  const json = JSON.parse(body) as { hits?: { total?: number; hits?: unknown[] } };
  const n = json.hits?.hits?.length ?? 0;
  if (n === 0) throw new Error("PSI API returned no hits");
  if (json.hits?.total !== n) throw new Error(`Got ${n} of ${json.hits?.total} hits; raise size`);

  writeFileSync(out, body);
  console.log(`Saved ${n} investigations from ${PSI_SEARCH_URL}\n-> ${out}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
