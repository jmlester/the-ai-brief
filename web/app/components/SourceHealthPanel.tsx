"use client";

import { SourceResult } from "../../lib/types";
import CoverageChart from "./CoverageChart";

export default function SourceHealthPanel({
  sourceResults,
  lastHealthUpdate,
  isHealthLoading,
  onRefresh,
  silentSources
}: {
  sourceResults: SourceResult[];
  lastHealthUpdate: string;
  isHealthLoading: boolean;
  onRefresh: () => void;
  silentSources?: SourceResult[];
}) {
  return (
    <div className="panel">
      <div className="briefSectionHeader">
        <h2>Source Health</h2>
        <button className="collapseToggle" onClick={onRefresh} type="button">
          {isHealthLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {lastHealthUpdate && <div className="kicker">Last updated: {lastHealthUpdate}</div>}
      <CoverageChart results={sourceResults} />
      {sourceResults.length ? (
        <div className="stack">
          {sourceResults.map((result) => (
            <div
              key={result.sourceId}
              className={`statusRow ${result.status === "failed" || result.status === "empty" ? "silentSource" : ""}`}
            >
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
      {silentSources && silentSources.length > 0 && (
        <div className="silentSummary">
          <strong>Silent Sources:</strong> {silentSources.map((s) => s.sourceName).join(", ")}
        </div>
      )}
    </div>
  );
}
