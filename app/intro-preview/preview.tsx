"use client";
// Temporary test page for the intro. Removed when the intro is mounted on the home page.
// Click to replay; ?t=4.2 freezes the timeline at that second.
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Intro } from "@/components/intro/intro";

export function IntroPreview() {
  const t = useSearchParams().get("t");
  const [run, setRun] = useState(0);
  return (
    <div onClick={() => setRun((n) => n + 1)}>
      <Intro key={run} freezeAt={t === null ? undefined : Number(t)} />
    </div>
  );
}
