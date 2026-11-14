// Person B — data for /investigations pages (server components only).
import corpusJson from "@/data/corpus.json";
import investigationsJson from "@/data/investigations.json";
import type { CorpusDoc, Investigation } from "@/lib/schema";

export const investigations = investigationsJson as Investigation[];
const corpus = corpusJson as CorpusDoc[];

export const getInvestigation = (id: string) => investigations.find((i) => i.id === id);

export const docsFor = (id: string) => corpus.filter((d) => d.investigationId === id);
