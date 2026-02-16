"use client";

import { useEffect, useState } from "react";

type OnboardingStep = {
  key: string;
  title: string;
  body: string;
  actionLabel: string;
  targetTab: string;
};

const onboardingSteps: OnboardingStep[] = [
  {
    key: "apiKey",
    title: "1. Add your API key",
    body: "Head to Settings and add your OpenAI API key so the app can generate briefs. You can also set the OPENAI_API_KEY environment variable on Vercel.",
    actionLabel: "Go to Settings",
    targetTab: "settings"
  },
  {
    key: "sources",
    title: "2. Enable sources",
    body: "Pick feeds from the recommended catalog, mark your favorites as preferred, and enable scraping for sources without RSS. The more sources you enable, the richer your brief.",
    actionLabel: "Go to Sources",
    targetTab: "sources"
  },
  {
    key: "generate",
    title: "3. Generate your first brief",
    body: "Click \"Generate Brief\" at the top of the page. The app will collect articles from your sources, stream them through the AI, and build your personalized brief.",
    actionLabel: "Go to Dashboard",
    targetTab: "dashboard"
  },
  {
    key: "share",
    title: "4. Share or download",
    body: "Once your brief is ready, use \"Share Brief\" to send it via your device's share sheet, or \"Download\" to save a formatted HTML document with clickable links you can send to anyone.",
    actionLabel: "Go to Brief",
    targetTab: "brief"
  }
];

const ONBOARDING_KEY = "dailyplaybook.onboarding";

export default function OnboardingTab({
  hasApiKey,
  enabledSourceCount,
  hasBrief,
  onNavigate
}: {
  hasApiKey: boolean;
  enabledSourceCount: number;
  hasBrief: boolean;
  onNavigate: (tab: string) => void;
}) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ONBOARDING_KEY);
      if (stored) setCompleted(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Auto-detect completion from app state
  useEffect(() => {
    const updates: Record<string, boolean> = {};
    if (hasApiKey) updates.apiKey = true;
    if (enabledSourceCount >= 1) updates.sources = true;
    if (hasBrief) updates.generate = true;

    setCompleted((prev) => {
      const next = { ...prev, ...updates };
      try { window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [hasApiKey, enabledSourceCount, hasBrief]);

  const markDone = (key: string) => {
    setCompleted((prev) => {
      const next = { ...prev, [key]: true };
      try { window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const completedCount = onboardingSteps.filter((s) => completed[s.key]).length;
  const progressPct = Math.round((completedCount / onboardingSteps.length) * 100);

  return (
    <div className="panel stack">
      <h2>Getting Started</h2>

      <div className="onboardingProgress">
        <div className="onboardingProgressBar">
          <div className="onboardingProgressFill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="kicker">{completedCount} of {onboardingSteps.length} steps complete</div>
      </div>

      <div className="onboarding" id="onboarding">
        <div className="onboardingSteps">
          {onboardingSteps.map((step) => {
            const isDone = !!completed[step.key];
            return (
              <div
                key={step.key}
                className={`onboardingStep ${isDone ? "onboardingStepDone" : ""}`}
              >
                <div className="onboardingStepHeader">
                  <div className="onboardingStepCheck">
                    {isDone ? (
                      <span className="onboardingCheckmark">&#10003;</span>
                    ) : (
                      <span className="onboardingCircle" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="subCardTitle">{step.title}</div>
                    <p className="kicker" style={{ marginTop: 4 }}>{step.body}</p>
                  </div>
                </div>
                <div className="onboardingStepActions">
                  <button
                    className="btn btnPrimary"
                    type="button"
                    onClick={() => {
                      onNavigate(step.targetTab);
                      markDone(step.key);
                    }}
                  >
                    {step.actionLabel}
                  </button>
                  {!isDone && (
                    <button
                      className="btn btnGhost"
                      type="button"
                      onClick={() => markDone(step.key)}
                    >
                      Mark as done
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {completedCount === onboardingSteps.length && (
        <div className="onboardingComplete">
          All set! You can always return here from the Guide tab if you need a refresher.
        </div>
      )}
    </div>
  );
}
