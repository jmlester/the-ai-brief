import { describe, expect, it } from "vitest";
import { formatBriefMarkdown, formatBriefPlainText, formatBriefHTML } from "../formatBrief";
import { BriefSections } from "../types";

const sampleBrief: BriefSections = {
  headline: "AI Agents Go Mainstream",
  summary: "This week saw a wave of agent framework releases.",
  otherStories: [
    {
      theme: "Frameworks",
      items: [
        { story: "OpenAI SDK launched", source: "OpenAI Blog", url: "https://openai.com/sdk" },
        { story: "LangChain v2 released", source: "LangChain", url: "" }
      ]
    }
  ],
  deepDives: [
    { story: "Scaling laws revisited", source: "ArXiv", url: "https://arxiv.org/123" }
  ],
  promptStudio: [
    {
      task: "Code Review",
      prompt: "Review this code for bugs",
      bestFor: "Developers",
      inputFormat: "Code snippet",
      outputFormat: "Bug list"
    }
  ],
  toolsAndLaunches: [
    { story: "Gemini 2.5 Flash released", source: "Google AI Blog", url: "https://ai.googleblog.com/gemini" },
    { story: "Hugging Face agent toolkit launched", source: "Hugging Face", url: "" }
  ],
  quickLinks: [
    { story: "EU AI Act deadline in March", source: "Reuters", url: "https://reuters.com/ai-act" },
    { story: "Stanford code benchmark released", source: "Stanford HAI", url: "https://hai.stanford.edu/bench" }
  ]
};

describe("formatBriefMarkdown", () => {
  it("includes headline as h2", () => {
    const md = formatBriefMarkdown(sampleBrief);
    expect(md).toContain("## AI Agents Go Mainstream");
  });

  it("includes other stories section", () => {
    const md = formatBriefMarkdown(sampleBrief);
    expect(md).toContain("## Other Stories");
    expect(md).toContain("### Frameworks");
    expect(md).toContain("OpenAI SDK launched");
  });

  it("includes deep dives", () => {
    const md = formatBriefMarkdown(sampleBrief);
    expect(md).toContain("## Deep Dives");
    expect(md).toContain("Scaling laws revisited");
  });

  it("includes prompt studio", () => {
    const md = formatBriefMarkdown(sampleBrief);
    expect(md).toContain("## Prompt Studio");
    expect(md).toContain("### Code Review");
    expect(md).toContain("**Prompt:** Review this code for bugs");
  });

  it("includes tools and launches", () => {
    const md = formatBriefMarkdown(sampleBrief);
    expect(md).toContain("## Tools & Launches");
    expect(md).toContain("Gemini 2.5 Flash released");
  });

  it("includes quick links", () => {
    const md = formatBriefMarkdown(sampleBrief);
    expect(md).toContain("## Quick Links");
    expect(md).toContain("EU AI Act deadline in March");
  });

  it("handles empty brief", () => {
    const empty: BriefSections = {
      headline: "",
      summary: "",
      otherStories: [],
      deepDives: [],
      promptStudio: [],
      toolsAndLaunches: [],
      quickLinks: []
    };
    const md = formatBriefMarkdown(empty);
    expect(md).toContain("# The AI Brief");
  });
});

describe("formatBriefPlainText", () => {
  it("includes all sections", () => {
    const text = formatBriefPlainText(sampleBrief);
    expect(text).toContain("The AI Brief");
    expect(text).toContain("AI Agents Go Mainstream");
    expect(text).toContain("Other Stories:");
    expect(text).toContain("Deep Dives:");
    expect(text).toContain("Prompt Studio:");
    expect(text).toContain("Tools & Launches:");
    expect(text).toContain("Quick Links:");
  });

  it("includes source attribution", () => {
    const text = formatBriefPlainText(sampleBrief);
    expect(text).toContain("(OpenAI Blog)");
    expect(text).toContain("(ArXiv)");
  });
});

describe("formatBriefHTML", () => {
  it("returns valid HTML document", () => {
    const html = formatBriefHTML(sampleBrief);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain("</html>");
    expect(html).toContain("<meta charset=\"utf-8\"/>");
  });

  it("includes headline in title and body", () => {
    const html = formatBriefHTML(sampleBrief);
    expect(html).toContain("<title>The AI Brief - AI Agents Go Mainstream</title>");
    expect(html).toContain("<h1>AI Agents Go Mainstream</h1>");
  });

  it("includes summary", () => {
    const html = formatBriefHTML(sampleBrief);
    expect(html).toContain("This week saw a wave of agent framework releases.");
  });

  it("renders clickable links for stories with URLs", () => {
    const html = formatBriefHTML(sampleBrief);
    expect(html).toContain('<a href="https://openai.com/sdk" target="_blank" rel="noreferrer">OpenAI SDK launched</a>');
  });

  it("renders plain text for stories without URLs", () => {
    const html = formatBriefHTML(sampleBrief);
    expect(html).toContain("LangChain v2 released");
    expect(html).not.toContain('href="">LangChain v2 released');
  });

  it("includes source badges", () => {
    const html = formatBriefHTML(sampleBrief);
    expect(html).toContain('<span class="source">OpenAI Blog</span>');
    expect(html).toContain('<span class="source">ArXiv</span>');
  });

  it("includes prompt studio cards", () => {
    const html = formatBriefHTML(sampleBrief);
    expect(html).toContain("prompt-card");
    expect(html).toContain("Code Review");
    expect(html).toContain("Review this code for bugs");
    expect(html).toContain("Developers");
  });

  it("includes tools and launches section", () => {
    const html = formatBriefHTML(sampleBrief);
    expect(html).toContain("Tools &amp; Launches");
    expect(html).toContain("Gemini 2.5 Flash released");
  });

  it("includes quick links section", () => {
    const html = formatBriefHTML(sampleBrief);
    expect(html).toContain("Quick Links");
    expect(html).toContain("EU AI Act deadline in March");
  });

  it("includes dark mode and print styles", () => {
    const html = formatBriefHTML(sampleBrief);
    expect(html).toContain("@media(prefers-color-scheme:dark)");
    expect(html).toContain("@media print");
  });

  it("escapes HTML special characters", () => {
    const xssBrief: BriefSections = {
      headline: 'Test <script>alert("xss")</script>',
      summary: "A & B > C",
      otherStories: [],
      deepDives: [],
      promptStudio: [],
      toolsAndLaunches: [],
      quickLinks: []
    };
    const html = formatBriefHTML(xssBrief);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B &gt; C");
  });
});
