import { BriefSections, Source } from "./types";

const SETTINGS_KEY = "dailyplaybook.settings";
const SOURCES_KEY = "dailyplaybook.sources";
const BRIEF_KEY = "dailyplaybook.brief";

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
