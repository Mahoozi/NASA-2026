// Person A — the gap chart's fixed oxygen axis and what to say when the scenario
// falls off it. 10–36% keeps the empty region above the data visible.
export const Y_DOMAIN: [number, number] = [10, 36];

/** True when the scenario's oxygen is outside the fixed axis. */
export const o2OffAxis = (o2: number | undefined): o2 is number =>
  o2 !== undefined && (o2 < Y_DOMAIN[0] || o2 > Y_DOMAIN[1]);

/** Caption sentence for an off-axis oxygen; null when it is on the axis or unset. */
export function o2OffAxisNote(o2: number | undefined): string | null {
  return o2OffAxis(o2)
    ? `Your scenario's oxygen, ${o2}%, is outside the ${Y_DOMAIN[0]}–${Y_DOMAIN[1]}% range shown, so no scenario marker is drawn for it.`
    : null;
}
