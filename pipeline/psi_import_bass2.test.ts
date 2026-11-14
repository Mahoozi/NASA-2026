/**
 * Parser tests for the PSI-25 (BASS-II) importer.
 * Every input string below is copied verbatim from a real row of
 * data/raw/PSI-25_Experimental table_BASS-II.csv (test id in the test name).
 */
import { describe, expect, it } from "vitest";
import {
  FLAG,
  acceptanceFailures,
  dayOfYear,
  importRuns,
  loadRawRows,
  parseAirflow,
  parseCo,
  parseCsv,
  parseDate,
  parseEvents,
  parseMaterial,
  parseNumber,
  parseO2,
} from "./psi_import_bass2";

describe("parseMaterial", () => {
  it("B1: micron film with width", () => {
    expect(parseMaterial("100 micron PMMA film   2 cm wide")).toEqual({
      material: { family: "PMMA film", raw: "100 micron PMMA film 2 cm wide", thicknessMm: 0.1, widthCm: 2 },
      flags: [],
    });
  });
  it("B6: thickness in mm", () => {
    const { material } = parseMaterial("2 cm 0.1 mm PMMA film");
    expect(material).toMatchObject({ family: "PMMA film", thicknessMm: 0.1, widthCm: 2 });
  });
  it("B14: 'micron' without 'film' is still film", () => {
    const { material, flags } = parseMaterial("1 cm wide 200 micron thick PMMA");
    expect(material).toMatchObject({ family: "PMMA film", thicknessMm: 0.2, widthCm: 1 });
    expect(flags).toEqual([]);
  });
  it("M5: 'sided' → slab, mm thickness", () => {
    const { material } = parseMaterial("3 mm thick PMMA   2 sided   2 cm thick");
    expect(material).toMatchObject({ family: "PMMA slab", thicknessMm: 3, widthCm: 2 });
  });
  it("M10: explicit slab", () => {
    const { material } = parseMaterial("4 mm thick   1 cm wide PMMA slab");
    expect(material).toMatchObject({ family: "PMMA slab", thicknessMm: 4, widthCm: 1 });
  });
  it("O4: 3/8 rod without 'PMMA' is inferred and flagged", () => {
    expect(parseMaterial('3/8"clear rod')).toEqual({
      material: { family: "PMMA rod", raw: '3/8"clear rod', diameterIn: 0.375 },
      flags: [FLAG.inferredPmma],
    });
  });
  it("O5a: 1/2 rod that names PMMA is not flagged", () => {
    expect(parseMaterial('1/2" clear PMMA rod')).toEqual({
      material: { family: "PMMA rod", raw: '1/2" clear PMMA rod', diameterIn: 0.5 },
      flags: [],
    });
  });
  it("P5-style 0.5 inch rod", () => {
    expect(parseMaterial('0.5" black rod').material.diameterIn).toBe(0.5);
  });
  it("T15/T17: SIBAL fabric", () => {
    expect(parseMaterial("2 cm SIBAL").material).toEqual({ family: "SIBAL fabric", raw: "2 cm SIBAL", widthCm: 2 });
  });
  it("T28b: 1 cm SIBAL", () => {
    expect(parseMaterial("1 cm SIBAL").material.widthCm).toBe(1);
  });
  it("T3/T7: spherical section is 'other', flagged, and gets no width", () => {
    expect(parseMaterial("4 cm spherical section")).toEqual({
      material: { family: "other", raw: "4 cm spherical section" },
      flags: [FLAG.spherical],
    });
  });
  it("F4: wax candle", () => {
    expect(parseMaterial("Japan Wax candle")).toEqual({
      material: { family: "wax", raw: "Japan Wax candle" },
      flags: [],
    });
  });
});

describe("parseO2", () => {
  it("B1: plain values", () => {
    expect(parseO2("22.2", "22.2")).toEqual({ initial: 22.2, final: 22.2, flags: [] });
  });
  it("B14: 'none' final → null without flag", () => {
    expect(parseO2("15", "none")).toEqual({ initial: 15, final: null, flags: [] });
  });
  it("O12: lowest initial O2 in the table", () => {
    expect(parseO2("13.6", "13.5").initial).toBe(13.6);
  });
  it("P22b: final above 25 → null + flag", () => {
    expect(parseO2("20", "39.1")).toEqual({
      initial: 20, final: null, flags: [FLAG.finalO2Implausible("39.1")],
    });
  });
  it("T28b: final above 25 → null + flag", () => {
    expect(parseO2("20.7", "40.4").flags).toEqual(["final O2 implausible in source (raw: 40.4)"]);
  });
  it("B2: final below 10 → null + flag", () => {
    expect(parseO2("22.2", "1.6")).toMatchObject({ final: null, flags: [FLAG.finalO2Implausible("1.6")] });
  });
});

