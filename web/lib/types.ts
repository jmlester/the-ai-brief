export type SourceType = "website" | "newsletter" | "rss" | "social";

export type Source = {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  category: string;
  summary: string;
  tags: string[];
  ingestURL?: string;
  isEnabled?: boolean;
  isPreferred?: boolean;
  isCustom?: boolean;
  allowScrape?: boolean;
};

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  isPlaceholder: boolean;
  author?: string | null;
  imageURL?: string | null;
};

export type SourceResult = {
  sourceId: string;
  sourceName: string;
  status: "success" | "empty" | "failed" | "queued";
  count?: number;
  message?: string;
};

export type BriefSections = {
  headline: string;
  summary: string;
  otherStories: {
    theme: string;
    items: { story: string; source: string; url: string }[];
  }[];
  deepDives: { story: string; source: string; url: string }[];
  promptStudio: {
    task: string;
    prompt: string;
    bestFor: string;
    inputFormat: string;
    outputFormat: string;
  }[];
  radar: string[];
};

export type ArchivedBrief = {
  id: string;
  brief: BriefSections;
  sourceResults: SourceResult[];
  coverageSummary: string;
  createdAt: string;
};

export type SavedPrompt = {
  id: string;
  task: string;
  prompt: string;
  bestFor: string;
  inputFormat: string;
  outputFormat: string;
  savedAt: string;
};

export type StreamingPhase =
  | "idle"
  | "connecting"
  | "collecting"
  | "streaming"
  | "parsing"
  | "ready"
  | "error"
  | "retrying";

export type ModelPreset = {
  name: string;
  model: string;
  tone: string;
  focusTopics: string;
  timeWindowHours: number;
};
