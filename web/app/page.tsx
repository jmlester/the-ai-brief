"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultSources } from "../data/sources";
import { formatBriefHTML, formatBriefPlainText } from "../lib/formatBrief";
import { parseBrief } from "../lib/parseBrief";
import {
  archiveBrief,
  cacheOfflineBrief,
  cacheOfflineSources,
  loadBrief,
  loadCollapseState,
  loadOfflineBriefs,
  loadSettings,
  loadSources,
  saveBrief,
  saveCollapseState,
  saveSettings,
  saveSources,
  StoredSettings
} from "../lib/storage";
import { BriefSections, Source, SourceResult, StreamingPhase } from "../lib/types";
import BriefTab from "./components/BriefTab";
import DashboardTab from "./components/DashboardTab";
import OnboardingTab from "./components/OnboardingTab";
import SettingsTab from "./components/SettingsTab";
import SourcesTab from "./components/SourcesTab";
import StatusBar from "./components/StatusBar";

type TabKey = "dashboard" | "brief" | "sources" | "onboarding" | "settings";
type Tab = { key: TabKey; label: string };

const tabs: Tab[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "brief", label: "Brief" },
  { key: "sources", label: "Sources" },
  { key: "onboarding", label: "Guide" },
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

const STREAM_TIMEOUT_MS = 120_000;

