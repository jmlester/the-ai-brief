"use client";

import { StreamingPhase } from "../../lib/types";

const phaseLabels: Record<StreamingPhase, string> = {
  idle: "",
  connecting: "Connecting...",
  collecting: "Collecting sources...",
  streaming: "Streaming response...",
  parsing: "Parsing brief...",
  ready: "Brief ready",
  error: "Error occurred",
  retrying: "Retrying..."
};

const phaseOrder: StreamingPhase[] = [
  "connecting",
  "collecting",
  "streaming",
  "parsing",
  "ready"
];

export default function StatusBar({
  phase,
  status,
  error,
  shareStatus,
  enabledCount,
  coverageSummary,
  expandedWindowUsed,
  dedupCount,
  isOffline
}: {
  phase: StreamingPhase;
  status: string;
  error: string;
  shareStatus: string;
  enabledCount: number;
  coverageSummary: string;
  expandedWindowUsed: boolean;
  dedupCount: number;
  isOffline: boolean;
}) {
  const activeIndex = phaseOrder.indexOf(phase);

  return (
    <div className="statusBar" role="status" aria-live="polite">
      <div className="row" style={{ flexWrap: "wrap" }}>
        <span className="chip">{enabledCount} sources enabled</span>
        {coverageSummary && <span className="chip">{coverageSummary}</span>}
        {expandedWindowUsed && <span className="chip">Expanded to 48h window</span>}
        {dedupCount > 0 && <span className="chip">{dedupCount} duplicates removed</span>}
        {isOffline && <span className="chip chipOffline">Offline</span>}
        {status && <span className="chip">{status}</span>}
        {error && <span className="chip chipError">{error}</span>}
        {shareStatus && <span className="chip">{shareStatus}</span>}
      </div>
      {phase !== "idle" && phase !== "ready" && phase !== "error" && (
        <div className="phaseIndicator">
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              className={`phaseStep ${i <= activeIndex ? "phaseStepActive" : ""} ${p === phase ? "phaseStepCurrent" : ""}`}
            >
              <div className="phaseStepDot" />
              <span className="phaseStepLabel">{phaseLabels[p]}</span>
            </div>
          ))}
        </div>
      )}
      <span className="srOnly">{phaseLabels[phase] || status}</span>
    </div>
  );
}
