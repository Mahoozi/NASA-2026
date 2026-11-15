"use client";
// Person A — opens the browser's print dialog (which also saves as PDF). Screen only.
// A plain button, styled like the site's outline button, so the report view has no
// dependency beyond React and an icon.
import { PrinterIcon } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium whitespace-nowrap hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
    >
      <PrinterIcon aria-hidden className="size-4" />
      Print or save as PDF
    </button>
  );
}
