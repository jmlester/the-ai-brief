import { BriefSections } from "./types";

function commit(key: string | null, buffer: string[], sections: Record<string, string[]>) {
  if (!key || buffer.length === 0) return;
  sections[key] = buffer;
}

function valueFrom(line: string, label: string) {
  const idx = line.toLowerCase().indexOf(label.toLowerCase());
  if (idx === -1) return line.trim();
  return line.slice(idx + label.length).replace(/^[:\s-]+/, "").trim();
}

function parseSourceAndURL(line: string) {
  const source = valueFrom(line, "Source");
  const urlMatch = line.match(/https?:\/\/\S+/i);
  return {
    source: source.replace(/https?:\/\/\S+/i, "").trim(),
    url: urlMatch ? urlMatch[0] : ""
  };
}

function parseSignals(lines: string[]) {
  const groups: BriefSections["otherStories"] = [];
  let currentTheme = "";
  let currentItems: { story: string; source: string; url: string }[] = [];
  let currentStory = "";
  let currentSource = "";
  let currentURL = "";

  const pushGroup = () => {
    const theme = currentTheme.trim();
    if (!theme) return;
    if (currentStory.trim()) {
      currentItems.push({
        story: currentStory.trim(),
        source: currentSource,
        url: currentURL
      });
    }
    groups.push({ theme, items: currentItems });
    currentTheme = "";
    currentItems = [];
    currentStory = "";
    currentSource = "";
    currentURL = "";
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    if (lower.includes("theme:")) {
      pushGroup();
      currentTheme = valueFrom(trimmed, "Theme");
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("•")) {
      if (currentStory.trim()) {
        currentItems.push({
          story: currentStory.trim(),
          source: currentSource,
          url: currentURL
        });
        currentStory = "";
        currentSource = "";
        currentURL = "";
      }
      const cleaned = trimmed.replace(/^[-•]\s*/, "");
      currentStory = cleaned.toLowerCase().includes("story:")
        ? valueFrom(cleaned, "Story")
        : cleaned;
      continue;
    }
    if (lower.includes("story:")) {
      currentStory = valueFrom(trimmed, "Story");
      continue;
    }
    if (lower.includes("source:")) {
      const parsed = parseSourceAndURL(trimmed);
      currentSource = parsed.source;
      if (parsed.url) currentURL = parsed.url;
      continue;
    }
    if (lower.includes("url:")) {
      currentURL = valueFrom(trimmed, "URL");
      continue;
    }
    if (trimmed) {
      currentStory = currentStory ? `${currentStory} ${trimmed}` : trimmed;
    }
  }

  pushGroup();
  return groups;
}

function parseDeepDives(lines: string[]) {
  const items: BriefSections["deepDives"] = [];
  let currentStory = "";
  let currentSource = "";
  let currentURL = "";

  const commitDive = () => {
    if (!currentStory.trim()) return;
    items.push({
      story: currentStory.trim(),
      source: currentSource,
      url: currentURL
    });
    currentStory = "";
    currentSource = "";
    currentURL = "";
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed.startsWith("- ") || trimmed.startsWith("•")) {
      commitDive();
      const cleaned = trimmed.replace(/^[-•]\s*/, "");
      currentStory = cleaned.toLowerCase().includes("story:")
        ? valueFrom(cleaned, "Story")
        : cleaned;
      continue;
    }
    if (lower.includes("story:")) {
      currentStory = valueFrom(trimmed, "Story");
      continue;
    }
    if (lower.includes("source:")) {
      const parsed = parseSourceAndURL(trimmed);
      currentSource = parsed.source;
      if (parsed.url) currentURL = parsed.url;
      continue;
    }
    if (lower.includes("url:")) {
      currentURL = valueFrom(trimmed, "URL");
      continue;
    }
    if (trimmed) {
      currentStory = currentStory ? `${currentStory} ${trimmed}` : trimmed;
    }
  }

  commitDive();
  return items;
}

function parsePromptPack(lines: string[]) {
  const items: BriefSections["promptStudio"] = [];
  let current = {
    task: "",
    prompt: "",
    bestFor: "",
    inputFormat: "",
    outputFormat: ""
  };

  const commitPrompt = () => {
    if (!current.task && !current.prompt && !current.bestFor) return;
    items.push({ ...current });
    current = { task: "", prompt: "", bestFor: "", inputFormat: "", outputFormat: "" };
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const cleaned = trimmed.replace(/^\d+[)\.]\s*/, "");
    const lower = cleaned.toLowerCase();
    if (lower.includes("task:")) {
      commitPrompt();
      current.task = valueFrom(cleaned, "Task");
      continue;
    }
    if (lower.includes("prompt:")) {
      current.prompt = valueFrom(cleaned, "Prompt");
      continue;
    }
    if (lower.includes("best for:")) {
      current.bestFor = valueFrom(cleaned, "Best For");
      continue;
    }
    if (lower.includes("input format:")) {
      current.inputFormat = valueFrom(cleaned, "Input Format");
      continue;
    }
    if (lower.includes("output format:")) {
      current.outputFormat = valueFrom(cleaned, "Output Format");
      continue;
    }
    if (trimmed) {
      current.prompt = current.prompt ? `${current.prompt} ${trimmed}` : trimmed;
    }
  }

  commitPrompt();
  return items;
}

export function parseBrief(text: string): BriefSections {
  const sections: Record<string, string[]> = {};
  let currentKey: string | null = null;
  let buffer: string[] = [];
  const lines = text.split(/\r?\n/);

  for (const raw of lines) {
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("headline") || lower.startsWith("topline")) {
      commit(currentKey, buffer, sections);
      currentKey = "headline";
      buffer = [];
      continue;
    }
    if (
      lower.startsWith("summary") ||
      lower.startsWith("other headlines summary") ||
      lower.startsWith("signal summary")
    ) {
      commit(currentKey, buffer, sections);
      currentKey = "summary";
      buffer = [];
      continue;
    }
    if (lower.startsWith("other stories") || lower.startsWith("signals")) {
      commit(currentKey, buffer, sections);
      currentKey = "signals";
      buffer = [];
      continue;
    }
    if (lower.startsWith("deep dives")) {
      commit(currentKey, buffer, sections);
      currentKey = "deepdives";
      buffer = [];
      continue;
    }
    if (lower.startsWith("prompt studio")) {
      commit(currentKey, buffer, sections);
      currentKey = "promptpack";
      buffer = [];
      continue;
    }
    if (lower.startsWith("tools & launches") || lower.startsWith("tools and launches")) {
      commit(currentKey, buffer, sections);
      currentKey = "toolsandlaunches";
      buffer = [];
      continue;
    }
    if (lower.startsWith("quick links") || lower.startsWith("also worth reading") || lower.startsWith("worth reading")) {
      commit(currentKey, buffer, sections);
      currentKey = "quicklinks";
      buffer = [];
      continue;
    }

    if (trimmed) buffer.push(trimmed);
  }

  commit(currentKey, buffer, sections);

  const headline = (sections.headline ?? []).join(" ").trim();
  const summary = (sections.summary ?? []).join(" ").trim();
  const otherStories = parseSignals(sections.signals ?? []);
  const deepDives = parseDeepDives(sections.deepdives ?? []);
  const promptStudio = parsePromptPack(sections.promptpack ?? []);
  const toolsAndLaunches = parseDeepDives(sections.toolsandlaunches ?? []);
  const quickLinks = parseDeepDives(sections.quicklinks ?? []);

  return {
    headline: headline || text.trim(),
    summary,
    otherStories,
    deepDives,
    promptStudio,
    toolsAndLaunches,
    quickLinks
  };
}