describe("parseAirflow", () => {
  it("B1: single value", () => {
    expect(parseAirflow("5")).toEqual({ min: 5, max: 5, flags: [] });
  });
  it("B6: ignores words between numbers", () => {
    expect(parseAirflow("3   5   approaching 10")).toEqual({ min: 3, max: 10, flags: [] });
  });
  it("B14: event word is not a number", () => {
    expect(parseAirflow("5  3  2   ext")).toEqual({ min: 2, max: 5, flags: [] });
  });
  it("B16: numbers followed by 'pot' are dropped", () => {
    expect(parseAirflow("3  0.5 pot   0.4 pot")).toEqual({ min: 3, max: 3, flags: [FLAG.potInAir] });
  });
  it("M5: stepped flow", () => {
    expect(parseAirflow("20  13  10  8  5")).toEqual({ min: 5, max: 20, flags: [] });
  });
  it("O4: 'down to ext'", () => {
    expect(parseAirflow("5   down to ext")).toEqual({ min: 5, max: 5, flags: [] });
  });
  it("O5a: parenthesised fan numbers ignored when outside max ≤ 40", () => {
    expect(parseAirflow("5  10  5   2   0 (49   62   49   44   42)")).toEqual({ min: 0, max: 10, flags: [] });
  });
  it("O5b: explicit cm/s wins", () => {
    expect(parseAirflow("49   5 cm/s")).toEqual({ min: 5, max: 5, flags: [] });
  });
  it("O12: no numbers", () => {
    expect(parseAirflow("no ign at any flow")).toEqual({ min: null, max: null, flags: [FLAG.airNotNumeric] });
  });
  it("O13a: swapped columns → use parenthesised values", () => {
    expect(parseAirflow("49  44  42  41  41  40.5 (5   2   0)")).toEqual({ min: 0, max: 5, flags: [FLAG.swapped] });
  });
  it("P4: every number after 'pots' is dropped", () => {
    expect(parseAirflow("5   pots 0.4   0.36   0.32   0.308   .3   off")).toEqual({ min: 5, max: 5, flags: [FLAG.potInAir] });
  });
  it("P8: words inside the list", () => {
    expect(parseAirflow("5   would not stay lit   10   15 ibid")).toEqual({ min: 5, max: 15, flags: [] });
  });
  it("T15", () => {
    expect(parseAirflow("9   29")).toEqual({ min: 9, max: 29, flags: [] });
  });
  it("T17: above 40 with no parenthesised alternative is kept and flagged", () => {
    expect(parseAirflow("6   53")).toEqual({ min: 6, max: 53, flags: [FLAG.above40] });
  });
  it("F4: 'ign' is not a number", () => {
    expect(parseAirflow("3 ign")).toEqual({ min: 3, max: 3, flags: [] });
  });
  it("B9: '<1' counts as 1 and is flagged", () => {
    expect(parseAirflow("2   <1")).toEqual({ min: 1, max: 2, flags: [FLAG.belowOne] });
  });
});

