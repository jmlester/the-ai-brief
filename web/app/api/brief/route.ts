import { NextResponse } from "next/server";
import { buildPrompt } from "../../../lib/prompt";
import { fetchRecentNews } from "../../../lib/rss";
import { NewsItem, Source } from "../../../lib/types";

export const runtime = "nodejs";

type Settings = {
  apiKey?: string;
  model: string;
  tone: string;
  focusTopics: string;
  timeWindowHours: number;
  theme?: string;
};

function temperatureForModel(model: string) {
  const trimmed = model.trim().toLowerCase();
  if (trimmed.startsWith("gpt-5")) {
    return null;
  }
  return 0.4;
}

function normalizeTitle(title: string) {
  const lower = title.toLowerCase();
  const cleaned = lower.replace(/[^a-z0-9\s]/g, " ");
  const parts = cleaned.split(" ").filter((part) => part.length > 2);
  return parts.join(" ");
}

function dedupe(items: NewsItem[]) {
  const seen = new Map<string, NewsItem>();
  for (const item of items) {
    const key = normalizeTitle(item.title);
    const existing = seen.get(key);
    if (!existing || new Date(item.publishedAt) > new Date(existing.publishedAt)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

export async function POST(request: Request) {
  const body = await request.json();
  const sources = (body.sources as Source[]) ?? [];
  const settings = body.settings as Settings;

  if (!settings || !settings.model) {
    return NextResponse.json({ error: "Missing model in settings." }, { status: 400 });
  }
  if (!Array.isArray(sources) || sources.length === 0) {
    return NextResponse.json({ error: "No sources provided." }, { status: 400 });
  }

  const activeSources = sources.filter((source) => source.isEnabled);
  if (activeSources.length === 0) {
    return NextResponse.json(
      { error: "Enable at least one source to build a brief." },
      { status: 400 }
    );
  }

  const apiKey = settings.apiKey?.trim() || process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OpenAI API key. Add it in the UI or set OPENAI_API_KEY." },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, payload: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
        );
      };

      const fail = (message: string, status = 500) => {
        send("error", { message, status });
        controller.close();
      };

      try {
        send("status", { message: "Collecting sources..." });

        const preferredSources = activeSources.filter((s) => s.isPreferred).map((s) => s.name);
        const preferredSet = new Set(preferredSources);

        let fetchWindow = Number(settings.timeWindowHours || 24);
        let result = await fetchRecentNews(activeSources, fetchWindow);
        let items = result.items;
        let sourceResults = result.results;

        let promptItems = dedupe(items.filter((item) => !item.isPlaceholder));
        promptItems.sort((a, b) => {
          const lhsPreferred = preferredSet.has(a.source);
          const rhsPreferred = preferredSet.has(b.source);
          if (lhsPreferred !== rhsPreferred) {
            return lhsPreferred ? -1 : 1;
          }
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });

        let expandedWindowUsed = false;
        if (promptItems.length < 3 && fetchWindow < 48) {
          expandedWindowUsed = true;
          send("status", { message: "Low volume, expanding window..." });
          fetchWindow = 48;
          result = await fetchRecentNews(activeSources, fetchWindow);
          items = result.items;
          sourceResults = result.results;
          promptItems = dedupe(items.filter((item) => !item.isPlaceholder));
          promptItems.sort((a, b) => {
            const lhsPreferred = preferredSet.has(a.source);
            const rhsPreferred = preferredSet.has(b.source);
            if (lhsPreferred !== rhsPreferred) {
              return lhsPreferred ? -1 : 1;
            }
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
          });
        }

        const contributing = sourceResults.filter((result) => {
          return result.status === "success" && (result.count ?? 0) > 0;
        }).length;
        const coverageSummary = `${contributing} of ${activeSources.length} sources contributed`;

        const prompt = buildPrompt({
          news: promptItems,
          tone: settings.tone,
          focusTopics: settings.focusTopics,
          preferredSources,
          timeWindowHours: fetchWindow
        });

        const temperature = temperatureForModel(settings.model);

        send("status", { message: "Generating brief..." });

        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: settings.model,
            input: [
              { role: "system", content: "You are an expert AI news editor." },
              { role: "user", content: prompt }
            ],
            temperature: temperature ?? undefined,
            stream: true
          })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message = (data as any)?.error?.message ?? "AI request failed.";
          fail(message, response.status);
          return;
        }

        if (!response.body) {
          fail("AI stream was unavailable.");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const lines = part.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              let json: any;
              try {
                json = JSON.parse(payload);
              } catch {
                continue;
              }
              if (json.type === "response.output_text.delta") {
                const delta =
                  typeof json.delta === "string"
                    ? json.delta
                    : json.delta?.text || json.text || "";
                if (delta) {
                  fullText += delta;
                  send("delta", { text: delta });
                }
              } else if (json.type === "response.error") {
                const message = json.error?.message ?? "AI stream error.";
                fail(message);
                return;
              }
            }
          }
        }

        send("status", { message: "Parsing response..." });
        send("done", {
          text: fullText,
          sourceResults,
          coverageSummary,
          expandedWindowUsed
        });
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        fail(message);
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
