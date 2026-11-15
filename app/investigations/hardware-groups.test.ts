import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import investigationsJson from "../../data/investigations.json";
import runsJson from "../../data/runs.json";
import type { Investigation, Run } from "../../lib/schema";
import { BRIEF_TEXT, displayBriefQuote } from "../brief/brief-text";
import { HARDWARE_GROUPS, groupInvestigations } from "./hardware";
import { HARDWARE_INTRO, HardwareGroups } from "./hardware-groups";

const investigations = investigationsJson as Investigation[];
const runs = runsJson as Run[];
const html = renderToStaticMarkup(createElement(HardwareGroups, { investigations }));
const decode = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const text = (s: string) => decode(s.replace(/<[^>]*>/g, ""));
const strip = (h: string) => h.replace(/<(\w+)[^>]*data-quoted[^>]*>[\s\S]*?<\/\1>/g, " ");
/** The <li> of each investigation, keyed by id. */
const items = new Map([...html.matchAll(/<li[^>]*data-investigation="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => [m[1], m[2]]));

describe("hardware groups mapping", () => {
  const allIds = HARDWARE_GROUPS.flatMap((g) => g.ids);

  it("follows the brief: three groups of 6, 3 and 4 investigations", () => {
    expect(HARDWARE_GROUPS.map((g) => [g.id, g.ids])).toEqual([
      ["acme", ["PSI-10", "PSI-20", "PSI-21", "PSI-22", "PSI-23", "PSI-159"]],
      ["mdca", ["PSI-39", "PSI-68", "PSI-69"]],
      ["msg", ["PSI-25", "PSI-26", "PSI-106", "PSI-107"]],
    ]);
    expect(HARDWARE_GROUPS[0].ids).toHaveLength(6);
  });

  it("every mapped id exists, and no id is in two groups", () => {
    for (const id of allIds) expect(investigations.some((i) => i.id === id), id).toBe(true);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("every investigation is in exactly one place: 3 groups + the rest = all 24", () => {
    const { groups, rest } = groupInvestigations(investigations);
    const placed = [...groups.flatMap((g) => g.members), ...rest].map((i) => i.id);
    expect(investigations).toHaveLength(24);
    expect(placed).toHaveLength(24);
    expect(new Set(placed)).toEqual(new Set(investigations.map((i) => i.id)));
    expect(groups.map((g) => g.members.length)).toEqual([6, 3, 4]);
    expect(rest).toHaveLength(24 - 13);
    // Rendered once each.
    expect([...items.keys()].sort()).toEqual(investigations.map((i) => i.id).sort());
    for (const id of items.keys()) expect(html.split(`href="/investigations/${id}"`).length - 1, id).toBe(1);
  });
});

describe("hardware groups section", () => {
  it("quotes the brief's sentence for each group, labelled, exactly", () => {
    for (const g of HARDWARE_GROUPS) {
      expect(BRIEF_TEXT, g.id).toContain(g.briefQuote);
      expect(text(html), g.id).toContain(displayBriefQuote(g.briefQuote));
    }
    expect(text(html).match(/Challenge brief/g)).toHaveLength(HARDWARE_GROUPS.length);
  });

  it("shows acronym (or name), stored fuel phase and computed run counts for each grouped investigation", () => {
    for (const g of HARDWARE_GROUPS)
      for (const id of g.ids) {
        const inv = investigations.find((i) => i.id === id)!;
        const li = items.get(id)!;
        expect(li, id).toContain(`href="/investigations/${id}"`);
        expect(text(li), id).toContain(inv.acronym || inv.name);
        expect(text(li), id).toContain(inv.fuelPhase.join(", "));
        const n = runs.filter((r) => r.investigationId === id).length;
        if (n > 0) expect(text(li), id).toContain(`${n} ${n === 1 ? "run" : "runs"} in the Lab`);
        else expect(text(li), id).not.toMatch(/in the Lab/);
      }
    // Run counts match the data for every investigation, grouped or not.
    for (const inv of investigations) {
      const n = runs.filter((r) => r.investigationId === inv.id).length;
      expect(/in the Lab/.test(items.get(inv.id)!), inv.id).toBe(n > 0);
    }
    expect(text(items.get("PSI-25")!)).toContain("129 runs in the Lab");
  });

  it("lists the remaining investigations with their stored facility text as is", () => {
    const { rest } = groupInvestigations(investigations);
    for (const inv of rest) {
      const li = text(items.get(inv.id)!);
      expect(li, inv.id).toContain(inv.facility || "facility not stated");
    }
    expect(text(items.get("PSI-98")!)).toContain("Saffire 1 enclosure in Cygnus");
    expect(text(items.get("PSI-102")!)).toContain("Comparitive Soot Diagnostic Hardware");
    expect(text(items.get("PSI-47")!)).toContain("TSI P-Trak");
    expect(html).toContain("Not in the brief&#x27;s hardware groups");
  });

  it("has the anchor, the intro, and no banned words in Firebreak's own text", () => {
    expect(html).toContain('id="hardware-heading"');
    expect(text(html)).toContain(HARDWARE_INTRO);
    const own = text(strip(html));
    expect(own.length).toBeGreaterThan(300);
    expect(own).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
  });

  it("keeps text at 14 px or larger", () => {
    expect(html).not.toMatch(/text-(xs|\[1[0-3]px\])/);
  });
});
