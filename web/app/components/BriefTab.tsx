"use client";

import { BriefSections, SourceResult } from "../../lib/types";
import { StoredSettings, pinPrompt } from "../../lib/storage";
import BriefCard from "./BriefCard";
import SourceHealthPanel from "./SourceHealthPanel";
import ArchiveDrawer from "./ArchiveDrawer";
import SkeletonCard from "./SkeletonCard";

export default function BriefTab({
  brief,
  settings,
  sourceResults,
  lastHealthUpdate,
  isHealthLoading,
  isLoading,
  collapsedSections,
  onToggleSection,
  onExpandAll,
  onCollapseAll,
  onRefreshHealth,
  onSetTab,
  onLoadArchive,
  sourceHomeUrl,
  silentSources
}: {
  brief: BriefSections | null;
  settings: StoredSettings;
  sourceResults: SourceResult[];
  lastHealthUpdate: string;
  isHealthLoading: boolean;
  isLoading: boolean;
  collapsedSections: Record<string, boolean>;
  onToggleSection: (key: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onRefreshHealth: () => void;
  onSetTab: (tab: string) => void;
  onLoadArchive: (brief: BriefSections, sourceResults: SourceResult[], coverageSummary: string) => void;
  sourceHomeUrl: (name: string) => string;
  silentSources: SourceResult[];
}) {
  const handlePinPrompt = (item: { task: string; prompt: string; bestFor: string; inputFormat: string; outputFormat: string }) => {
    pinPrompt(item);
  };

  const handleCopyPrompt = async (text: string, btn: HTMLButtonElement) => {
    try {
      await navigator.clipboard.writeText(text);
      const orig = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = orig; }, 1500);
    } catch {
      // fallback
    }
  };

  if (isLoading && !brief) {
    return (
      <div className="briefLayout">
        <div className="briefSection">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <aside className="stack">
          <SkeletonCard />
        </aside>
      </div>
    );
  }

  return (
    <div className="briefLayout">
      <div className="briefSection">
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" type="button" onClick={onExpandAll}>Expand All</button>
          <button className="btn" type="button" onClick={onCollapseAll}>Collapse All</button>
        </div>

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

        <BriefCard
          title="Other Stories"
          badge="Themes"
          sectionKey="otherStories"
          collapsed={!!collapsedSections.otherStories}
          onToggle={onToggleSection}
          emptyText="Themes will show after generation."
          isEmpty={!brief?.otherStories?.length}
        >
          <div className="stack">
            {brief?.otherStories?.map((group, index) => (
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
                              <a className="sourcePill" href={homeUrl} target="_blank" rel="noreferrer">
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
        </BriefCard>

        <BriefCard
          title="Deep Dives"
          badge="Details"
          sectionKey="deepDives"
          collapsed={!!collapsedSections.deepDives}
          onToggle={onToggleSection}
          emptyText="Detailed items appear here."
          isEmpty={!brief?.deepDives?.length}
        >
          <div className="subCardGrid">
            {brief?.deepDives?.map((item, index) => {
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
                        <a className="sourcePill" href={homeUrl} target="_blank" rel="noreferrer">
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
        </BriefCard>

        <BriefCard
          title="Prompt Studio"
          badge="Ideas"
          sectionKey="promptStudio"
          collapsed={!!collapsedSections.promptStudio}
          onToggle={onToggleSection}
          emptyText="Prompts show up once generated."
          isEmpty={!brief?.promptStudio?.length}
        >
          <div className="subCardGrid">
            {brief?.promptStudio?.map((item, index) => (
              <div className="subCard" key={`${item.task}-${index}`}>
                <div className="subCardTitle">{item.task || `Prompt ${index + 1}`}</div>
                <div className="subCardMeta">{item.prompt}</div>
                {item.bestFor && <div className="subCardMeta">Best for: {item.bestFor}</div>}
                {item.inputFormat && <div className="subCardMeta">Input: {item.inputFormat}</div>}
                {item.outputFormat && <div className="subCardMeta">Output: {item.outputFormat}</div>}
                <div className="row">
                  <button
                    className="btn"
                    type="button"
                    onClick={(e) => handleCopyPrompt(item.prompt, e.currentTarget)}
                  >
                    Copy
                  </button>
                  <button
                    className="btn btnGhost"
                    type="button"
                    onClick={() => handlePinPrompt(item)}
                  >
                    Pin
                  </button>
                </div>
              </div>
            ))}
          </div>
        </BriefCard>

        <BriefCard
          title="Tools & Launches"
          badge="New"
          sectionKey="toolsAndLaunches"
          collapsed={!!collapsedSections.toolsAndLaunches}
          onToggle={onToggleSection}
          emptyText="New tools and launches appear here."
          isEmpty={!brief?.toolsAndLaunches?.length}
        >
          <div className="subCardGrid">
            {brief?.toolsAndLaunches?.map((item, index) => {
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
                        <a className="sourcePill" href={homeUrl} target="_blank" rel="noreferrer">
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
        </BriefCard>

        <BriefCard
          title="Quick Links"
          badge="More"
          sectionKey="quickLinks"
          collapsed={!!collapsedSections.quickLinks}
          onToggle={onToggleSection}
          emptyText="Additional stories appear here."
          isEmpty={!brief?.quickLinks?.length}
        >
          <div className="subCardGrid">
            {brief?.quickLinks?.map((item, index) => {
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
                        <a className="sourcePill" href={homeUrl} target="_blank" rel="noreferrer">
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
        </BriefCard>
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
            <button className="btn" onClick={() => onSetTab("sources")}>
              Manage Sources
            </button>
            <button className="btn btnGhost" onClick={() => onSetTab("settings")}>
              Adjust Settings
            </button>
            <ArchiveDrawer onLoad={onLoadArchive} />
          </div>
        </div>
        <SourceHealthPanel
          sourceResults={sourceResults}
          lastHealthUpdate={lastHealthUpdate}
          isHealthLoading={isHealthLoading}
          onRefresh={onRefreshHealth}
          silentSources={silentSources}
        />
      </aside>
    </div>
  );
}
