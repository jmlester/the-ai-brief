import { NewsItem } from "./types";

const toneDescriptions: Record<string, string> = {
  executive: "executive, concise, outcomes-focused",
  practical: "practical, clear, with actionable takeaways",
  builder: "builder-focused, with experiments and prompts"
};

export function buildPrompt(options: {
  news: NewsItem[];
  tone: string;
  focusTopics: string;
  preferredSources: string[];
  timeWindowHours: number;
}) {
  const { news, tone, focusTopics, preferredSources, timeWindowHours } = options;
  const toneDescription = toneDescriptions[tone] ?? toneDescriptions.practical;
  const newsLines = news
    .slice(0, 20)
    .map((item) => `- ${item.title} | ${item.source} | ${item.url}`)
    .join("\n");
  const topicsLine = focusTopics.trim().length === 0 ? "None provided." : focusTopics.trim();
  const preferredLine = preferredSources.length === 0 ? "None" : preferredSources.join(", ");
  const windowLine = timeWindowHours ? `${timeWindowHours} hours` : "24 hours";

  return `Create "The AI Brief" news brief. Tone: ${toneDescription}.
Focus on the last ${windowLine} and avoid hype. Use the items below.
Focus topics: ${topicsLine}
Preferred sources: ${preferredLine}

Output format (use these exact headings and labels):
Headline:
<1 sentence>

Summary:
<3-5 sentences, readable paragraph>

Other Stories:
- Theme: <theme name>
  - Story: <1 sentence>
    Source: <source name>
    URL: <full link>
(Provide 3-4 themes.)

Deep Dives:
- Story: <1-2 sentences>
  Source: <source name>
  URL: <full link>
(Provide 2-3 items.)

Prompt Studio:
1) Task: <short task name>
   Prompt: <1-2 sentences, general daily utility prompt>
   Best For: <who/what it's best for>
   Input Format: <what the user should paste>
   Output Format: <what the model should return>
(Provide 2-3 prompts.)

Tomorrow's Radar:
- <2-3 full-sentence, concrete watch items tied to the provided sources>
(Do NOT include Source/URL lines here. Each bullet should be a single sentence. Avoid generic language. Each item must reference a specific company, product, model, or policy mentioned in the sources and be distinct from Other Stories and Deep Dives.)

Critical constraints:
- Do not ask the user for more sources or items.
- Do not include placeholders, caveats, or meta-commentary about missing data.
- If sources are limited, generalize carefully while staying grounded in the provided items.
- Avoid duplicate sentences across sections; each item should be unique.
- Ensure that each distinct source listed above is referenced at least once in Other Stories or Deep Dives so the brief reflects the full set of provided news.
- When you mention a source, use the exact source name from the list and base the sentence on the associated title and URL so it is grounded.

${newsLines.length === 0 ? "- No items available" : newsLines}`;
}
