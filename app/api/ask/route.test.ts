/**
 * POST /api/ask demo-cache fallback, tested through the route handler.
 * Only the LLM boundary (generateText from "ai") is mocked. Cached entries are
 * the real recorded ones in data/demo-cache.json.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import demoCache from "../../../data/demo-cache.json";

const { generateText } = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText,
}));

const { POST } = await import("./route");

const withContext = demoCache.find((e) => e.context !== null)!;
const plain = demoCache.find((e) => e.context === null)!;
const UNKNOWN = "What colour is the ISS galley door?";

const post = (body: unknown) =>
  POST(
    new Request("http://local/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  generateText.mockReset();
});

describe("POST /api/ask demo cache", () => {
  it("serves the cached answer with x-firebreak-source: cache when the LLM call throws", async () => {
    generateText.mockRejectedValue(new Error("network down"));
    const res = await post({ question: plain.question });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-firebreak-source")).toBe("cache");
    expect(await res.json()).toEqual(plain.response);
  });

  it("matches the cache after normalizing question case/spacing and context order", async () => {
    generateText.mockRejectedValue(new Error("timeout"));
    const ctx = withContext.context!;
    const res = await post({
      question: `  ${withContext.question.toUpperCase().replace(/ /g, "  ")}  `,
      context: {
        investigationIds: [...ctx.investigationIds!].reverse(),
        scenario: Object.fromEntries(Object.entries(ctx.scenario!).reverse()),
      },
    });
    expect(res.headers.get("x-firebreak-source")).toBe("cache");
    expect(await res.json()).toEqual(withContext.response);
  });

  it("does not use the cache for a cached question asked with a different context", async () => {
    generateText.mockRejectedValue(new Error("network down"));
    const res = await post({ question: withContext.question });
    expect(res.status).toBe(502);
    expect(res.headers.get("x-firebreak-source")).toBeNull();
  });

  it("serves the cached answer when the API key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const res = await post({ question: plain.question });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-firebreak-source")).toBe("cache");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns the live answer, not the cache, when the LLM call succeeds", async () => {
    generateText.mockResolvedValue({ output: { status: "insufficient_evidence", sentences: [] } });
    const res = await post({ question: plain.question });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-firebreak-source")).toBeNull();
    expect((await res.json()).status).toBe("insufficient_evidence");
  });

  it("still returns 503 for an unknown question when the API key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const res = await post({ question: UNKNOWN });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "OPENAI_API_KEY is not set" });
  });

  it("still returns 502 for an unknown question when the LLM call throws", async () => {
    generateText.mockRejectedValue(new Error("network down"));
    const res = await post({ question: "What did BASS-II burn?" });
    expect(res.status).toBe(502);
    expect(res.headers.get("x-firebreak-source")).toBeNull();
  });

  it("gives the LLM call a 20 s total timeout only when a cached answer can take over", async () => {
    generateText.mockResolvedValue({ output: { status: "insufficient_evidence", sentences: [] } });
    await post({ question: plain.question });
    await post({ question: "What did BASS-II burn?" });
    expect(generateText.mock.calls[0][0].timeout).toEqual({ totalMs: 20_000 });
    expect(generateText.mock.calls[1][0].timeout).toBeUndefined();
  });

  it("does not match lower-cased investigation ids or an empty scenario to a cached context", async () => {
    generateText.mockRejectedValue(new Error("network down"));
    const ctx = withContext.context!;
    const lower = await post({
      question: withContext.question,
      context: { ...ctx, investigationIds: ctx.investigationIds!.map((id) => id.toLowerCase()) },
    });
    const emptyScenario = await post({ question: plain.question, context: { scenario: {} } });
    expect(lower.status).toBe(502);
    expect(emptyScenario.status).toBe(502);
  });
});