describe("parseEvents", () => {
  it("B14: 'ext' → extinction", () => {
    expect(parseEvents("pot 0.9   0.5 and down", "5  3  2   ext")).toEqual(["extinction"]);
  });
  it("B18: blowoff", () => {
    expect(parseEvents("pot 1.02 (47)   incr to 7.0", "10   blowoff")).toEqual(["blowoff"]);
  });
  it("O12: 'no ign'", () => {
    expect(parseEvents("pots 1.4   3   0.9   0.7", "no ign at any flow")).toEqual(["no-ignition"]);
  });
  it("P8: 'would not stay lit'", () => {
    expect(parseEvents("48   62   75", "5   would not stay lit   10   15 ibid")).toEqual(["no-ignition"]);
  });
  it("P4: 'off' is not an event", () => {
    expect(parseEvents("48   41", "5   pots 0.4   0.36   0.32   0.308   .3   off")).toEqual([]);
  });
  it("F4: 'ign' alone is not an event", () => {
    expect(parseEvents("see notes", "3 ign")).toEqual([]);
  });
  it("O4: extinction in both columns is reported once", () => {
    expect(parseEvents("5   0.7   0.5   0.4   0.36 ext", "5   down to ext")).toEqual(["extinction"]);
  });
  it("whole word 'out' (O6) → extinction", () => {
    expect(parseEvents("5   .36  .32  .31  .305   out .275", "see fan")).toEqual(["extinction"]);
  });
  it("M10 / T15: no keyword", () => {
    expect(parseEvents("75   105   94/91", "10  17  14  10  8")).toEqual([]);
    expect(parseEvents("80122", "9   29")).toEqual([]);
  });
});

describe("parseCo", () => {
  it("B1: plain values", () => {
    expect(parseCo("0", "6")).toEqual({ co: { initialPpm: 0, finalPpm: 6, raw: "0 → 6" }, flags: [] });
  });
  it("M5: '>500' → null + over-range flag", () => {
    expect(parseCo("9", ">500")).toEqual({ co: { initialPpm: 9, finalPpm: null, raw: "9 → >500" }, flags: [FLAG.coOverRange] });
  });
  it("M10: negative value kept + flag", () => {
    expect(parseCo("-1", "536")).toEqual({ co: { initialPpm: -1, finalPpm: 536, raw: "-1 → 536" }, flags: [FLAG.coNegative] });
  });
  it("O12: 'OR' on both ends", () => {
    const { co, flags } = parseCo("OR", "OR");
    expect(co).toEqual({ initialPpm: null, finalPpm: null, raw: "OR → OR" });
    expect(new Set(flags)).toEqual(new Set([FLAG.coOverRange]));
  });
  it("T28b: 'none' → null without flag", () => {
    expect(parseCo("none", "2")).toEqual({ co: { initialPpm: null, finalPpm: 2, raw: "none → 2" }, flags: [] });
  });
});

describe("parseNumber / parseDate", () => {
  it("rejects unrecognised tokens loudly", () => {
    expect(() => parseNumber("approx 3", "initial O2")).toThrow(/non-numeric/);
  });
  it("blank and 'none' → null", () => {
    expect(parseNumber("", "x")).toBeNull();
    expect(parseNumber("none", "x")).toBeNull();
  });
  it("dates to ISO and day of year", () => {
    expect(parseDate("2/19/2014")).toBe("2014-02-19");
    expect(dayOfYear("2014-02-19")).toBe(50);
    expect(dayOfYear(parseDate("7/22/2014"))).toBe(203); // O10 says GMT 213
  });
});

describe("parseCsv", () => {
  it("handles quoted inch marks", () => {
    expect(parseCsv('a,"1/4"" clear rod",b\n')).toEqual([["a", '1/4" clear rod', "b"]]);
  });
});

describe("full import of the real table", () => {
  const runs = importRuns(loadRawRows());
  const by = Object.fromEntries(runs.map((r) => [r.testId, r]));

  it("passes every acceptance check", () => {
    expect(acceptanceFailures(runs)).toEqual([]);
  });
  it("B14 row end to end", () => {
    expect(by.B14).toMatchObject({
      id: "PSI-25:B14", investigationId: "PSI-25", pi: "Bhattacharjee", date: "2014-07-02",
      o2InitialPct: 15, o2FinalPct: null, events: ["extinction"],
      co2: { initialPct: 0, finalPct: null },
      flowCmS: { min: 2, max: 5, raw: "fan: pot 0.9 0.5 and down | air: 5 3 2 ext" },
    });
  });
  it("T9 and T18 carry the year flag; T10, F4 and O20–O22 do not", () => {
    for (const id of ["T9", "T18"]) expect(by[id].flags).toContain(FLAG.yearInconsistent);
    for (const id of ["T10", "F4", "O20", "O21", "O22"]) expect(by[id].flags).not.toContain(FLAG.yearInconsistent);
  });
  it("O10 date disagrees with its GMT day", () => {
    expect(by.O10.flags).toContain(FLAG.dateGmt);
  });
});
