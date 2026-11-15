"use client";
// Person A — keeps the Lab's Summary short: a partial view with a fade, and a button
// to read the rest. Everything stays in the page; only its height is clipped. A link
// that lands on the Summary (/brief → #summary-heading, the ranked list → #gaps)
// opens it, and so does keyboard focus moving into the clipped part.
import { type ReactNode, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

export function SummaryCollapse({ children, openOnHash }: { children: ReactNode; openOnHash: string[] }) {
  const id = useId();
  const body = useRef<HTMLDivElement>(null);
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  // null until the reader chooses; until then a matching #hash decides.
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? openOnHash.includes(hash);
  // Only offer the button when the content is taller than the partial view.
  const [clipped, setClipped] = useState(true);
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setClipped(el.scrollHeight > el.clientHeight + 4 || open));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  return (
    <div className="flex flex-col gap-3">
      <div
        id={id}
        ref={body}
        onFocusCapture={() => !open && setChoice(true)}
        className={`relative flex flex-col gap-4 ${open ? "" : "max-h-[17rem] overflow-hidden"}`}
      >
        {children}
        {!open && clipped && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-card to-transparent"
          />
        )}
      </div>
      {clipped && (
        <div>
          <Button variant="outline" aria-expanded={open} aria-controls={id} onClick={() => setChoice(!open)}>
            <ChevronDownIcon
              data-icon="inline-start"
              className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            />
            {open ? "Show less" : "Show full summary"}
          </Button>
        </div>
      )}
    </div>
  );
}