export default function Page() {
  const [settings, setSettings] = useState<StoredSettings>(defaultSettings);
  const [sources, setSources] = useState<Source[]>(defaultSources);
  const [brief, setBrief] = useState<BriefSections | null>(null);
  const [sourceResults, setSourceResults] = useState<SourceResult[]>([]);
  const [coverageSummary, setCoverageSummary] = useState("");
  const [expandedWindowUsed, setExpandedWindowUsed] = useState(false);
  const [dedupCount, setDedupCount] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<StreamingPhase>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [lastHealthUpdate, setLastHealthUpdate] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    otherStories: false,
    deepDives: false,
    promptStudio: false,
    toolsAndLaunches: false,
    quickLinks: false
  });
  const [isOffline, setIsOffline] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const retryRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init
  useEffect(() => {
    const storedSettings = loadSettings();
    if (storedSettings) setSettings({ ...defaultSettings, ...storedSettings });
    const storedSources = loadSources();
    if (storedSources?.length) setSources(storedSources);
    const storedBrief = loadBrief();
    if (storedBrief) setBrief(storedBrief);
    const storedCollapse = loadCollapseState();
    if (storedCollapse) setCollapsedSections(storedCollapse);
    if (typeof window !== "undefined") {
      const storedTab = window.localStorage.getItem("dailyplaybook.tab") as TabKey | null;
      if (storedTab) setActiveTab(storedTab);
    }
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // Persist
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveSources(sources); cacheOfflineSources(sources); }, [sources]);
  useEffect(() => { if (brief) saveBrief(brief); }, [brief]);
  useEffect(() => { saveCollapseState(collapsedSections); }, [collapsedSections]);

  // Theme
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // Tab persistence
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dailyplaybook.tab", activeTab);
  }, [activeTab]);

  // Browser notifications
  useEffect(() => {
    if (!notificationsEnabled) return;
    const interval = setInterval(() => {
      if (Notification.permission === "granted") {
        new Notification("The AI Brief", { body: "Time for your daily AI brief!" });
      }
    }, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [notificationsEnabled]);

  const enabledSources = useMemo(() => sources.filter((s) => s.isEnabled), [sources]);

  const silentSources = useMemo(
    () => sourceResults.filter((r) => r.status === "failed" || r.status === "empty"),
    [sourceResults]
  );

  const toggleSource = (id: string, key: "isEnabled" | "isPreferred") => {
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, [key]: !s[key] } : s));
  };
  const toggleScrape = (id: string) => {
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, allowScrape: !s.allowScrape } : s));
  };
  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };
  const addSource = (source: Source) => {
    setSources((prev) => [source, ...prev]);
  };
  const updateSettings = (patch: Partial<StoredSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const sourceHomeUrl = useCallback((sourceName: string) => {
    const match = sources.find((s) => s.name === sourceName);
    if (!match) return "";
    try { return new URL(match.url).origin; } catch { return match.url; }
  }, [sources]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const expandAll = () => {
    setCollapsedSections((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) next[k] = false;
      return next;
    });
  };
  const collapseAll = () => {
    setCollapsedSections((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) next[k] = true;
      return next;
    });
  };

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      abortRef.current?.abort();
    }, STREAM_TIMEOUT_MS);
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
        body: JSON.stringify({ sources: sources.filter((s) => s.isEnabled), hours: settings.timeWindowHours })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Failed to refresh source health.");
      const results = data.results ?? [];
      setSourceResults(results);
      const contributing = results.filter((r: SourceResult) => r.status === "success" && (r.count ?? 0) > 0).length;
      setCoverageSummary(`${contributing} of ${enabledSources.length} sources contributed`);
      setLastHealthUpdate(new Date().toLocaleTimeString());
      setStatus("Source health updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setStatus("");
    } finally {
      setIsHealthLoading(false);
    }
  };

  const generateBrief = async (isRetry = false) => {
    setError("");
    setPhase("connecting");
    setStatus("Connecting...");
    setIsLoading(true);
    setSourceResults([]);
    setDedupCount(0);

    if (!isRetry) retryRef.current = 0;

    const controller = new AbortController();
    abortRef.current = controller;
    resetTimeout();

    try {
      setPhase("collecting");
      setStatus("Collecting sources...");

      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, settings }),
        signal: controller.signal
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as Record<string, string>)?.error ?? "Failed to generate brief.");
      }
      if (!response.body) throw new Error("Streaming response was unavailable.");

      setPhase("streaming");
      setStatus("Streaming response...");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let donePayload: Record<string, unknown> | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        resetTimeout();
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          let event = "message";
          let dataStr = "";
          for (const line of part.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;
          let data: Record<string, unknown> = {};
          try { data = JSON.parse(dataStr); } catch { data = { message: dataStr }; }

          if (event === "status") {
            setStatus((data.message as string) ?? "Working...");
          } else if (event === "delta") {
            if (data.text) fullText += data.text as string;
          } else if (event === "error") {
            throw new Error((data.message as string) ?? "Failed to generate brief.");
          } else if (event === "done") {
            donePayload = data;
          }
        }
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const finalText = (donePayload?.text as string) || fullText;
      if (!finalText) throw new Error("AI response was empty.");

      setPhase("parsing");
      setStatus("Parsing response...");
      const parsed = parseBrief(finalText);
      setBrief(parsed);

      const results = (donePayload?.sourceResults as SourceResult[]) ?? [];
      const summary = (donePayload?.coverageSummary as string) ?? "";
      const dupCount = (donePayload?.dedupCount as number) ?? 0;
      setSourceResults(results);
      setCoverageSummary(summary);
      setExpandedWindowUsed(Boolean(donePayload?.expandedWindowUsed));
      setDedupCount(dupCount);
      setLastHealthUpdate(new Date().toLocaleTimeString());
      setPhase("ready");
      setStatus("Brief ready.");
      setActiveTab("brief");

      // Archive and offline cache
      archiveBrief(parsed, results, summary);
      cacheOfflineBrief(parsed, results, summary);
    } catch (err) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const message = err instanceof Error ? err.message : "Unexpected error";

      // Auto-retry once on timeout/abort
      const isAbort =
        (err instanceof DOMException && err.name === "AbortError") ||
        message.includes("aborted") ||
        message.includes("timeout");
      if (retryRef.current === 0 && isAbort) {
        retryRef.current = 1;
        setPhase("retrying");
        setStatus("Retrying...");
        generateBrief(true);
        return;
      }

      setError(isAbort ? "Request timed out. Try again." : message);
      setPhase("error");
      setStatus("");
      setIsLoading(false);
    } finally {
      // Only clear loading if we didn't already handle it above (retry or error)
      if (retryRef.current === 0) setIsLoading(false);
    }
  };

  const downloadBriefHTML = () => {
    if (!brief) {
      setShareStatus("Generate a brief first.");
      window.setTimeout(() => setShareStatus(""), 2000);
      return;
    }
    const html = formatBriefHTML(brief);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const datePart = new Date().toISOString().slice(0, 10);
    a.download = `the-ai-brief-${datePart}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShareStatus("Brief downloaded.");
    window.setTimeout(() => setShareStatus(""), 2000);
  };

  const shareBrief = async () => {
    if (!brief) {
      setShareStatus("Generate a brief first.");
      window.setTimeout(() => setShareStatus(""), 2000);
      return;
    }
    const html = formatBriefHTML(brief);
    const htmlBlob = new Blob([html], { type: "text/html" });
    const datePart = new Date().toISOString().slice(0, 10);
    const file = new File([htmlBlob], `the-ai-brief-${datePart}.html`, { type: "text/html" });

    try {
      // Try sharing the file directly (mobile Safari, Chrome Android)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "The AI Brief",
          text: brief.headline,
          files: [file]
        });
        setShareStatus("Shared!");
      } else if (navigator.share) {
        // Fallback: share as text with summary
        const text = formatBriefPlainText(brief);
        await navigator.share({ title: "The AI Brief", text });
        setShareStatus("Shared!");
      } else {
        // Desktop: copy the full plain text to clipboard
        const text = formatBriefPlainText(brief);
        await navigator.clipboard.writeText(text);
        setShareStatus("Brief copied to clipboard.");
      }
    } catch {
      setShareStatus("Share canceled.");
    }
    window.setTimeout(() => setShareStatus(""), 2000);
  };

  const loadFromArchive = (b: BriefSections, results: SourceResult[], summary: string) => {
    setBrief(b);
    setSourceResults(results);
    setCoverageSummary(summary);
    setActiveTab("brief");
  };

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ("Notification" in window) {
        const perm = await Notification.requestPermission();
        if (perm === "granted") setNotificationsEnabled(true);
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  // Offline fallback: if offline and no brief, load from cache
  useEffect(() => {
    if (isOffline && !brief) {
      const cached = loadOfflineBriefs();
      if (cached.length > 0) {
        setBrief(cached[0].brief);
        setSourceResults(cached[0].sourceResults);
        setCoverageSummary(cached[0].coverageSummary);
      }
    }
  }, [isOffline, brief]);

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
            <button className="btn btnPrimary" onClick={() => generateBrief()} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Brief"}
            </button>
            <button className="btn btnGhost" onClick={shareBrief} type="button">
              Share Brief
            </button>
            <button className="btn btnGhost" onClick={downloadBriefHTML} type="button">
              Download
            </button>
          </div>
        </header>

        <StatusBar
          phase={phase}
          status={status}
          error={error}
          shareStatus={shareStatus}
          enabledCount={enabledSources.length}
          coverageSummary={coverageSummary}
          expandedWindowUsed={expandedWindowUsed}
          dedupCount={dedupCount}
          isOffline={isOffline}
        />

        <a
          className="newUserBadge"
          href="#onboarding"
          onClick={(e) => { e.preventDefault(); setActiveTab("onboarding"); }}
        >
          New to The AI Brief? Follow the onboarding →
        </a>

        <nav className="tabBar" role="tablist" aria-label="Primary">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tabButton ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="tabPanel" role="tabpanel" id={`panel-${activeTab}`}>
          {activeTab === "dashboard" && (
            <DashboardTab
              brief={brief}
              settings={settings}
              sourceResults={sourceResults}
              lastHealthUpdate={lastHealthUpdate}
              isHealthLoading={isHealthLoading}
              onRefreshHealth={refreshSourceHealth}
              silentSources={silentSources}
            />
          )}
          {activeTab === "brief" && (
            <BriefTab
              brief={brief}
              settings={settings}
              sourceResults={sourceResults}
              lastHealthUpdate={lastHealthUpdate}
              isHealthLoading={isHealthLoading}
              isLoading={isLoading}
              collapsedSections={collapsedSections}
              onToggleSection={toggleSection}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onRefreshHealth={refreshSourceHealth}
              onSetTab={(t) => setActiveTab(t as TabKey)}
              onLoadArchive={loadFromArchive}
              sourceHomeUrl={sourceHomeUrl}
              silentSources={silentSources}
            />
          )}
          {activeTab === "sources" && (
            <SourcesTab
              sources={sources}
              enabledSources={enabledSources}
              onToggleSource={toggleSource}
              onToggleScrape={toggleScrape}
              onRemoveSource={removeSource}
              onAddSource={addSource}
              error={error}
              setError={setError}
            />
          )}
          {activeTab === "onboarding" && (
            <OnboardingTab
              hasApiKey={!!settings.apiKey.trim()}
              enabledSourceCount={enabledSources.length}
              hasBrief={!!brief}
              onNavigate={(tab) => setActiveTab(tab as TabKey)}
            />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              settings={settings}
              onUpdate={updateSettings}
              notificationsEnabled={notificationsEnabled}
              onToggleNotifications={handleToggleNotifications}
            />
          )}
        </section>

        <footer>Universal build - iOS app untouched - Deploy on Vercel</footer>
      </div>
    </main>
  );
}
