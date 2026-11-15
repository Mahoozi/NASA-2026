// Person A — the challenge brief's own text, verbatim, as the single source for
// every brief quote on the site. Fetched 2026-11-14 from
// https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/
// Each entry is the text of one element of that page (a paragraph or list item),
// listed by use, not in page order. A quote must be an exact substring of one
// entry; tests enforce it. Change an entry only by re-fetching the page.
export const BRIEF_URL = "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/";

export const BRIEF_ELEMENTS: string[] = [
  "Fire hazards are extremely dangerous in space exploration! In describing a smoke alarm that went off during the recent Artemis II mission, the commander commented, “[If] you want to get somebody’s attention really quick, make the fire alarm go off in your spacecraft when you’re still about 80,000 miles from home.” Decades earlier, the Apollo 13 crew endured the life-threatening results of an oxygen tank explosion on their way to the Moon. Similarly, a multinational crew survived a fire aboard the Mir space station caused by an oxygen generator failure. In 1967, the Apollo 1 crew died in a pre-launch test when fire erupted in their oxygen-filled spacecraft.",
  "Your challenge is to build an SI-powered, web-based dashboard that summarizes, ranks, and interprets combustion science investigations to deliver critical foundational insights for fire safety. You may consider enabling users to:",
  "Identify investigations most relevant to the fire safety needs of habitable crew environments, including spacecraft, space stations, bases on the lunar and Martian surfaces, and pressurized rovers.*",
  "Extract data that supports predictive modeling of flammability and fire scenarios in space exploration.",
  "Highlight research that informs the development of next-generation fire safety controls and equipment.",
  "In this challenge, you’ll help turn complex data into clear answers and make the next giant leap a safer one.",
  "Your dashboard could also address potential applications of the PSI data to fire safety on Earth. Fine-water-mist extinguishers developed for use on the ISS have practical applications here on Earth, and NASA technology has similarly led to improvements in terrestrial smoke detection and firefighter gear, including protective clothing and air tanks.",
  "Variables: how did tests from the same investigation differ and how were they the same?",
  "Consider how to summarize and display similarities and differences between different investigations.",
  "Fire detection was tested in microgravity through the Smoke and Aerosol Measurement Experiment studies (SAME and SAME-R). Suppression was studied in the Flame Extinguishment Experiment (FLEX) through dilution of the chamber atmosphere with carbon dioxide and helium, both of which suppress fire.",
  "The intermediate oxygen concentration used on the Moon will likely be 30% or greater, with a corresponding pressure of 10.2 psi or less. Compared to Earth’s atmosphere, that’s more than a 40% increase in the oxygen concentration making materials much more flammable.",
  "Although NASA is heavily focused on the return of astronauts to the Moon’s surface and the establishment of a Moon Base in preparation for the future human exploration of Mars, there is currently no partial-gravity combustion data available in PSI. We expect such data will be added in the future, for example from the Lunar-g Combustion Investigation (LUCI) and the Flammability of Materials on the Moon (FM2) experiment.",
  "Microgravity and normal-gravity results could bound what occurs at intermediate gravity levels.",
  "The six experiments in the ACME project featured flames of gaseous fuels and were all conducted with the same modular set of ACME hardware in the Combustion Integrated Rack (CIR).",
  "FLEX, FLEX-2, and the Cool Flames Investigation (CFI) each featured burning droplets of liquid fuel and were conducted with the Multi-user Droplet Combustion Apparatus (MDCA) in the CIR.",
  "BASS, BASS-II, the Smoke Point In Co-flow Experiment (SPICE), and the Structure & Liftoff In Combustion Experiment (SLICE) collectively featured both solid and gaseous fuels. Each of these investigations was conducted within the Microgravity Science Glovebox (MSG) using the modular fan-driven flow duct built for SPICE.",
];

export const BRIEF_TEXT = BRIEF_ELEMENTS.join(" ");

/** Parts of the brief that other modules quote by name. */
export const BRIEF_FLEX_SENTENCE =
  "Suppression was studied in the Flame Extinguishment Experiment (FLEX) through dilution of the chamber atmosphere with carbon dioxide and helium, both of which suppress fire.";
export const BRIEF_SENTENCE =
  "Fine-water-mist extinguishers developed for use on the ISS have practical applications here on Earth, and NASA technology has similarly led to improvements in terrestrial smoke detection and firefighter gear, including protective clothing and air tanks.";

/** Landing-page opener. The brief does not name the commander, and neither do we. */
export const ARTEMIS_QUOTE =
  "[If] you want to get somebody’s attention really quick, make the fire alarm go off in your spacecraft when you’re still about 80,000 miles from home.";
export const ARTEMIS_ATTRIBUTION = "Artemis II commander, quoted in the NASA Space Apps challenge brief";

/**
 * A brief quote as displayed: "…" only where the quote is cut out of a longer
 * sentence of its element.
 */
export function displayBriefQuote(quote: string): string {
  const element = BRIEF_ELEMENTS.find((e) => e.includes(quote));
  if (!element) throw new Error(`Not in the brief text: ${quote}`);
  const at = element.indexOf(quote);
  const before = element.slice(0, at);
  const after = element.slice(at + quote.length);
  const cutStart = before !== "" && !/[.!?]\s$/.test(before);
  const cutEnd = !/^[.!?]?(\s|$)/.test(after);
  return `${cutStart ? "…" : ""}${quote}${cutEnd ? "…" : ""}`;
}
