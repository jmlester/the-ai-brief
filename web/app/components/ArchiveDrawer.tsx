"use client";

import { useState } from "react";
import { formatBriefMarkdown } from "../../lib/formatBrief";
import { deleteArchivedBrief, loadArchive } from "../../lib/storage";
import { ArchivedBrief, BriefSections } from "../../lib/types";

export default function ArchiveDrawer({
  onLoad
}: {
  onLoad: (brief: BriefSections, sourceResults: ArchivedBrief["sourceResults"], coverageSummary: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [archive, setArchive] = useState<ArchivedBrief[]>([]);
  const [search, setSearch] = useState("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const open = () => {
    setArchive(loadArchive());
    setIsOpen(true);
  };

  const filtered = archive.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const dateStr = new Date(a.createdAt).toLocaleDateString();
    return a.brief.headline.toLowerCase().includes(q) || dateStr.includes(q);
  });

  const handleDelete = (id: string) => {
    const updated = deleteArchivedBrief(id);
    setArchive(updated);
  };

  const handleExport = async (a: ArchivedBrief) => {
    const md = formatBriefMarkdown(a.brief);
    try {
      await navigator.clipboard.writeText(md);
      setCopyStatus(a.id);
      setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      // fallback
    }
  };

  if (!isOpen) {
    return (
      <button className="btn btnGhost" type="button" onClick={open}>
        Archive ({loadArchive().length})
      </button>
    );
  }

  return (
    <div className="archiveDrawer">
      <div className="briefSectionHeader">
        <h3>Brief Archive</h3>
        <button className="collapseToggle" type="button" onClick={() => setIsOpen(false)}>
          Close
        </button>
      </div>
      <div className="field">
        <input
          className="input"
          placeholder="Search by headline or date..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="emptyState">No archived briefs found.</div>
      ) : (
        <div className="stack">
          {filtered.map((a) => (
            <div key={a.id} className="sourceCard">
              <div className="sourceHeader">
                <div>
                  <div className="sourceName">{a.brief.headline || "Untitled Brief"}</div>
                  <div className="sourceMeta">{new Date(a.createdAt).toLocaleString()}</div>
                  <div className="sourceMeta">{a.coverageSummary}</div>
                </div>
              </div>
              <div className="row">
                <button
                  className="btn btnPrimary"
                  type="button"
                  onClick={() => {
                    onLoad(a.brief, a.sourceResults, a.coverageSummary);
                    setIsOpen(false);
                  }}
                >
                  Load
                </button>
                <button className="btn" type="button" onClick={() => handleExport(a)}>
                  {copyStatus === a.id ? "Copied!" : "Export MD"}
                </button>
                <button className="btn btnGhost" type="button" onClick={() => handleDelete(a.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
