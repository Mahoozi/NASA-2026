import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BRIEF_TEXT, E_FIELD_QUOTE } from "../brief/brief-text";
import { GravityBoundsNote } from "./gravity-bounds-note";

const html = renderToStaticMarkup(createElement(GravityBoundsNote, {}));
const decode = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const text = decode(html.replace(/<[^>]*>/g, ""));

describe("partial-gravity note: E-FIELD Flames", () => {
  it("quotes the brief's sentence exactly", () => {
    expect(BRIEF_TEXT).toContain(E_FIELD_QUOTE);
    expect(text).toContain(`“${E_FIELD_QUOTE}”`);
  });

  it("says there is no run table, and links the investigation page", () => {
    expect(text).toContain("Firebreak has no run table for E-FIELD Flames; see its investigation page.");
    expect(html).toMatch(/href="\/investigations\/PSI-22"[^>]*>its investigation page</);
  });

  it("keeps the existing caveat", () => {
    expect(text).toContain("Caveat: published tests suggest flammability may peak near lunar gravity.");
    expect(text).toContain("Gollner et al.");
  });

  it("uses no banned words outside the quoted sentences", () => {
    const own = text.replace(E_FIELD_QUOTE, "");
    expect(own).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
  });
});
