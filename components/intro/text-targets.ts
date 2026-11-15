// Turns the on-screen word into particle destinations. The word is a real DOM element;
// its glyphs are redrawn on an off-screen canvas at the same size, sampled, and mapped
// back to the element's screen position, so the dots land exactly where the text sits.

/** Screen position of an element's text: left edge, baseline and width, in CSS pixels. */
export function measureWord(el: HTMLElement): { left: number; baseline: number; width: number } {
  // A zero-size inline-block sits on the baseline, which is the one line box
  // measurement the DOM does not expose directly.
  const probe = document.createElement("span");
  probe.style.cssText = "display:inline-block;width:0;height:0";
  el.appendChild(probe);
  const baseline = probe.getBoundingClientRect().bottom;
  el.removeChild(probe);
  const r = el.getBoundingClientRect();
  return { left: r.left, baseline, width: r.width };
}

/**
 * Sample `count` points inside the glyphs of `el`'s text.
 * Returns xyz triples in world units, given the half-extents of the view at z = 0.
 */
export function sampleWord(
  el: HTMLElement,
  count: number,
  view: { halfW: number; halfH: number },
  viewport: { width: number; height: number },
): Float32Array {
  const text = el.textContent ?? "";
  const cs = getComputedStyle(el);
  const size = parseFloat(cs.fontSize);
  const pad = Math.ceil(size * 0.2);
  const { left, baseline, width } = measureWord(el);

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width + pad * 2);
  canvas.height = Math.ceil(size * 1.5);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
  // Where the browser supports it, match the narrow width the heading is set in.
  if ("fontStretch" in ctx) (ctx as unknown as { fontStretch: string }).fontStretch = "condensed";
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  const baseY = Math.round(size * 1.1);
  ctx.fillText(text, pad, baseY);
  // If the canvas could not match the width, stretch the samples to the element's.
  const drawn = ctx.measureText(text).width || width;
  const sx = width / drawn;

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const inside: number[] = [];
  for (let y = 0; y < canvas.height; y += 2)
    for (let x = 0; x < canvas.width; x += 2)
      if (data[(y * canvas.width + x) * 4 + 3] > 140) inside.push(x, y);

  const out = new Float32Array(count * 3);
  const n = inside.length / 2;
  if (n === 0) return out;
  const unit = view.halfH / (viewport.height / 2); // world units per CSS pixel
  for (let i = 0; i < count; i++) {
    const k = Math.floor(Math.random() * n) * 2;
    const px = left + (inside[k] + Math.random() * 2 - pad) * sx;
    const py = baseline + (inside[k + 1] + Math.random() * 2 - baseY);
    out[i * 3] = (px - viewport.width / 2) * unit;
    out[i * 3 + 1] = -(py - viewport.height / 2) * unit;
    out[i * 3 + 2] = 0;
  }
  return out;
}
