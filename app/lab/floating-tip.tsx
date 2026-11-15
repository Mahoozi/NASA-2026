"use client";
// Person A — one tooltip for the Lab's chart points and grid cells. Fixed-positioned
// from the anchor's viewport rectangle and clamped to the viewport, so it is not
// clipped by the table's scroll container and never leaves the screen at 360 px.
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import type { Investigation, Run } from "../../lib/schema";
import { cellTip, runTip } from "./run-details";

export type Anchor = { left: number; right: number; top: number; bottom: number };
export type Size = { w: number; h: number };

// When the last touch began. Module-level on purpose: Recharts can re-create a point
// between a tap's pointer events and the click that follows it. A tap only toggles a
// tooltip; the click it also produces must not trigger the click action as well.
let lastTouchAt = -Infinity;
export const noteTouch = () => {
  lastTouchAt = performance.now();
};
export const justTouched = () => performance.now() - lastTouchAt < 1000;

const MARGIN = 8;
const GAP = 6;

export function anchorOf(el: Element): Anchor {
  const r = el.getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
}

/** Top-left for a tip of `size`: centred over the anchor, above it when there is room, kept inside the viewport. */
export function placeTip(anchor: Anchor, size: Size, view: Size): { left: number; top: number } {
  const centre = (anchor.left + anchor.right) / 2;
  const left = Math.max(MARGIN, Math.min(centre - size.w / 2, view.w - size.w - MARGIN));
  const above = anchor.top - size.h - GAP;
  const top = above >= MARGIN ? above : Math.max(MARGIN, Math.min(anchor.bottom + GAP, view.h - size.h - MARGIN));
  return { left, top };
}

/** Escape, a pointer press outside `[data-tip-root=<root>]` or the tip, scrolling or resizing close it. */
export function useDismiss(open: boolean, root: string, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const down = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.(`[data-tip-root="${root}"]`)) onClose();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", down);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", down);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open, root, onClose]);
}

export function FloatingTip({
  anchor,
  id,
  root,
  interactive = false,
  children,
}: {
  anchor: Anchor;
  id: string;
  root: string;
  /** Receives pointer events (the touch tooltip holds a button). */
  interactive?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const { left, top } = placeTip(anchor, { w: width, h: height }, {
      w: document.documentElement.clientWidth,
      h: window.innerHeight,
    });
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = "visible";
  }, [anchor]);
  return (
    <div
      ref={ref}
      id={id}
      role="tooltip"
      data-tip-root={root}
      style={{ position: "fixed", left: 0, top: 0, visibility: "hidden", maxWidth: "min(20rem, calc(100vw - 16px))" }}
      className={cn(
        "z-50 flex flex-col gap-0.5 rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md",
        !interactive && "pointer-events-none",
      )}
    >
      {children}
    </div>
  );
}

export function RunTipBody({ run, investigations }: { run: Run; investigations: Investigation[] }) {
  const t = runTip(run, investigations);
  return (
    <>
      <span className="font-medium">{t.title}</span>
      {t.lines.map((l) => (
        <span key={l.label}>
          <span className="text-muted-foreground">{l.label}: </span>
          {l.value}
        </span>
      ))}
    </>
  );
}

export function CellTipBody({ label, runs, investigations }: { label: string; runs: Run[]; investigations: Investigation[] }) {
  const t = cellTip(runs, investigations);
  return (
    <>
      <span className="font-medium">{label}</span>
      {t.empty ? (
        <span>{t.text}</span>
      ) : (
        <>
          <span>{t.count}</span>
          <span>
            <span className="text-muted-foreground">From: </span>
            {t.investigations}
          </span>
          <span>
            <span className="text-muted-foreground">Tests: </span>
            {t.testIds}
          </span>
        </>
      )}
    </>
  );
}
