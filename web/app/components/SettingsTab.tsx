"use client";

import { StoredSettings } from "../../lib/storage";
import { ModelPreset } from "../../lib/types";
import PromptLibrary from "./PromptLibrary";

const MODEL_PRESETS: ModelPreset[] = [
  {
    name: "Executive",
    model: "gpt-4o",
    tone: "executive",
    focusTopics: "market moves, M&A, earnings, macro policy",
    timeWindowHours: 12
  },
  {
    name: "Builder",
    model: "gpt-4o-mini",
    tone: "builder",
    focusTopics: "open-source, dev tools, APIs, model releases",
    timeWindowHours: 24
  },
  {
    name: "Research",
    model: "gpt-4o",
    tone: "practical",
    focusTopics: "papers, benchmarks, safety, alignment, evals",
    timeWindowHours: 48
  }
];

export default function SettingsTab({
  settings,
  onUpdate,
  notificationsEnabled,
  onToggleNotifications
}: {
  settings: StoredSettings;
  onUpdate: (patch: Partial<StoredSettings>) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
}) {
  const applyPreset = (preset: ModelPreset) => {
    onUpdate({
      model: preset.model,
      tone: preset.tone,
      focusTopics: preset.focusTopics,
      timeWindowHours: preset.timeWindowHours
    });
  };

  return (
    <div className="panel stack">
      <h2>Settings</h2>

      <div className="field">
        <label className="label">Model Presets</label>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {MODEL_PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="btn"
              type="button"
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">OpenAI API Key</label>
        <input
          className="input"
          type="password"
          placeholder="sk-..."
          value={settings.apiKey}
          onChange={(e) => onUpdate({ apiKey: e.target.value })}
        />
        <div className="kicker">Stored locally in your browser. Use OPENAI_API_KEY on Vercel.</div>
      </div>
      <div className="field">
        <label className="label">Model</label>
        <input
          className="input"
          value={settings.model}
          onChange={(e) => onUpdate({ model: e.target.value })}
        />
      </div>
      <div className="field">
        <label className="label">Tone</label>
        <select
          className="select"
          value={settings.tone}
          onChange={(e) => onUpdate({ tone: e.target.value })}
        >
          <option value="executive">Executive</option>
          <option value="practical">Practical</option>
          <option value="builder">Builder</option>
        </select>
      </div>
      <div className="field">
        <label className="label">Focus Topics</label>
        <textarea
          className="textarea"
          value={settings.focusTopics}
          onChange={(e) => onUpdate({ focusTopics: e.target.value })}
          placeholder="AI infra, model releases, policy updates"
        />
      </div>
      <div className="field">
        <label className="label">Time Window (hours)</label>
        <input
          className="input"
          type="number"
          min={6}
          max={72}
          value={settings.timeWindowHours}
          onChange={(e) => onUpdate({ timeWindowHours: Number(e.target.value) || 24 })}
        />
      </div>
      <div className="field">
        <label className="label">Theme</label>
        <div className="segmented" role="group" aria-label="Theme">
          {(["system", "light", "dark"] as const).map((mode) => (
            <button
              key={mode}
              className={settings.theme === mode ? "active" : ""}
              onClick={() => onUpdate({ theme: mode })}
              type="button"
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="label">Browser Notifications</label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={onToggleNotifications}
          />
          Daily reminder (while tab is open)
        </label>
      </div>

      <h2>Prompt Library</h2>
      <PromptLibrary />
    </div>
  );
}
