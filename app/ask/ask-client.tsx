"use client";
// Person B — question form and cited answer. Context comes from the URL (Lab handoff).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckIcon, ExternalLinkIcon } from "lucide-react";
import type { AskRequest, AskResponse } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { parseAskContext, scenarioSummary, shownAnswer } from "./context";

type State =
  | { kind: "idle" }
  | { kind: "loading"; question: string }
  | { kind: "done"; question: string; res: AskResponse }
  | { kind: "error"; question: string; message: string };

/** What each failure means for the person asking, by HTTP status. */
function errorMessage(status: number): string {
  if (status === 503) return "The answer service is not configured.";
  if (status === 400) return "The question could not be read. Check it is not empty and ask again.";
  return "The answer service did not return an answer. Ask again in a moment.";
}

export function AskClient({ acronyms }: { acronyms: Record<string, string> }) {
  const params = useSearchParams();
  const context = useMemo(() => parseAskContext(params), [params]);
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const loading = state.kind === "loading";

  async function ask() {
    const q = question.trim();
    if (loading) return;
    if (!q) {
      setState({ kind: "error", question: q, message: "Type a question first, then ask." });
      return;
    }
    setState({ kind: "loading", question: q });
    const body: AskRequest = context ? { question: q, context } : { question: q };
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setState({ kind: "error", question: q, message: errorMessage(res.status) });
        return;
      }
      setState({ kind: "done", question: q, res: (await res.json()) as AskResponse });
    } catch {
      setState({
        kind: "error",
        question: q,
        message: "Could not reach the answer service. Check your connection and ask again.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {context && <ContextLine context={context} acronyms={acronyms} />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="question">Your question</FieldLabel>
            <Textarea
              id="question"
              name="question"
              autoComplete="off"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void ask();
                }
              }}
              placeholder="What did BASS-II find about flame spread over PMMA at low flow speeds?…"
              rows={3}
            />
            <FieldDescription>
              Answers quote the PSI investigation pages and the PSI guide. Press Ctrl + Enter or ⌘ + Enter
              to ask.
            </FieldDescription>
          </Field>
          <div>
            <Button type="submit" disabled={loading}>
              {loading ? "Asking…" : "Ask"}
            </Button>
          </div>
        </FieldGroup>
      </form>

      <section aria-live="polite" aria-busy={loading} className="flex flex-col gap-4">
        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">
            Searching the sources and checking every quote…
          </p>
        )}
        {state.kind === "error" && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        {state.kind === "done" && <Answer question={state.question} res={state.res} acronyms={acronyms} />}
      </section>
    </div>
  );
}

function ContextLine({
  context,
  acronyms,
}: {
  context: NonNullable<AskRequest["context"]>;
  acronyms: Record<string, string>;
}) {
  const ids = context.investigationIds ?? [];
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border px-4 py-3 text-sm">
      {context.scenario && (
        <p>
          <span className="text-muted-foreground">Scenario from the Lab: </span>
          {scenarioSummary(context.scenario)}
        </p>
      )}
      {ids.length > 0 && (
        <p>
          <span className="text-muted-foreground">Focused on: </span>
          {ids.map((id, i) => (
            <span key={id}>
              {i > 0 && ", "}
              <Link href={`/investigations/${id}`} className="underline underline-offset-4 hover:decoration-2">
                {acronyms[id] ? `${acronyms[id]} (${id})` : id}
              </Link>
            </span>
          ))}
        </p>
      )}
      <Link href="/ask" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Ask without this context
      </Link>
    </div>
  );
}

function Answer({
  question,
  res,
  acronyms,
}: {
  question: string;
  res: AskResponse;
  acronyms: Record<string, string>;
}) {
  const sentences = shownAnswer(res);
  return (
    <article className="flex flex-col gap-5">
      <h2 className="text-lg font-medium text-pretty">{question}</h2>
      {sentences.length === 0 ? (
        <p className="max-w-prose">
          The sources in this app don’t answer that question. That says nothing either way
          about how a material or setup would behave; it only means none of the PSI pages or the
          PSI guide covers it.
        </p>
      ) : (
        <>
          <ol className="flex flex-col gap-6">
            {sentences.map((s, i) => (
              <li key={i} className="flex flex-col gap-2">
                <p className="max-w-prose text-base leading-relaxed">{s.sentence}</p>
                <ul className="flex flex-col gap-3 border-l-2 border-border pl-4">
                  {s.citations.map((c, j) => (
                    <li key={`${c.docId}-${j}`} className="flex flex-col gap-1 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 underline underline-offset-4 hover:decoration-2"
                        >
                          {c.title}
                          <ExternalLinkIcon aria-hidden className="size-3.5" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                        <Badge variant="secondary">
                          <CheckIcon data-icon="inline-start" aria-hidden />
                          Quote verified
                        </Badge>
                      </div>
                      <blockquote className="max-w-prose text-muted-foreground">
                        &ldquo;{c.quote}&rdquo;
                      </blockquote>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {res.investigationsMentioned.length > 0 && (
            <>
              <Separator />
              <p className="text-sm">
                <span className="text-muted-foreground">Investigations cited: </span>
                {res.investigationsMentioned.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ", "}
                    <Link href={`/investigations/${id}`} className="underline underline-offset-4 hover:decoration-2">
                      {acronyms[id] ? `${acronyms[id]} (${id})` : id}
                    </Link>
                  </span>
                ))}
              </p>
            </>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Each quote was checked word for word against the source text by the server. Answers report
        what NASA investigations did and found; they are not safety assessments.
      </p>
    </article>
  );
}
