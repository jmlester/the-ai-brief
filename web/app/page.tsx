"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultSources } from "../data/sources";
import { parseBrief } from "../lib/parseBrief";
import {
  loadBrief,
  loadSettings,
  loadSources,
  saveBrief,
  saveSettings,
  saveSources,
  StoredSettings
} from "../lib/storage";
import { BriefSections, Source, SourceResult, SourceType } from "../lib/types";

type TabKey = "dashboard" | "brief" | "sources" | "settings";

type Tab = { key: TabKey; label: string };

const tabs: Tab[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "brief", label: "Brief" },
  { key: "sources", label: "Sources" },
  { key: "settings", label: "Settings" }
];

const defaultSettings: StoredSettings = {
  apiKey: "",
  model: "gpt-4o-mini",
  tone: "practical",
  focusTopics: "",
  timeWindowHours: 24,
  theme: "system"
};

export default function Page() {
  const [settings, setSettings] = useState<StoredSettings>(defaultSettings);
  const [sources, setSources] = useState<Source[]>(defaultSources);
  const [brief, setBrief] = useState<BriefSections | null>(null);
  const [sourceResults, setSourceResults] = useState<SourceResult[]>([]);
  const [coverageSummary, setCoverageSummary] = useState<string>("");
  const [expandedWindowUsed, setExpandedWindowUsed] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [lastHealthUpdate, setLastHealthUpdate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    otherStories: false,
    deepDives: false,
    promptStudio: false,
    radar: false
  });
  const [sourceView, setSourceView] = useState<"selected" | "recommended">("selected");
  const [customSource, setCustomSource] = useState({
    name: "",
    url: "",
    type: "rss" as SourceType,
    category: "Custom",
    summary: "",
    tags: "",
    ingestURL: "",
    allowScrape: false
  });

  useEffect(() => {
    const storedSettings = loadSettings();
    if (storedSettings) {
      setSettings({ ...defaultSettings, ...storedSettings });
    }
    const storedSources = loadSources();
    if (storedSources && storedSources.length > 0) {
      setSources(storedSources);
    }
    const storedBrief = loadBrief();
    if (storedBrief) {
      setBrief(storedBrief);
    }
    if (typeof window !== "undefined") {
      const storedTab = window.localStorage.getItem("dailyplaybook.tab") as TabKey | null;
      if (storedTab) {
        setActiveTab(storedTab);
      }
    }
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveSources(sources);
  }, [sources]);

  useEffect(() => {
    if (brief) saveBrief(brief);
  }, [brief]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (settings.theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", settings.theme);
    }
  }, [settings.theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dailyplaybook.tab", activeTab);
  }, [activeTab]);

  const enabledSources = useMemo(
    () => sources.filter((source) => source.isEnabled),
    [sources]
  );
  const recommendedList = useMemo(
    () => sources.filter((source) => !source.isEnabled && !source.isCustom),
    [sources]
  );

  const toggleSource = (id: string, key: "isEnabled" | "isPreferred") => {
    setSources((prev) =>
      prev.map((source) =>
        source.id === id ? { ...source, [key]: !source[key] } : source
      )
    );
  };

  const toggleScrape = (id: string) => {
    setSources((prev) =>
      prev.map((source) =>
        source.id === id ? { ...source, allowScrape: !source.allowScrape } : source
      )
    );
  };

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((source) => source.id !== id));
  };

  const updateSettings = (patch: Partial<StoredSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const createId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const addCustomSource = () => {
    setError("");
    const name = customSource.name.trim();
    const url = customSource.url.trim();
    if (!name || !url) {
      setError("Add a name and URL for the custom source.");
      return;
    }
    const category = customSource.category.trim() || "Custom";
    const summary = customSource.summary.trim() || "Custom source";
    const tags = customSource.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const ingestURL = customSource.ingestURL.trim();
    const newSource: Source = {
      id: createId(),
      name,
      url,
      type: customSource.type,
      category,
      summary,
      tags,
      ingestURL: ingestURL.length ? ingestURL : undefined,
      isEnabled: true,
      isPreferred: false,
      isCustom: true,
      allowScrape: customSource.allowScrape
    };
    setSources((prev) => [newSource, ...prev]);
    setCustomSource({
      name: "",
      url: "",
      type: "rss",
      category: "Custom",
      summary: "",
      tags: "",
      ingestURL: "",
      allowScrape: false
    });
  };

  const sourceHomeUrl = (sourceName: string) => {
    const match = sources.find((source) => source.name === sourceName);
    if (!match) return "";
    try {
      const parsed = new URL(match.url);
      return parsed.origin;
    } catch {
      return match.url;
    }
  };

  const toggleSection = (key: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const refreshSourceHealth = async () => {
    setError("");
    setIsHealthLoading(true);
    setStatus("Refreshing source health...");
    if (enabledSources.length === 0) {
      setError("Enable at least one source to refresh health.");
      setStatus("");
      setIsHealthLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: sources.filter((source) => source.isEnabled),
          hours: settings.timeWindowHours
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to refresh source health.");
      }
      const results = data.results ?? [];
      setSourceResults(results);
      const contributing = results.filter(
        (result: SourceResult) => result.status === "success" && (result.count ?? 0) > 0
      ).length;
      setCoverageSummary(`${contributing} of ${enabledSources.length} sources contributed`);
      setLastHealthUpdate(new Date().toLocaleTimeString());
      setStatus("Source health updated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
      setStatus("");
    } finally {
      setIsHealthLoading(false);
    }
  };

  const generateBrief = async () => {
    setError("");
    setStatus("Collecting sources...");
    setIsLoading(true);
    setSourceResults([]);

    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources,
          settings
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as any)?.error ?? "Failed to generate brief.");
      }

      if (!response.body) {
        throw new Error("Streaming response was unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let donePayload: any = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          let event = "message";
          let dataStr = "";
          for (const line of part.split("\n")) {
            if (line.startsWith("event:")) {
              event = line.slice(6).trim();
            }
            if (line.startsWith("data:")) {
              dataStr += line.slice(5).trim();
            }
          }
          if (!dataStr) continue;
          let data: any = {};
          try {
            data = JSON.parse(dataStr);
          } catch {
            data = { message: dataStr };
          }

          if (event === "status") {
            setStatus(data.message ?? "Working...");
          } else if (event === "delta") {
            if (data.text) {
              fullText += data.text;
            }
          } else if (event === "error") {
            throw new Error(data.message ?? "Failed to generate brief.");
          } else if (event === "done") {
            donePayload = data;
          }
        }
      }

      const finalText = donePayload?.text || fullText;
      if (!finalText) {
        throw new Error("AI response was empty.");
      }

      setStatus("Parsing response...");
      const parsed = parseBrief(finalText);
      setBrief(parsed);
      setSourceResults(donePayload?.sourceResults ?? []);
      setCoverageSummary(donePayload?.coverageSummary ?? "");
      setExpandedWindowUsed(Boolean(donePayload?.expandedWindowUsed));
      setLastHealthUpdate(new Date().toLocaleTimeString());
      setStatus("Brief ready.");
      setActiveTab("brief");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  const sourceHealthPanel = (
    <div className="panel">
      <div className="briefSectionHeader">
        <h2>Source Health</h2>
        <button className="collapseToggle" onClick={refreshSourceHealth} type="button">
          {isHealthLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {lastHealthUpdate && <div className="kicker">Last updated: {lastHealthUpdate}</div>}
      {sourceResults.length ? (
        <div className="stack">
          {sourceResults.map((result) => (
            <div key={result.sourceId} className="statusRow">
              <div>{result.sourceName}</div>
              <div className={`statusPill ${result.status}`}>
                {result.status === "success" && `${result.count ?? 0} items`}
                {result.status === "empty" && "No recent items"}
                {result.status === "failed" && "Failed"}
                {result.status === "queued" && "Queued"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="kicker">Source status will show after generation.</div>
      )}
    </div>
  );

  return (
    <main>
      <div className="shell">
        <header className="topBar">
          <div>
            <div className="title">The AI Brief</div>
            <div className="subtitle">
              A universal version of your AI news briefing app with separate tabs, readable briefs,
              and theme controls.
            </div>
          </div>
          <div className="topActions">
            <div className="segmented" role="group" aria-label="Theme">
              {(["system", "light", "dark"] as const).map((mode) => (
                <button
                  key={mode}
                  className={settings.theme === mode ? "active" : ""}
                  onClick={() => updateSettings({ theme: mode })}
                  type="button"
                >
                  {mode[0].toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn btnPrimary" onClick={generateBrief} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Brief"}
            </button>
          </div>
        </header>

        <div className="row">
          <span className="chip">{enabledSources.length} sources enabled</span>
          {coverageSummary && <span className="chip">{coverageSummary}</span>}
          {expandedWindowUsed && <span className="chip">Expanded to 48h window</span>}
          {status && <span className="chip">{status}</span>}
          {error && <span className="chip" style={{ color: "#b91c1c" }}>{error}</span>}
        </div>

        <nav className="tabBar" aria-label="Primary">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tabButton ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="tabPanel">
          {activeTab === "dashboard" && (
            <div className="dashboardGrid">
              <div className="card">
                <div className="sectionTitle">
                  <h3>Today's Snapshot</h3>
                  <span>Status</span>
                </div>
                <div className="reading">
                  {brief?.headline || "Generate a brief to populate today's headline."}
                </div>
                <div className="kicker">
                  Time window: {settings.timeWindowHours}h - Tone: {settings.tone}
                </div>
              </div>
              <div className="card">
                <div className="sectionTitle">
                  <h3>Summary</h3>
                  <span>Signal</span>
                </div>
                <div className="kicker">
                  {brief?.summary || "Your summary will appear here once a brief is generated."}
                </div>
              </div>
              <div className="card">
                <div className="sectionTitle">
                  <h3>Focus Topics</h3>
                  <span>Scope</span>
                </div>
                <div className="kicker">
                  {settings.focusTopics.trim() || "No focus topics set yet."}
                </div>
              </div>
              {sourceHealthPanel}
            </div>
          )}

          {activeTab === "brief" && (
            <div className="briefLayout">
              <div className="briefSection">
                <div className="briefCard">
                  <div className="sectionTitle">
                    <h3>Headline</h3>
                    <span>Topline</span>
                  </div>
                  <div className="briefHeadline">
                    {brief?.headline || "Generate a brief to see the headline."}
                  </div>
                  <div className="reading">
                    {brief?.summary || "Your summary appears here once generated."}
                  </div>
                </div>

                <div className="briefCard">
                  <div className="briefSectionHeader">
                    <div className="sectionTitle">
                      <h3>Other Stories</h3>
                      <span>Themes</span>
                    </div>
                    <button
                      className="collapseToggle"
                      onClick={() => toggleSection("otherStories")}
                      type="button"
                    >
                      {collapsedSections.otherStories ? "Expand" : "Collapse"}
                    </button>
                  </div>
                  {!collapsedSections.otherStories ? (
                    brief?.otherStories?.length ? (
                      <div className="stack">
                        {brief.otherStories.map((group, index) => (
                          <div key={`${group.theme}-${index}`}>
                            <div className="kicker"><strong>{group.theme}</strong></div>
                            <div className="subCardGrid">
                              {group.items.map((item, idx) => {
                                const homeUrl = item.source ? sourceHomeUrl(item.source) : "";
                                return (
                                  <div className="subCard" key={`${item.story}-${idx}`}>
                                    <div className="subCardTitle">
                                      {item.url ? (
                                        <a className="link" href={item.url} target="_blank" rel="noreferrer">
                                          {item.story}
                                        </a>
                                      ) : (
                                        item.story
                                      )}
                                    </div>
                                    <div className="subCardFooter">
                                      {item.source && (
                                        homeUrl ? (
                                          <a
                                            className="sourcePill"
                                            href={homeUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            {item.source}
                                          </a>
                                        ) : (
                                          <span className="sourcePill">{item.source}</span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="emptyState">Themes will show after generation.</div>
                    )
                  ) : (
                    <div className="kicker">Section collapsed.</div>
                  )}
                </div>

                <div className="briefCard">
                  <div className="briefSectionHeader">
                    <div className="sectionTitle">
                      <h3>Deep Dives</h3>
                      <span>Details</span>
                    </div>
                    <button
                      className="collapseToggle"
                      onClick={() => toggleSection("deepDives")}
                      type="button"
                    >
                      {collapsedSections.deepDives ? "Expand" : "Collapse"}
                    </button>
                  </div>
                  {!collapsedSections.deepDives ? (
                    brief?.deepDives?.length ? (
                      <div className="subCardGrid">
                        {brief.deepDives.map((item, index) => {
                          const homeUrl = item.source ? sourceHomeUrl(item.source) : "";
                          return (
                            <div className="subCard" key={`${item.story}-${index}`}>
                              <div className="subCardTitle">
                                {item.url ? (
                                  <a className="link" href={item.url} target="_blank" rel="noreferrer">
                                    {item.story}
                                  </a>
                                ) : (
                                  item.story
                                )}
                              </div>
                              <div className="subCardFooter">
                                {item.source && (
                                  homeUrl ? (
                                    <a
                                      className="sourcePill"
                                      href={homeUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {item.source}
                                    </a>
                                  ) : (
                                    <span className="sourcePill">{item.source}</span>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="emptyState">Detailed items appear here.</div>
                    )
                  ) : (
                    <div className="kicker">Section collapsed.</div>
                  )}
                </div>

                <div className="briefCard">
                  <div className="briefSectionHeader">
                    <div className="sectionTitle">
                      <h3>Prompt Studio</h3>
                      <span>Ideas</span>
                    </div>
                    <button
                      className="collapseToggle"
                      onClick={() => toggleSection("promptStudio")}
                      type="button"
                    >
                      {collapsedSections.promptStudio ? "Expand" : "Collapse"}
                    </button>
                  </div>
                  {!collapsedSections.promptStudio ? (
                    brief?.promptStudio?.length ? (
                      <div className="subCardGrid">
                        {brief.promptStudio.map((item, index) => (
                          <div className="subCard" key={`${item.task}-${index}`}>
                            <div className="subCardTitle">{item.task || `Prompt ${index + 1}`}</div>
                            <div className="subCardMeta">{item.prompt}</div>
                            {item.bestFor && <div className="subCardMeta">Best for: {item.bestFor}</div>}
                            {item.inputFormat && <div className="subCardMeta">Input: {item.inputFormat}</div>}
                            {item.outputFormat && <div className="subCardMeta">Output: {item.outputFormat}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="emptyState">Prompts show up once generated.</div>
                    )
                  ) : (
                    <div className="kicker">Section collapsed.</div>
                  )}
                </div>

                <div className="briefCard">
                  <div className="briefSectionHeader">
                    <div className="sectionTitle">
                      <h3>Tomorrow's Radar</h3>
                      <span>Watchlist</span>
                    </div>
                    <button
                      className="collapseToggle"
                      onClick={() => toggleSection("radar")}
                      type="button"
                    >
                      {collapsedSections.radar ? "Expand" : "Collapse"}
                    </button>
                  </div>
                  {!collapsedSections.radar ? (
                    brief?.radar?.length ? (
                      <ul className="list">
                        {brief.radar.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="emptyState">Watchlist items appear here.</div>
                    )
                  ) : (
                    <div className="kicker">Section collapsed.</div>
                  )}
                </div>
              </div>

              <aside className="stack">
                <div className="panel">
                  <h2>Brief Controls</h2>
                  <div className="stack">
                    <div className="kicker">Model: {settings.model}</div>
                    <div className="kicker">Tone: {settings.tone}</div>
                    <div className="kicker">Window: {settings.timeWindowHours} hours</div>
                    {settings.focusTopics.trim() && (
                      <div className="kicker">Focus: {settings.focusTopics}</div>
                    )}
                    <button className="btn" onClick={() => setActiveTab("sources")}>
                      Manage Sources
                    </button>
                    <button className="btn btnGhost" onClick={() => setActiveTab("settings")}>
                      Adjust Settings
                    </button>
                  </div>
                </div>
                {sourceHealthPanel}
              </aside>
            </div>
          )}

          {activeTab === "sources" && (
            <div className="panel">
              <h2>Sources</h2>
              <div className="segmented" role="group" aria-label="Source view">
                <button
                  className={`tabButton ${sourceView === "selected" ? "active" : ""}`}
                  type="button"
                  onClick={() => setSourceView("selected")}
                >
                  Selected ({enabledSources.length})
                </button>
                <button
                  className={`tabButton ${sourceView === "recommended" ? "active" : ""}`}
                  type="button"
                  onClick={() => setSourceView("recommended")}
                >
                  Recommended
                </button>
              </div>

              {sourceView === "selected" ? (
                <div className="stack">
                  <div>
                    <div className="sectionTitle">
                      <h3>Add Custom Source</h3>
                      <span>Manual</span>
                    </div>
                    <div className="formGrid">
                      <div className="field">
                        <label className="label">Name</label>
                        <input
                          className="input"
                          value={customSource.name}
                          onChange={(event) =>
                            setCustomSource((prev) => ({ ...prev, name: event.target.value }))
                          }
                          placeholder="My Source"
                        />
                      </div>
                      <div className="field">
                        <label className="label">URL</label>
                        <input
                          className="input"
                          value={customSource.url}
                          onChange={(event) =>
                            setCustomSource((prev) => ({ ...prev, url: event.target.value }))
                          }
                          placeholder="https://example.com/feed.xml"
                        />
                      </div>
                      <div className="field">
                        <label className="label">Type</label>
                        <select
                          className="select"
                          value={customSource.type}
                          onChange={(event) =>
                            setCustomSource((prev) => ({
                              ...prev,
                              type: event.target.value as SourceType
                            }))
                          }
                        >
                          <option value="rss">RSS</option>
                          <option value="website">Website</option>
                          <option value="newsletter">Newsletter</option>
                          <option value="social">Social</option>
                        </select>
                      </div>
                      <div className="field">
                        <label className="label">Ingest URL (optional)</label>
                        <input
                          className="input"
                          value={customSource.ingestURL}
                          onChange={(event) =>
                            setCustomSource((prev) => ({ ...prev, ingestURL: event.target.value }))
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <div className="field">
                        <label className="label">Webpage Scrape</label>
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={customSource.allowScrape}
                            onChange={(event) =>
                              setCustomSource((prev) => ({
                                ...prev,
                                allowScrape: event.target.checked
                              }))
                            }
                          />
                          Allow scraping when no RSS is available
                        </label>
                      </div>
                      <div className="field">
                        <label className="label">Category</label>
                        <input
                          className="input"
                          value={customSource.category}
                          onChange={(event) =>
                            setCustomSource((prev) => ({ ...prev, category: event.target.value }))
                          }
                          placeholder="Custom"
                        />
                      </div>
                      <div className="field">
                        <label className="label">Tags (comma separated)</label>
                        <input
                          className="input"
                          value={customSource.tags}
                          onChange={(event) =>
                            setCustomSource((prev) => ({ ...prev, tags: event.target.value }))
                          }
                          placeholder="ai, product, policy"
                        />
                      </div>
                      <div className="field">
                        <label className="label">Summary</label>
                        <textarea
                          className="textarea"
                          value={customSource.summary}
                          onChange={(event) =>
                            setCustomSource((prev) => ({ ...prev, summary: event.target.value }))
                          }
                          placeholder="Short description for the source list"
                        />
                      </div>
                    </div>
                    <div className="row">
                      <button className="btn" onClick={addCustomSource} type="button">
                        Add Source
                      </button>
                      <div className="kicker">
                        For non-RSS types, add an ingest URL or enable scraping.
                      </div>
                    </div>
                  </div>

                  {enabledSources.length ? (
                    <div className="sources">
                      {enabledSources.map((source) => (
                        <div key={source.id} className="sourceCard">
                          <div className="sourceHeader">
                            <div>
                              <div className="sourceName">{source.name}</div>
                              <div className="sourceMeta">
                                {source.category} - {source.type.toUpperCase()}
                              </div>
                            </div>
                            <label className="toggle">
                              <input
                                type="checkbox"
                                checked={Boolean(source.isEnabled)}
                                onChange={() => toggleSource(source.id, "isEnabled")}
                              />
                              Enabled
                            </label>
                          </div>
                          <div className="sourceMeta">{source.summary}</div>
                          <div className="row">
                            <button
                              className={`btn ${source.isPreferred ? "preferred" : ""}`}
                              type="button"
                              onClick={() => toggleSource(source.id, "isPreferred")}
                            >
                              {source.isPreferred ? "Preferred" : "Mark Preferred"}
                            </button>
                            {source.type !== "rss" && (
                              <button
                                className={`btn ${source.allowScrape ? "preferred" : ""}`}
                                type="button"
                                onClick={() => toggleScrape(source.id)}
                              >
                                {source.allowScrape ? "Scrape On" : "Enable Scrape"}
                              </button>
                            )}
                            <a
                              className="sourceMeta"
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Visit feed
                            </a>
                            {source.isCustom && (
                              <button
                                className="btn btnGhost"
                                type="button"
                                onClick={() => removeSource(source.id)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="emptyState">
                      Enable a source or add a custom one to see it here.
                    </div>
                  )}
                </div>
              ) : (
                <div className="recommended">
                  <div className="kicker">
                    Explore hundreds of carefully curated feeds. Click “Add” to copy one into your
                    selected sources list.
                  </div>
                  <div className="recommendedGrid">
                    {recommendedList.map((source) => (
                      <div key={source.id} className="sourceCard">
                        <div className="sourceHeader">
                          <div>
                            <div className="sourceName">{source.name}</div>
                            <div className="sourceMeta">
                              {source.category} - {source.type.toUpperCase()}
                            </div>
                          </div>
                        </div>
                        <div className="sourceMeta">{source.summary}</div>
                        <div className="row">
                          <button
                            className="btn btnPrimary"
                            type="button"
                            onClick={() => toggleSource(source.id, "isEnabled")}
                          >
                            Add
                          </button>
                          <a
                            className="sourceMeta"
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open site
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="panel stack">
              <h2>Settings</h2>
              <div className="field">
                <label className="label">OpenAI API Key</label>
                <input
                  className="input"
                  type="password"
                  placeholder="sk-..."
                  value={settings.apiKey}
                  onChange={(event) => updateSettings({ apiKey: event.target.value })}
                />
                <div className="kicker">
                  Stored locally in your browser. Use OPENAI_API_KEY on Vercel.
                </div>
              </div>
              <div className="field">
                <label className="label">Model</label>
                <input
                  className="input"
                  value={settings.model}
                  onChange={(event) => updateSettings({ model: event.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">Tone</label>
                <select
                  className="select"
                  value={settings.tone}
                  onChange={(event) => updateSettings({ tone: event.target.value })}
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
                  onChange={(event) => updateSettings({ focusTopics: event.target.value })}
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
                  onChange={(event) =>
                    updateSettings({ timeWindowHours: Number(event.target.value) || 24 })
                  }
                />
              </div>
              <div className="field">
                <label className="label">Theme</label>
                <div className="segmented" role="group" aria-label="Theme">
                  {(["system", "light", "dark"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={settings.theme === mode ? "active" : ""}
                      onClick={() => updateSettings({ theme: mode })}
                      type="button"
                    >
                      {mode[0].toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <footer>Universal build - iOS app untouched - Deploy on Vercel</footer>
      </div>
    </main>
  );
}
