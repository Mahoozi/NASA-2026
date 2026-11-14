import MiniSearch from "minisearch";
import corpusJson from "../data/corpus.json";
import type { AskRequest, CorpusDoc } from "./schema";

/** Score multiplier for docs of investigations named in the request context. */
const CONTEXT_BOOST = 5;

/** Question words that match nearly every doc and only add noise. */
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "did", "do", "does", "for",
  "from", "how", "in", "is", "it", "of", "on", "or", "that", "the", "this",
  "to", "was", "were", "what", "when", "where", "which", "who", "why", "with",
]);

type Index = { search: MiniSearch<CorpusDoc>; byId: Map<string, CorpusDoc> };

let index: Index | undefined;

/** Built once per process, on first use. */
function getIndex(): Index {
  if (index) return index;
  const docs = corpusJson as CorpusDoc[];
  const search = new MiniSearch<CorpusDoc>({
    fields: ["title", "text"],
    storeFields: ["investigationId"],
    processTerm: (term) => {
      const t = term.toLowerCase();
      return STOP_WORDS.has(t) ? null : t;
    },
    searchOptions: { boost: { title: 2 }, fuzzy: 0.2, prefix: true },
  });
  search.addAll(docs);
  index = { search, byId: new Map(docs.map((d) => [d.id, d])) };
  return index;
}

/**
 * Top-k corpus docs for a question, by MiniSearch relevance over title + text.
 * Docs whose investigationId is in ctx.investigationIds have their score
 * multiplied by CONTEXT_BOOST. Ranks evidence only; no judgement of content.
 */
export function retrieve(
  question: string,
  ctx?: AskRequest["context"],
  k = 8,
): CorpusDoc[] {
  const { search, byId } = getIndex();
  const boosted = new Set(ctx?.investigationIds ?? []);
  const results = search.search(question, {
    boostDocument: (_id, _term, stored) =>
      boosted.has(stored?.investigationId as string) ? CONTEXT_BOOST : 1,
  });
  return results.slice(0, k).map((r) => byId.get(r.id)!);
}
