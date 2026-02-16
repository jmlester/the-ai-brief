import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  archiveBrief,
  deleteArchivedBrief,
  loadArchive,
  loadCollapseState,
  loadSavedPrompts,
  pinPrompt,
  removeSavedPrompt,
  saveCollapseState
} from "../storage";
import { BriefSections } from "../types";

const mockBrief: BriefSections = {
  headline: "Test headline",
  summary: "Test summary",
  otherStories: [],
  deepDives: [],
  promptStudio: [],
  toolsAndLaunches: [],
  quickLinks: []
};

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("archive", () => {
    it("archives a brief and loads it back", () => {
      const entry = archiveBrief(mockBrief, [], "1 of 1");
      expect(entry.id).toBeDefined();
      expect(entry.brief.headline).toBe("Test headline");

      const archive = loadArchive();
      expect(archive).toHaveLength(1);
      expect(archive[0].brief.headline).toBe("Test headline");
    });

    it("limits archive to 30 entries", () => {
      for (let i = 0; i < 35; i++) {
        archiveBrief({ ...mockBrief, headline: `Brief ${i}` }, [], "");
      }
      const archive = loadArchive();
      expect(archive.length).toBeLessThanOrEqual(30);
    });

    it("deletes an archived brief", () => {
      const entry = archiveBrief(mockBrief, [], "");
      expect(loadArchive()).toHaveLength(1);
      deleteArchivedBrief(entry.id);
      expect(loadArchive()).toHaveLength(0);
    });
  });

  describe("saved prompts", () => {
    it("pins and loads a prompt", () => {
      const prompt = pinPrompt({
        task: "Code Review",
        prompt: "Review this code",
        bestFor: "Developers",
        inputFormat: "Code",
        outputFormat: "List"
      });
      expect(prompt.id).toBeDefined();

      const prompts = loadSavedPrompts();
      expect(prompts).toHaveLength(1);
      expect(prompts[0].task).toBe("Code Review");
    });

    it("removes a saved prompt", () => {
      const prompt = pinPrompt({
        task: "Test",
        prompt: "Test prompt",
        bestFor: "",
        inputFormat: "",
        outputFormat: ""
      });
      expect(loadSavedPrompts()).toHaveLength(1);
      removeSavedPrompt(prompt.id);
      expect(loadSavedPrompts()).toHaveLength(0);
    });
  });

  describe("collapse state", () => {
    it("saves and loads collapse state", () => {
      const state = { otherStories: true, deepDives: false };
      saveCollapseState(state);
      const loaded = loadCollapseState();
      expect(loaded).toEqual(state);
    });

    it("returns null when no state saved", () => {
      expect(loadCollapseState()).toBeNull();
    });
  });
});
