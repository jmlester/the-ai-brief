"use client";

import { ReactNode } from "react";

export default function BriefCard({
  title,
  badge,
  sectionKey,
  collapsed,
  onToggle,
  children,
  emptyText,
  isEmpty
}: {
  title: string;
  badge: string;
  sectionKey: string;
  collapsed: boolean;
  onToggle: (key: string) => void;
  children: ReactNode;
  emptyText: string;
  isEmpty: boolean;
}) {
  return (
    <div className="briefCard">
      <div className="briefSectionHeader">
        <div className="sectionTitle">
          <h3>{title}</h3>
          <span>{badge}</span>
        </div>
        <button
          className="collapseToggle"
          onClick={() => onToggle(sectionKey)}
          type="button"
          aria-expanded={!collapsed}
          aria-controls={`section-${sectionKey}`}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      <div
        id={`section-${sectionKey}`}
        className={`briefCardContent ${collapsed ? "briefCardCollapsed" : "briefCardExpanded"}`}
        role="region"
        aria-labelledby={`heading-${sectionKey}`}
      >
        {!collapsed ? (
          isEmpty ? (
            <div className="emptyState">{emptyText}</div>
          ) : (
            children
          )
        ) : (
          <div className="kicker">Section collapsed.</div>
        )}
      </div>
    </div>
  );
}
