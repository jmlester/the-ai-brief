# ROADMAP

Last updated: 2026-01-26

## High Impact (Now)
- Source health and coverage transparency
  - Show per-source fetch status: success/failed/empty and last fetched timestamp.
  - Surface % of selected sources contributing to the brief.
  - Highlight silent sources in Sources and Brief footer.
- Low-input guardrails
  - If ingestible items < 3, expand time window to 48h (with visible badge) or prompt user to widen.
  - Enforce minimum unique items per section to avoid repetition.
- Streaming robustness
  - Display status phases: Connecting → Streaming → Parsing → Ready.
  - Auto-retry once on timeout/stall with visible “Retrying…” status.

## UX / UI Quick Wins (Now)
- Typographic consistency across all section headers (size/weight/spacing).
- Normalize card padding/radius to one system across sections.
- Group timeline sections using subtle background blocks or separators.
- “Other Stories” themes collapsible; add “Expand all / Collapse all”.
- Prompt Studio controls: per-card expand + “Expand all / Collapse all”.

## Product Usefulness (Next)
- Source health dashboard (in Sources view)
  - Coverage chart and last success timestamps.
  - Quick toggle/edit inline.
- Brief archive improvements
  - Search, filter by date/source/theme.
  - Export to Markdown/PDF; share sheet.
- Personalization
  - Focus topics and preferred sources weighting.
  - Model choice presets for Executive/Builder/Research modes.
- Prompt reuse
  - Pin prompts to a “Prompt Library”.
  - One-tap copy + tag prompts.

## Capability Expansions (Later)
- RSS enrichment: article metadata, images, authors.
- Deduplication and clustering across sources.
- Social ingestion via RSS bridge or API integrations.
- Optional notifications/reminders to generate briefs.
- Offline caching for last 3 briefs and sources.
