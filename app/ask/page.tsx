"use client";
// Person B will build this page.
import { useState } from "react";
import type { AskRequest, AskResponse } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: AskRequest = { question };
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setResult((await res.json()) as AskResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ask the evidence</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the investigations"
        />
        <Button type="submit" disabled={loading || !question.trim()}>
          {loading ? "Asking…" : "Ask"}
        </Button>
      </form>
      {error && <p className="text-destructive">{error}</p>}
      {result && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Status: {result.status}</p>
          {result.answer.map((a, i) => (
            <div key={i} className="space-y-1">
              <p>{a.sentence}</p>
              <ul className="text-sm text-muted-foreground">
                {a.citations.map((c) => (
                  <li key={c.docId}>
                    [{c.docId}] {c.title} — “{c.quote}”{" "}
                    {c.verified ? "(verified)" : "(unverified)"}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
