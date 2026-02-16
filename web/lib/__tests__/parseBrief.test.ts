import { describe, expect, it } from "vitest";
import { parseBrief } from "../parseBrief";

describe("parseBrief", () => {
  const sampleText = `Headline:
AI companies race to ship agents

Summary:
Multiple companies announced agent frameworks this week. The ecosystem is rapidly evolving with new tools and platforms emerging daily. Safety and evaluation remain key concerns.

Other Stories:
- Theme: Agent Frameworks
  - Story: OpenAI launches new agent SDK
    Source: OpenAI Blog
    URL: https://openai.com/blog/agent-sdk
  - Story: Anthropic releases Claude agent tools
    Source: Anthropic News
    URL: https://anthropic.com/news/agent-tools
- Theme: Policy Updates
  - Story: EU finalizes AI Act implementation timeline
    Source: Reuters
    URL: https://reuters.com/ai-act

Deep Dives:
- Story: Deep analysis of transformer scaling laws shows diminishing returns at extreme scale
  Source: ArXiv
  URL: https://arxiv.org/abs/2024.12345
- Story: New benchmark reveals gaps in LLM reasoning
  Source: Papers Daily
  URL: https://papersdaily.com/reasoning-bench

Prompt Studio:
1) Task: Code review assistant
   Prompt: Review this code for bugs, security issues, and suggest improvements
   Best For: Developers
   Input Format: Paste code snippet
   Output Format: Bulleted list of issues
2) Task: Meeting summarizer
   Prompt: Summarize this meeting transcript into key decisions and action items
   Best For: Managers
   Input Format: Meeting transcript
   Output Format: Structured summary

Tomorrow's Radar:
- Google DeepMind is expected to release Gemini 2.5 benchmarks by end of week.
- The EU AI Act compliance deadline approaches for high-risk systems in March.
- Meta's next LLaMA model may ship with native tool-use capabilities.`;

  it("parses headline", () => {
    const result = parseBrief(sampleText);
    expect(result.headline).toBe("AI companies race to ship agents");
  });

  it("parses summary", () => {
    const result = parseBrief(sampleText);
    expect(result.summary).toContain("Multiple companies announced");
    expect(result.summary).toContain("Safety and evaluation");
  });

  it("parses other stories with themes", () => {
    const result = parseBrief(sampleText);
    expect(result.otherStories).toHaveLength(2);
    expect(result.otherStories[0].theme).toBe("Agent Frameworks");
    expect(result.otherStories[0].items).toHaveLength(2);
    expect(result.otherStories[0].items[0].story).toContain("OpenAI launches");
    expect(result.otherStories[0].items[0].source).toBe("OpenAI Blog");
    expect(result.otherStories[0].items[0].url).toBe("https://openai.com/blog/agent-sdk");
    expect(result.otherStories[1].theme).toBe("Policy Updates");
    expect(result.otherStories[1].items).toHaveLength(1);
  });

  it("parses deep dives", () => {
    const result = parseBrief(sampleText);
    expect(result.deepDives).toHaveLength(2);
    expect(result.deepDives[0].story).toContain("transformer scaling");
    expect(result.deepDives[0].source).toBe("ArXiv");
    expect(result.deepDives[1].url).toBe("https://papersdaily.com/reasoning-bench");
  });

  it("parses prompt studio", () => {
    const result = parseBrief(sampleText);
    expect(result.promptStudio).toHaveLength(2);
    expect(result.promptStudio[0].task).toBe("Code review assistant");
    expect(result.promptStudio[0].prompt).toContain("Review this code");
    expect(result.promptStudio[0].bestFor).toBe("Developers");
    expect(result.promptStudio[1].task).toBe("Meeting summarizer");
  });

  it("parses radar items", () => {
    const result = parseBrief(sampleText);
    expect(result.radar).toHaveLength(3);
    expect(result.radar[0]).toContain("Google DeepMind");
    expect(result.radar[2]).toContain("LLaMA");
  });

  it("handles empty input", () => {
    const result = parseBrief("");
    expect(result.headline).toBe("");
    expect(result.otherStories).toEqual([]);
    expect(result.deepDives).toEqual([]);
    expect(result.promptStudio).toEqual([]);
    expect(result.radar).toEqual([]);
  });

  it("falls back headline to full text if no headline section", () => {
    const result = parseBrief("Just some random text without any sections");
    expect(result.headline).toBe("Just some random text without any sections");
  });
});
