import { ArchivedBrief, BriefSections, SavedPrompt, Source, SourceResult } from "./types";

const SETTINGS_KEY = "dailyplaybook.settings";
const SOURCES_KEY = "dailyplaybook.sources";
const BRIEF_KEY = "dailyplaybook.brief";
const ARCHIVE_KEY = "dailyplaybook.archive";
const PROMPTS_KEY = "dailyplaybook.prompts";
const COLLAPSE_KEY = "dailyplaybook.collapse";
const OFFLINE_BRIEFS_KEY = "dailyplaybook.offlineBriefs";
const OFFLINE_SOURCES_KEY = "dailyplaybook.offlineSources";
const MAX_ARCHIVE = 30;
const MAX_OFFLINE = 3;

export type StoredSettings = {
  apiKey: string;
  model: string;
  tone: string;
  focusTopics: string;
  timeWindowHours: number;
  theme: "system" | "light" | "dark";
};

function safeJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function loadSettings() {
  if (typeof window === "undefined") return null;
  return safeJSON<StoredSettings>(window.localStorage.getItem(SETTINGS_KEY));
}

export function saveSettings(settings: StoredSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSources() {
  if (typeof window === "undefined") return null;
  return safeJSON<Source[]>(window.localStorage.getItem(SOURCES_KEY));
}

export function saveSources(sources: Source[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
}

export function loadBrief() {
  if (typeof window === "undefined") return null;
  return safeJSON<BriefSections>(window.localStorage.getItem(BRIEF_KEY));
}

export function saveBrief(brief: BriefSections) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BRIEF_KEY, JSON.stringify(brief));
}

// Archive
export function loadArchive(): ArchivedBrief[] {
  if (typeof window === "undefined") return [];
  return safeJSON<ArchivedBrief[]>(window.localStorage.getItem(ARCHIVE_KEY)) ?? [];
}

export function saveArchive(archive: ArchivedBrief[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive.slice(0, MAX_ARCHIVE)));
}

export function archiveBrief(brief: BriefSections, sourceResults: SourceResult[], coverageSummary: string) {
  const archive = loadArchive();
  const entry: ArchivedBrief = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `arc-${Date.now()}`,
    brief,
    sourceResults,
    coverageSummary,
    createdAt: new Date().toISOString()
  };
  archive.unshift(entry);
  saveArchive(archive);
  return entry;
}

export function deleteArchivedBrief(id: string) {
  const archive = loadArchive().filter((a) => a.id !== id);
  saveArchive(archive);
  return archive;
}

// Saved Prompts
export function loadSavedPrompts(): SavedPrompt[] {
  if (typeof window === "undefined") return [];
  return safeJSON<SavedPrompt[]>(window.localStorage.getItem(PROMPTS_KEY)) ?? [];
}

export function saveSavedPrompts(prompts: SavedPrompt[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}

export function pinPrompt(prompt: Omit<SavedPrompt, "id" | "savedAt">): SavedPrompt {
  const prompts = loadSavedPrompts();
  const entry: SavedPrompt = {
    ...prompt,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `p-${Date.now()}`,
    savedAt: new Date().toISOString()
  };
  prompts.unshift(entry);
  saveSavedPrompts(prompts);
  return entry;
}

export function removeSavedPrompt(id: string) {
  const prompts = loadSavedPrompts().filter((p) => p.id !== id);
  saveSavedPrompts(prompts);
  return prompts;
}

// Collapse state
export function loadCollapseState(): Record<string, boolean> | null {
  if (typeof window === "undefined") return null;
  return safeJSON<Record<string, boolean>>(window.localStorage.getItem(COLLAPSE_KEY));
}

export function saveCollapseState(state: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state));
}

// Offline cache
export type OfflineBrief = {
  brief: BriefSections;
  sourceResults: SourceResult[];
  coverageSummary: string;
  cachedAt: string;
};

export function loadOfflineBriefs(): OfflineBrief[] {
  if (typeof window === "undefined") return [];
  return safeJSON<OfflineBrief[]>(window.localStorage.getItem(OFFLINE_BRIEFS_KEY)) ?? [];
}

export function cacheOfflineBrief(brief: BriefSections, sourceResults: SourceResult[], coverageSummary: string) {
  if (typeof window === "undefined") return;
  const cache = loadOfflineBriefs();
  cache.unshift({ brief, sourceResults, coverageSummary, cachedAt: new Date().toISOString() });
  window.localStorage.setItem(OFFLINE_BRIEFS_KEY, JSON.stringify(cache.slice(0, MAX_OFFLINE)));
}

export function loadOfflineSources(): Source[] {
  if (typeof window === "undefined") return [];
  return safeJSON<Source[]>(window.localStorage.getItem(OFFLINE_SOURCES_KEY)) ?? [];
}

export function cacheOfflineSources(sources: Source[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OFFLINE_SOURCES_KEY, JSON.stringify(sources));
}
