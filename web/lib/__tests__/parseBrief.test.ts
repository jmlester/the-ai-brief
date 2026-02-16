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

Tools & Launches:
- Story: Google releases Gemini 2.5 Flash with native tool-use support
  Source: Google AI Blog
  URL: https://ai.googleblog.com/gemini-flash
- Story: Hugging Face launches open-source agent toolkit
  Source: Hugging Face
  URL: https://huggingface.co/agent-toolkit
- Story: Vercel ships AI SDK 4.0 with streaming improvements
  Source: Vercel Blog
  URL: https://vercel.com/blog/ai-sdk-4

Quick Links:
- Story: EU AI Act compliance deadline approaches for high-risk systems
  Source: Reuters
  URL: https://reuters.com/eu-ai-act-deadline
- Story: Stanford releases new benchmark for LLM code generation
  Source: Stanford HAI
  URL: https://hai.stanford.edu/code-bench
- Story: Meta publishes research on efficient fine-tuning methods
  Source: Meta AI
  URL: https://ai.meta.com/fine-tuning`;

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

  it("parses tools and launches", () => {
    const result = parseBrief(sampleText);
    expect(result.toolsAndLaunches).toHaveLength(3);
    expect(result.toolsAndLaunches[0].story).toContain("Gemini 2.5 Flash");
    expect(result.toolsAndLaunches[0].source).toBe("Google AI Blog");
    expect(result.toolsAndLaunches[0].url).toBe("https://ai.googleblog.com/gemini-flash");
    expect(result.toolsAndLaunches[2].story).toContain("Vercel");
  });

  it("parses quick links", () => {
    const result = parseBrief(sampleText);
    expect(result.quickLinks).toHaveLength(3);
    expect(result.quickLinks[0].story).toContain("EU AI Act");
    expect(result.quickLinks[0].source).toBe("Reuters");
    expect(result.quickLinks[0].url).toBe("https://reuters.com/eu-ai-act-deadline");
    expect(result.quickLinks[2].story).toContain("Meta");
  });

  it("handles empty input", () => {
    const result = parseBrief("");
    expect(result.headline).toBe("");
    expect(result.otherStories).toEqual([]);
    expect(result.deepDives).toEqual([]);
    expect(result.promptStudio).toEqual([]);
    expect(result.toolsAndLaunches).toEqual([]);
    expect(result.quickLinks).toEqual([]);
  });

  it("falls back headline to full text if no headline section", () => {
    const result = parseBrief("Just some random text without any sections");
    expect(result.headline).toBe("Just some random text without any sections");
  });

  it("handles markdown-formatted section headings", () => {
    const mdText = `## Headline:
AI agents take off

## Summary:
Big week for agents.

## Other Stories:
- Theme: Infra
  - Story: Cloud costs rise
    Source: TechCrunch
    URL: https://techcrunch.com/cloud

## Deep Dives:
- Story: Reasoning models explained
  Source: ArXiv
  URL: https://arxiv.org/reasoning

## Prompt Studio:
1) Task: Summarizer
   Prompt: Summarize this
   Best For: Everyone
   Input Format: Text
   Output Format: Bullets

## Tools & Launches:
- Story: New vector DB released
  Source: Pinecone Blog
  URL: https://pinecone.io/new

## Quick Links:
- Story: AI hiring surges in Q1
  Source: Bloomberg
  URL: https://bloomberg.com/ai-hiring`;

    const result = parseBrief(mdText);
    expect(result.headline).toBe("AI agents take off");
    expect(result.summary).toBe("Big week for agents.");
    expect(result.otherStories).toHaveLength(1);
    expect(result.deepDives).toHaveLength(1);
    expect(result.promptStudio).toHaveLength(1);
    expect(result.toolsAndLaunches).toHaveLength(1);
    expect(result.toolsAndLaunches[0].story).toContain("vector DB");
    expect(result.quickLinks).toHaveLength(1);
    expect(result.quickLinks[0].story).toContain("AI hiring");
  });
});
