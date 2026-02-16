"use client";

import { SourceResult } from "../../lib/types";

export default function CoverageChart({ results }: { results: SourceResult[] }) {
  if (!results.length) return null;

  const total = results.length;
  const success = results.filter((r) => r.status === "success").length;
  const empty = results.filter((r) => r.status === "empty").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const queued = results.filter((r) => r.status === "queued").length;

  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;

  return (
    <div className="coverageChart" aria-label="Source coverage breakdown">
      <div className="coverageBar">
        {success > 0 && (
          <div className="coverageSeg coverageSuccess" style={{ width: pct(success) }} title={`${success} success`} />
        )}
        {empty > 0 && (
          <div className="coverageSeg coverageEmpty" style={{ width: pct(empty) }} title={`${empty} empty`} />
        )}
        {failed > 0 && (
          <div className="coverageSeg coverageFailed" style={{ width: pct(failed) }} title={`${failed} failed`} />
        )}
        {queued > 0 && (
          <div className="coverageSeg coverageQueued" style={{ width: pct(queued) }} title={`${queued} queued`} />
        )}
      </div>
      <div className="coverageLegend">
        {success > 0 && <span className="coverageLegendItem"><span className="coverageDot coverageSuccess" /> {success} success</span>}
        {empty > 0 && <span className="coverageLegendItem"><span className="coverageDot coverageEmpty" /> {empty} empty</span>}
        {failed > 0 && <span className="coverageLegendItem"><span className="coverageDot coverageFailed" /> {failed} failed</span>}
        {queued > 0 && <span className="coverageLegendItem"><span className="coverageDot coverageQueued" /> {queued} queued</span>}
      </div>
    </div>
  );
}
