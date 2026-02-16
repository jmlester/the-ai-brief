"use client";

import { useMemo, useState } from "react";
import { Source, SourceType } from "../../lib/types";

type SourceCheckResult = {
  sourceId: string;
  sourceName: string;
  status: "success" | "empty" | "failed" | "queued";
  count?: number;
  message?: string;
  responseTimeMs: number;
  sampleTitles: string[];
};

export default function SourcesTab({
  sources,
  enabledSources,
  onToggleSource,
  onToggleScrape,
  onRemoveSource,
  onAddSource,
  error,
  setError
}: {
  sources: Source[];
  enabledSources: Source[];
  onToggleSource: (id: string, key: "isEnabled" | "isPreferred") => void;
  onToggleScrape: (id: string) => void;
  onRemoveSource: (id: string) => void;
  onAddSource: (source: Source) => void;
  error: string;
  setError: (msg: string) => void;
}) {
  const [sourceView, setSourceView] = useState<"selected" | "recommended">("selected");
  const [sourceSearch, setSourceSearch] = useState("");
  const [webSearchQuery, setWebSearchQuery] = useState("");
  const [shareStatus, setShareStatus] = useState("");
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

  // Health checker state
  const [healthResults, setHealthResults] = useState<SourceCheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ done: 0, total: 0 });
  const [healthFilter, setHealthFilter] = useState<"all" | "success" | "empty" | "failed">("all");
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const recommendedList = useMemo(
    () => sources.filter((source) => !source.isEnabled && !source.isCustom),
    [sources]
  );
  const filteredRecommended = useMemo(() => {
    const query = sourceSearch.trim().toLowerCase();
    if (!query) return recommendedList;
    return recommendedList.filter((source) => {
      const haystack = `${source.name} ${source.category} ${source.summary}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [recommendedList, sourceSearch]);

  const filteredHealthResults = useMemo(() => {
    if (healthFilter === "all") return healthResults;
    return healthResults.filter((r) => r.status === healthFilter);
  }, [healthResults, healthFilter]);

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
    const tags = customSource.tags.split(",").map((t) => t.trim()).filter(Boolean);
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
    onAddSource(newSource);
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

  const launchWebSearch = () => {
    const query = webSearchQuery.trim();
    if (!query) {
      setShareStatus("Type a search query first.");
      return;
    }
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query + " ai newsletter")}`;
    if (typeof window !== "undefined") {
      window.open(searchUrl, "_blank", "noopener");
      setShareStatus(`Searching the web for "${query}"...`);
      window.setTimeout(() => setShareStatus(""), 2000);
    }
  };

  const checkAllSources = async () => {
    // Check all sources (both enabled and recommended)
    const allSources = sources.filter((s) => s.type === "rss" || s.ingestURL || s.allowScrape);
    if (allSources.length === 0) {
      setShareStatus("No checkable sources found.");
      window.setTimeout(() => setShareStatus(""), 2000);
      return;
    }

    setIsChecking(true);
    setHealthResults([]);
    setCheckProgress({ done: 0, total: allSources.length });

    // Process in batches of 5 to avoid overwhelming the server
    const batchSize = 5;
    const allResults: SourceCheckResult[] = [];

    for (let i = 0; i < allSources.length; i += batchSize) {
      const batch = allSources.slice(i, i + batchSize);
      try {
        const response = await fetch("/api/source-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sources: batch, hours: 72 })
        });
        const data = await response.json();
        if (data.results) {
          allResults.push(...data.results);
          setHealthResults([...allResults]);
        }
      } catch {
        // Mark batch as failed
        for (const s of batch) {
          allResults.push({
            sourceId: s.id,
            sourceName: s.name,
            status: "failed",
            message: "Network error during check",
            responseTimeMs: 0,
            sampleTitles: []
          });
        }
        setHealthResults([...allResults]);
      }
      setCheckProgress({ done: Math.min(i + batchSize, allSources.length), total: allSources.length });
    }

    setIsChecking(false);
  };

  const getSourceForResult = (result: SourceCheckResult) => {
    return sources.find((s) => s.id === result.sourceId || s.name === result.sourceName);
  };

  const healthSummary = useMemo(() => {
    if (healthResults.length === 0) return null;
    const success = healthResults.filter((r) => r.status === "success").length;
    const empty = healthResults.filter((r) => r.status === "empty").length;
    const failed = healthResults.filter((r) => r.status === "failed").length;
    const queued = healthResults.filter((r) => r.status === "queued").length;
    return { success, empty, failed, queued, total: healthResults.length };
  }, [healthResults]);

  return (
    <div className="panel">
      <h2>Sources</h2>
      <div className="segmented" role="group" aria-label="Source view">
        <button
          className={`tabButton ${sourceView === "selected" ? "active" : ""}`}
          type="button"
          onClick={() => setSourceView("selected")}
          role="tab"
          aria-selected={sourceView === "selected"}
        >
          Selected ({enabledSources.length})
        </button>
        <button
          className={`tabButton ${sourceView === "recommended" ? "active" : ""}`}
          type="button"
          onClick={() => setSourceView("recommended")}
          role="tab"
          aria-selected={sourceView === "recommended"}
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
                <input className="input" value={customSource.name} onChange={(e) => setCustomSource((prev) => ({ ...prev, name: e.target.value }))} placeholder="My Source" />
              </div>
              <div className="field">
                <label className="label">URL</label>
                <input className="input" value={customSource.url} onChange={(e) => setCustomSource((prev) => ({ ...prev, url: e.target.value }))} placeholder="https://example.com/feed.xml" />
              </div>
              <div className="field">
                <label className="label">Type</label>
                <select className="select" value={customSource.type} onChange={(e) => setCustomSource((prev) => ({ ...prev, type: e.target.value as SourceType }))}>
                  <option value="rss">RSS</option>
                  <option value="website">Website</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="social">Social</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Ingest URL (optional)</label>
                <input className="input" value={customSource.ingestURL} onChange={(e) => setCustomSource((prev) => ({ ...prev, ingestURL: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="field">
                <label className="label">Webpage Scrape</label>
                <label className="toggle">
                  <input type="checkbox" checked={customSource.allowScrape} onChange={(e) => setCustomSource((prev) => ({ ...prev, allowScrape: e.target.checked }))} />
                  Allow scraping when no RSS is available
                </label>
              </div>
              <div className="field">
                <label className="label">Category</label>
                <input className="input" value={customSource.category} onChange={(e) => setCustomSource((prev) => ({ ...prev, category: e.target.value }))} placeholder="Custom" />
              </div>
              <div className="field">
                <label className="label">Tags (comma separated)</label>
                <input className="input" value={customSource.tags} onChange={(e) => setCustomSource((prev) => ({ ...prev, tags: e.target.value }))} placeholder="ai, product, policy" />
              </div>
              <div className="field">
                <label className="label">Summary</label>
                <textarea className="textarea" value={customSource.summary} onChange={(e) => setCustomSource((prev) => ({ ...prev, summary: e.target.value }))} placeholder="Short description for the source list" />
              </div>
            </div>
            <div className="row">
              <button className="btn" onClick={addCustomSource} type="button">Add Source</button>
              <div className="kicker">For non-RSS types, add an ingest URL or enable scraping.</div>
            </div>
            {error && <div className="kicker" style={{ color: "#b91c1c" }}>{error}</div>}
          </div>

          {enabledSources.length ? (
            <div className="sources">
              {enabledSources.map((source) => (
                <div key={source.id} className="sourceCard">
                  <div className="sourceHeader">
                    <div>
                      <div className="sourceName">{source.name}</div>
                      <div className="sourceMeta">{source.category} - {source.type.toUpperCase()}</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={Boolean(source.isEnabled)} onChange={() => onToggleSource(source.id, "isEnabled")} />
                      Enabled
                    </label>
                  </div>
                  <div className="sourceMeta">{source.summary}</div>
                  <div className="row">
                    <button className={`btn ${source.isPreferred ? "preferred" : ""}`} type="button" onClick={() => onToggleSource(source.id, "isPreferred")}>
                      {source.isPreferred ? "Preferred" : "Mark Preferred"}
                    </button>
                    {source.type !== "rss" && (
                      <button className={`btn ${source.allowScrape ? "preferred" : ""}`} type="button" onClick={() => onToggleScrape(source.id)}>
                        {source.allowScrape ? "Scrape On" : "Enable Scrape"}
                      </button>
                    )}
                    <a className="sourceMeta" href={source.url} target="_blank" rel="noreferrer">Visit feed</a>
                    {source.isCustom && (
                      <button className="btn btnGhost" type="button" onClick={() => onRemoveSource(source.id)}>Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="emptyState">Enable a source or add a custom one to see it here.</div>
          )}
        </div>
      ) : (
        <div className="recommended">
          {/* Source Health Checker */}
          <div className="healthChecker">
            <div className="briefSectionHeader">
              <div className="sectionTitle">
                <h3>Source Health Checker</h3>
                <span>Diagnostics</span>
              </div>
              <button
                className="btn btnPrimary"
                type="button"
                onClick={checkAllSources}
                disabled={isChecking}
              >
                {isChecking
                  ? `Checking ${checkProgress.done}/${checkProgress.total}...`
                  : "Check All Sources"}
              </button>
            </div>
            <div className="kicker">
              Test every source to see which ones can be reached and provide articles. Click a result to take action.
            </div>

            {isChecking && (
              <div className="onboardingProgressBar" style={{ marginTop: 8 }}>
                <div
                  className="onboardingProgressFill"
                  style={{ width: `${checkProgress.total > 0 ? (checkProgress.done / checkProgress.total * 100) : 0}%` }}
                />
              </div>
            )}

            {healthSummary && (
              <div className="healthSummary">
                <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                  <button
                    className={`chip ${healthFilter === "all" ? "chipActive" : ""}`}
                    type="button"
                    onClick={() => setHealthFilter("all")}
                  >
                    All ({healthSummary.total})
                  </button>
                  {healthSummary.success > 0 && (
                    <button
                      className={`chip chipSuccess ${healthFilter === "success" ? "chipActive" : ""}`}
                      type="button"
                      onClick={() => setHealthFilter("success")}
                    >
                      Working ({healthSummary.success})
                    </button>
                  )}
                  {healthSummary.empty > 0 && (
                    <button
                      className={`chip ${healthFilter === "empty" ? "chipActive" : ""}`}
                      type="button"
                      onClick={() => setHealthFilter("empty")}
                    >
                      Empty ({healthSummary.empty})
                    </button>
                  )}
                  {healthSummary.failed > 0 && (
                    <button
                      className={`chip chipFailed ${healthFilter === "failed" ? "chipActive" : ""}`}
                      type="button"
                      onClick={() => setHealthFilter("failed")}
                    >
                      Failed ({healthSummary.failed})
                    </button>
                  )}
                </div>
              </div>
            )}

            {filteredHealthResults.length > 0 && (
              <div className="healthResults">
                {filteredHealthResults.map((result) => {
                  const source = getSourceForResult(result);
                  const isExpanded = expandedResult === result.sourceId;
                  return (
                    <div
                      key={result.sourceId}
                      className={`healthResultCard ${result.status === "failed" ? "healthResultFailed" : ""} ${result.status === "success" ? "healthResultSuccess" : ""}`}
                    >
                      <button
                        className="healthResultHeader"
                        type="button"
                        onClick={() => setExpandedResult(isExpanded ? null : result.sourceId)}
                        aria-expanded={isExpanded}
                      >
                        <div className="healthResultInfo">
                          <div className={`statusPill ${result.status}`}>
                            {result.status === "success" && `${result.count ?? 0} items`}
                            {result.status === "empty" && "Empty"}
                            {result.status === "failed" && "Failed"}
                            {result.status === "queued" && "Queued"}
                          </div>
                          <div>
                            <div className="sourceName">{result.sourceName}</div>
                            <div className="sourceMeta">
                              {result.responseTimeMs}ms
                              {source ? ` - ${source.category} - ${source.type.toUpperCase()}` : ""}
                            </div>
                          </div>
                        </div>
                        <span className="healthResultChevron">{isExpanded ? "\u25B2" : "\u25BC"}</span>
                      </button>

                      {isExpanded && (
                        <div className="healthResultExpanded">
                          {result.message && (
                            <div className="kicker" style={{ color: "#b91c1c" }}>
                              Error: {result.message}
                            </div>
                          )}
                          {result.sampleTitles.length > 0 && (
                            <div>
                              <div className="label" style={{ marginBottom: 4 }}>Sample articles:</div>
                              <ul className="list">
                                {result.sampleTitles.map((title, i) => (
                                  <li key={i}>{title}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {source && (
                            <div className="row" style={{ flexWrap: "wrap", marginTop: 8 }}>
                              {!source.isEnabled && (
                                <button
                                  className="btn btnPrimary"
                                  type="button"
                                  onClick={() => onToggleSource(source.id, "isEnabled")}
                                >
                                  Add to Sources
                                </button>
                              )}
                              {source.isEnabled && (
                                <button
                                  className="btn btnGhost"
                                  type="button"
                                  onClick={() => onToggleSource(source.id, "isEnabled")}
                                >
                                  Disable
                                </button>
                              )}
                              {source.isCustom && (
                                <button
                                  className="btn btnGhost"
                                  type="button"
                                  onClick={() => onRemoveSource(source.id)}
                                >
                                  Remove
                                </button>
                              )}
                              {result.status === "failed" && !source.allowScrape && source.type !== "rss" && (
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => onToggleScrape(source.id)}
                                >
                                  Enable Scrape
                                </button>
                              )}
                              <a className="sourceMeta" href={source.url} target="_blank" rel="noreferrer">
                                Visit source
                              </a>
                              <button
                                className="btn"
                                type="button"
                                onClick={() => {
                                  setSourceSearch(source.category);
                                  setExpandedResult(null);
                                }}
                              >
                                Find Similar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="kicker" style={{ marginTop: 12 }}>
            Explore hundreds of carefully curated feeds. Search, then click &quot;Add&quot; to enable.
          </div>
          <div className="field">
            <label className="label" htmlFor="source-search">Search recommended</label>
            <input
              id="source-search"
              className="input"
              placeholder="Filter by name, category, summary"
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="source-web-search">Search the web for AI sources (opens DuckDuckGo)</label>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <input
                id="source-web-search"
                className="input"
                style={{ flex: "1 1 220px" }}
                value={webSearchQuery}
                onChange={(e) => setWebSearchQuery(e.target.value)}
                placeholder="e.g. ai newsletter, AI policy news"
              />
              <button className="btn btnPrimary" type="button" onClick={launchWebSearch}>Search web</button>
            </div>
            {shareStatus && <div className="kicker">{shareStatus}</div>}
          </div>
          <div className="recommendedGrid">
            {filteredRecommended.map((source) => (
              <div key={source.id} className="sourceCard">
                <div className="sourceHeader">
                  <div>
                    <div className="sourceName">{source.name}</div>
                    <div className="sourceMeta">{source.category} - {source.type.toUpperCase()}</div>
                  </div>
                </div>
                <div className="sourceMeta">{source.summary}</div>
                <div className="row">
                  <button className="btn btnPrimary" type="button" onClick={() => onToggleSource(source.id, "isEnabled")}>Add</button>
                  <a className="sourceMeta" href={source.url} target="_blank" rel="noreferrer">Open site</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
