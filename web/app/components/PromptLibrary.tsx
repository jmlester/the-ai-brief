"use client";

import { useState } from "react";
import { loadSavedPrompts, removeSavedPrompt } from "../../lib/storage";
import { SavedPrompt } from "../../lib/types";

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState<SavedPrompt[]>(() => loadSavedPrompts());
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(id);
      setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      // fallback
    }
  };

  const handleRemove = (id: string) => {
    const updated = removeSavedPrompt(id);
    setPrompts(updated);
  };

  if (prompts.length === 0) {
    return (
      <div className="emptyState">
        Pin prompts from the Prompt Studio section in your brief to build a library.
      </div>
    );
  }

  return (
    <div className="stack">
      {prompts.map((p) => (
        <div key={p.id} className="subCard">
          <div className="subCardTitle">{p.task}</div>
          <div className="subCardMeta">{p.prompt}</div>
          {p.bestFor && <div className="subCardMeta">Best for: {p.bestFor}</div>}
          <div className="row">
            <button
              className="btn"
              type="button"
              onClick={() => handleCopy(p.prompt, p.id)}
            >
              {copyStatus === p.id ? "Copied!" : "Copy"}
            </button>
            <button className="btn btnGhost" type="button" onClick={() => handleRemove(p.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
