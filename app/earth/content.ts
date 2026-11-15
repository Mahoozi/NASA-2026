// Person A — content for /earth. Everything here is either quoted text (the
// challenge brief, a PSI record, a stored run) or a pure selection from data/.
// No generated text, no rewording.
import investigationsJson from "../../data/investigations.json";
import runsJson from "../../data/runs.json";
import type { Investigation, Run } from "../../lib/schema";
import { BRIEF_FLEX_SENTENCE } from "../brief/brief-text";

export { BRIEF_FLEX_SENTENCE, BRIEF_SENTENCE, BRIEF_TEXT, displayBriefQuote } from "../brief/brief-text";

export const EARTH_INTRO =
  "NASA's microgravity fire research also feeds fire safety on Earth. Each section separates what the challenge brief says, what the PSI records say, and NASA Spinoff pages. Firebreak does not claim that any specific PSI test led to a specific Earth product.";

/** Shown under the two suppression quotes, exact text. */
export const SUPPRESSION_NOTE = "The brief does not link these two; Firebreak does not either.";

export const NO_SPINOFF = "No spinoff page was provided in the challenge resources.";
export const SPINOFF_LABEL = "NASA Spinoff (not PSI data)";

export type Spinoff = { title: string; url: string };

export type EarthSection = {
  id: "suppression" | "detection" | "gear";
  heading: string;
  /** Contiguous parts of BRIEF_TEXT for this topic. */
  briefQuotes: string[];
  /** Our own one-line note under the quotes. */
  briefNote?: string;
  psiIds: string[];
  spinoffs: Spinoff[];
  /** Show the Saffire-II sample that includes Nomex. */
  nomexRun?: boolean;
};

export const EARTH_SECTIONS: EarthSection[] = [
  {
    id: "suppression",
    heading: "Suppression",
    briefQuotes: [BRIEF_FLEX_SENTENCE, "Fine-water-mist extinguishers developed for use on the ISS have practical applications here on Earth"],
    briefNote: SUPPRESSION_NOTE,
    psiIds: ["PSI-69"],
    spinoffs: [],
  },
  {
    id: "detection",
    heading: "Smoke detection",
    briefQuotes: ["NASA technology has similarly led to improvements in terrestrial smoke detection"],
    psiIds: ["PSI-102", "PSI-101", "PSI-47"],
    spinoffs: [{ title: "Fire Detector", url: "https://spinoff.nasa.gov/node/9407" }],
  },
  {
    id: "gear",
    heading: "Firefighter gear",
    briefQuotes: ["firefighter gear, including protective clothing and air tanks"],
    psiIds: ["PSI-99"],
    spinoffs: [
      { title: "Fireman's Air Tanks", url: "https://spinoff.nasa.gov/node/9582" },
      { title: "New Technology for the Fire Attire", url: "https://spinoff.nasa.gov/node/9918" },
    ],
    nomexRun: true,
  },
];

export const investigationsById = new Map((investigationsJson as Investigation[]).map((i) => [i.id, i]));

/**
 * Splits text after its first `count` sentences without changing a character:
 * `lead + separator + rest === text`. A sentence ends at . ! or ? (plus any
 * closing quotes) followed by whitespace and a capital, digit or opening quote.
 */
export function splitSentences(text: string, count = 2): { lead: string; separator: string; rest: string } {
  const end = /([.!?]["”’']*)(\s+)(?=["“‘'A-Z0-9])/g;
  let seen = 0;
  for (let m = end.exec(text); m; m = end.exec(text)) {
    if (++seen === count) {
      const cut = m.index + m[1].length;
      return { lead: text.slice(0, cut), separator: m[2], rest: text.slice(cut + m[2].length) };
    }
  }
  return { lead: text, separator: "", rest: "" };
}

/** The Saffire-II samples whose recorded material includes Nomex. */
export function nomexRuns(runs: Run[] = runsJson as Run[]): Run[] {
  return runs.filter(
    (r) => r.investigationId === "PSI-99" && (r.material.family === "Nomex" || /nomex/i.test(r.material.raw)),
  );
}

export type RunField = { label: string; value: string; flag?: boolean };

/** Observation labels shown for the Nomex sample; the values are the stored strings. */
const SOURCE_NOTE_LABEL = "source note 2";
const SHOWN_OBSERVATIONS = ["microgravity burn length", "microgravity spread", "1-g burn length", "1-g spread rate", SOURCE_NOTE_LABEL];

/**
 * Fields of a run exactly as stored. `events` empty is shown as the Lab's
 * "outcome not recorded" (no event keyword in the table), never as a result.
 */
export function runFields(run: Run): RunField[] {
  const fields: RunField[] = [
    { label: "Run id", value: run.id },
    { label: "Sample id", value: run.testId },
    { label: "Material as recorded", value: run.material.raw },
    { label: "Starting oxygen", value: run.o2InitialPct === null ? "not recorded" : `${run.o2InitialPct}%` },
    { label: "Airflow as recorded", value: run.flowCmS.raw },
  ];
  if (run.flowDirection) fields.push({ label: "Flow direction", value: run.flowDirection });
  fields.push({
    label: "Event keyword",
    value: run.events.length ? run.events.join(", ") : "outcome not recorded",
  });
  for (const label of SHOWN_OBSERVATIONS) {
    const o = run.observations?.find((x) => x.label === label);
    // The stored label is "source note 2"; shown as "Source note", value verbatim.
    if (o) fields.push({ label: label === SOURCE_NOTE_LABEL ? "Source note" : o.label, value: o.value });
  }
  for (const f of run.flags) fields.push({ label: "Flag", value: f, flag: true });
  return fields;
}
