/**
 * answer(), tested through its exported signature. Only the no-key path is
 * tested here: it must fail before any model call or retrieval.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { answer, MissingApiKeyError } from "./ask";

afterEach(() => vi.unstubAllEnvs());

describe("answer", () => {
  it("throws MissingApiKeyError when OPENAI_API_KEY is not set", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(answer({ question: "What did BASS-II burn?" })).rejects.toBeInstanceOf(
      MissingApiKeyError,
    );
  });
});
