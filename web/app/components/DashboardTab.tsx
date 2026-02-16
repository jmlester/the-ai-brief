"use client";

import { BriefSections, SourceResult } from "../../lib/types";
import { StoredSettings } from "../../lib/storage";
import SourceHealthPanel from "./SourceHealthPanel";

export default function DashboardTab({
  brief,
  settings,
  sourceResults,
  lastHealthUpdate,
  isHealthLoading,
  onRefreshHealth,
  silentSources
}: {
  brief: BriefSections | null;
  settings: StoredSettings;
  sourceResults: SourceResult[];
  lastHealthUpdate: string;
  isHealthLoading: boolean;
  onRefreshHealth: () => void;
  silentSources: SourceResult[];
}) {
  return (
    <div className="dashboardGrid">
      <div className="card">
        <div className="sectionTitle">
          <h3>Today&apos;s Snapshot</h3>
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
      <SourceHealthPanel
        sourceResults={sourceResults}
        lastHealthUpdate={lastHealthUpdate}
        isHealthLoading={isHealthLoading}
        onRefresh={onRefreshHealth}
        silentSources={silentSources}
      />
    </div>
  );
}
