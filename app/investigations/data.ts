// Person B — data for /investigations pages (server components only).
import corpusJson from "@/data/corpus.json";
import investigationsJson from "@/data/investigations.json";
import type { CorpusDoc, Investigation } from "@/lib/schema";

export const investigations = investigationsJson as Investigation[];
const corpus = corpusJson as CorpusDoc[];

export const getInvestigation = (id: string) => investigations.find((i) => i.id === id);

export const docsFor = (id: string) => corpus.filter((d) => d.investigationId === id);

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

/** One sentence per fire-safety area, copied verbatim from an Objectives doc. */
const FIRE_SAFETY_QUOTES: { area: "prevention" | "detection" | "suppression"; docId: string; quote: string }[] = [
  {
    area: "prevention",
    docId: "psi-98-objectives",
    quote:
      "The objectives of this investigation were to: (1) determine how rapidly a large scale fire grows in low-gravity and (2) investigate the low-g flammability limits compared to those obtained in NASA’s normal gravity material flammability screening test.",
  },
  {
    area: "detection",
    docId: "psi-102-objectives",
    quote:
      "One of the major goals of this investigation was to quantify the sizes that the liquid smoke particulate achieves in low gravity and to relate the droplet size distribution to the smoke generation and smoke transport conditions in the experiment.",
  },
  {
    area: "suppression",
    docId: "psi-69-objectives",
    quote:
      "The FLEX (Flame Extinguishment Experiment) investigation aims to map the flammability limits of liquid fuels in microgravity environments, measure the effectiveness of various gaseous fire suppressants such as CO2, He, and SF6, and develop reliable predictive models for combustion limits under reduced gravity conditions.",
  },
];

/**
 * The prevention / detection / suppression strip. Each quote must be a verbatim
 * substring of its corpus doc; the build fails otherwise.
 */
export const fireSafetyAreas = FIRE_SAFETY_QUOTES.map(({ area, docId, quote }) => {
  const doc = corpus.find((d) => d.id === docId);
  if (!doc || !collapse(doc.text).includes(collapse(quote))) {
    throw new Error(`Fire-safety quote for ${area} is not verbatim in corpus doc ${docId}`);
  }
  return {
    area,
    quote,
    source: { title: doc.title, url: doc.url, investigationId: doc.investigationId },
    investigations: investigations.filter((i) => i.safetyArea.includes(area)),
  };
});
