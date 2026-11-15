"use client";
// Shared "show part of a long list" control, used wherever a page would otherwise
// print every row at once. Items past the limit stay in the HTML with the `hidden`
// attribute, so nothing is removed from the page; it is only not shown yet.
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Tracks how many of `total` items are visible. After "more" it moves keyboard focus
 * to the first newly shown item, so the reader continues from where they were.
 */
export function useReveal(total: number, initial: number, step: number) {
  const [limit, setLimit] = useState(initial);
  const list = useRef<HTMLElement | null>(null);
  const listRef = useCallback((el: HTMLElement | null) => {
    list.current = el;
  }, []);
  const focusFrom = useRef<number | null>(null);
  const shown = Math.min(limit, total);

  useEffect(() => {
    if (focusFrom.current === null) return;
    const item = list.current?.querySelectorAll<HTMLElement>("[data-reveal-item]")[focusFrom.current];
    focusFrom.current = null;
    item?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
  }, [limit]);

  const grow = (to: number) => {
    focusFrom.current = shown;
    setLimit(to);
  };
  const state = {
    shown,
    isHidden: (index: number) => index >= limit,
    more: () => grow(limit + step),
    all: () => grow(total),
    fewer: () => setLimit(initial),
    initial,
    step,
    total,
  };
  // The ref is returned apart from the state: put it on the element that contains the items.
  return [state, listRef] as const;
}

/** Class for an item that fades in when revealed. Still under reduced motion. */
export const revealItemClass = "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300";

export function RevealControls({
  reveal,
  moreLabel = "Load more",
  className,
}: {
  reveal: ReturnType<typeof useReveal>[0];
  moreLabel?: string;
  className?: string;
}) {
  const { shown, total, initial, step } = reveal;
  if (total <= initial) return null;
  const left = total - shown;
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ""}`}>
      {left > 0 && (
        <>
          {left > step && (
            <Button type="button" variant="outline" onClick={reveal.more}>
              {moreLabel}
            </Button>
          )}
          <Button type="button" variant={left > step ? "ghost" : "outline"} onClick={reveal.all}>
            Show all {total}
          </Button>
        </>
      )}
      {left === 0 && (
        <Button type="button" variant="ghost" onClick={reveal.fewer}>
          Show fewer
        </Button>
      )}
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        Showing {shown} of {total}
      </p>
    </div>
  );
}
