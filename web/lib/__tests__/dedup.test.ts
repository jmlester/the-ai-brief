import { describe, expect, it } from "vitest";

// Re-implement the dedup logic from route.ts for unit testing
function normalizeTitle(title: string) {
  const lower = title.toLowerCase();
  const cleaned = lower.replace(/[^a-z0-9\s]/g, " ");
  const parts = cleaned.split(" ").filter((part) => part.length > 2);
  return parts.join(" ");
}

type Item = { title: string; publishedAt: string; source: string };

function dedupe(items: Item[]) {
  const seen = new Map<string, Item>();
  for (const item of items) {
    const key = normalizeTitle(item.title);
    const existing = seen.get(key);
    if (!existing || new Date(item.publishedAt) > new Date(existing.publishedAt)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

describe("dedup", () => {
  it("removes exact title duplicates", () => {
    const items: Item[] = [
      { title: "OpenAI launches GPT-5", publishedAt: "2025-01-01T12:00:00Z", source: "A" },
      { title: "OpenAI launches GPT-5", publishedAt: "2025-01-01T14:00:00Z", source: "B" }
    ];
    const result = dedupe(items);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("B"); // keeps more recent
  });

  it("removes near-duplicate titles differing by punctuation", () => {
    const items: Item[] = [
      { title: "OpenAI launches GPT-5!", publishedAt: "2025-01-01T12:00:00Z", source: "A" },
      { title: "OpenAI launches GPT-5", publishedAt: "2025-01-01T14:00:00Z", source: "B" }
    ];
    const result = dedupe(items);
    expect(result).toHaveLength(1);
  });

  it("keeps distinct stories", () => {
    const items: Item[] = [
      { title: "OpenAI launches GPT-5", publishedAt: "2025-01-01T12:00:00Z", source: "A" },
      { title: "Google releases Gemini 2", publishedAt: "2025-01-01T12:00:00Z", source: "B" }
    ];
    const result = dedupe(items);
    expect(result).toHaveLength(2);
  });

  it("handles empty array", () => {
    expect(dedupe([])).toEqual([]);
  });

  it("reports correct dedup count", () => {
    const items: Item[] = [
      { title: "OpenAI launches GPT-5 model", publishedAt: "2025-01-01T12:00:00Z", source: "X" },
      { title: "OpenAI launches GPT-5 model", publishedAt: "2025-01-01T13:00:00Z", source: "Y" },
      { title: "OpenAI launches GPT-5 model", publishedAt: "2025-01-01T14:00:00Z", source: "Z" },
      { title: "Google releases Gemini update", publishedAt: "2025-01-01T12:00:00Z", source: "X" }
    ];
    const deduped = dedupe(items);
    const dedupCount = items.length - deduped.length;
    expect(deduped).toHaveLength(2);
    expect(dedupCount).toBe(2);
  });
});
