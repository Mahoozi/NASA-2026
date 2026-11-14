import type { AskResponse, CorpusDoc } from "../../../lib/schema";

export const MAX_SENTENCES = 4;
/** Shorter quotes ("the", "flame") match almost any doc and prove nothing. */
export const MIN_QUOTE_WORDS = 3;

/** What the model returns, before any server-side checking. */
export type DraftAnswer = {
  status: AskResponse["status"];
  sentences: { sentence: string; citations: { docId: string; quote: string }[] }[];
};

export function insufficientEvidence(): AskResponse {
  return { status: "insufficient_evidence", answer: [], investigationsMentioned: [] };
}

/** Whitespace runs become one space; ends trimmed. */
export function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Check every citation against the corpus text of the doc it names:
 * verified = collapse(doc.text).includes(collapse(quote)), and the quote has
 * at least MIN_QUOTE_WORDS words. url and title always come from the corpus,
 * never the model. Citations that do not verify (or name a doc not in `docs`)
 * are dropped, as are repeats; sentences left with no citation, or blank, are
 * dropped; if none survive the answer is insufficient_evidence.
 */
export function verifyAnswer(draft: DraftAnswer, docs: CorpusDoc[]): AskResponse {
  if (draft.status === "insufficient_evidence") return insufficientEvidence();
  const byId = new Map(docs.map((d) => [d.id, { doc: d, text: collapse(d.text) }]));

  const answer: AskResponse["answer"] = draft.sentences
    .map((s) => {
      const seen = new Set<string>();
      const citations = s.citations.flatMap((c) => {
        const entry = byId.get(c.docId);
        const q = collapse(c.quote);
        const key = `${c.docId}\u0000${q}`;
        if (!entry || seen.has(key)) return [];
        if (q.split(" ").length < MIN_QUOTE_WORDS || !entry.text.includes(q)) return [];
        seen.add(key);
        const { doc } = entry;
        return [{ docId: doc.id, url: doc.url, title: doc.title, quote: c.quote, verified: true }];
      });
      return { sentence: s.sentence.trim(), citations };
    })
    .filter((s) => s.sentence.length > 0 && s.citations.length > 0)
    .slice(0, MAX_SENTENCES);

  if (answer.length === 0) return insufficientEvidence();

  const mentioned = answer
    .flatMap((s) => s.citations)
    .map((c) => byId.get(c.docId)!.doc.investigationId)
    .filter((id): id is string => !!id);

  return { status: "answered", answer, investigationsMentioned: [...new Set(mentioned)] };
}
