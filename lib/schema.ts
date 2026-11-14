export type SafetyArea = "prevention" | "detection" | "suppression" | "fundamental";

export type Investigation = {
  id: string;                 // "PSI-25"
  acronym: string;            // "BASS-II"
  name: string;
  url: string;                // PSI page
  doi?: string;
  safetyArea: SafetyArea[];
  fuelPhase: ("solid" | "liquid droplet" | "gas")[];
  facility: string;
  platform: string;
  objectives: string;
  approach: string;
  hypothesis?: string;
  earthBenefits?: string;
  hasRunData: boolean;
};

export type MaterialFamily =
  | "PMMA film" | "PMMA slab" | "PMMA rod" | "PMMA sphere"
  | "SIBAL fabric" | "Nomex" | "wax" | "other";

export type Run = {
  id: string;                 // "PSI-25:B14"
  investigationId: string;    // "PSI-25"
  pi: string;
  testId: string;
  date: string;
  material: { family: MaterialFamily; raw: string; thicknessMm?: number; widthCm?: number; diameterIn?: number };
  o2InitialPct: number | null;
  o2FinalPct: number | null;
  flowCmS: { min: number | null; max: number | null; raw: string };
  events: ("extinction" | "blowoff" | "no-ignition")[];
  co2: { initialPct: number | null; finalPct: number | null };
  co: { initialPpm: number | null; finalPpm: number | null; raw: string };
  flags: string[];
  sourceUrl: string;
  flowDirection?: "concurrent" | "opposed";
  observations?: { label: string; value: string }[];   // values copied verbatim from the source
};

export type Scenario = {
  label?: string;
  materialFamily?: MaterialFamily;
  o2Pct?: number;
  pressurePsi?: number;
  flowCmS?: number;
  gravity?: "micro" | "lunar" | "martian" | "1g";
  safetyArea?: SafetyArea;
};

export type InvestigationMatch = {
  investigation: Investigation;
  score: number;                       // 0..1
  breakdown: Record<string, number>;   // per-dimension closeness 0..1
  coverage: "direct" | "partial" | "none";
  matchingRunIds: string[];
};

export type CorpusDoc = {
  id: string;                 // "psi-25-objectives", "guide-p14"
  source: "psi" | "guide" | "nasa-web" | "ntrs";
  investigationId?: string;
  title: string;
  url: string;
  page?: number;
  text: string;
};

export type AskRequest = {
  question: string;
  context?: { investigationIds?: string[]; scenario?: Scenario };
};

export type AskResponse = {
  status: "answered" | "insufficient_evidence";
  answer: {
    sentence: string;
    citations: { docId: string; url: string; title: string; quote: string; verified: boolean }[];
  }[];
  investigationsMentioned: string[];
};
