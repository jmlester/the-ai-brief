import { NextResponse } from "next/server";
import { fetchRecentNews } from "../../../lib/rss";
import { Source, SourceResult } from "../../../lib/types";

export const runtime = "nodejs";

export type SourceCheckResult = SourceResult & {
  responseTimeMs: number;
  sampleTitles: string[];
};

export async function POST(request: Request) {
  const body = await request.json();
  const sources = (body.sources as Source[]) ?? [];
  const hours = Number(body.hours ?? 72);

  if (!Array.isArray(sources) || sources.length === 0) {
    return NextResponse.json({ error: "No sources provided." }, { status: 400 });
  }

  const results: SourceCheckResult[] = [];

  for (const source of sources) {
    const start = Date.now();
    try {
      const result = await fetchRecentNews([source], hours);
      const elapsed = Date.now() - start;
      const sr = result.results[0];
      const sampleTitles = result.items
        .filter((i) => !i.isPlaceholder)
        .slice(0, 3)
        .map((i) => i.title);

      results.push({
        sourceId: sr?.sourceId ?? source.id,
        sourceName: sr?.sourceName ?? source.name,
        status: sr?.status ?? "failed",
        count: sr?.count,
        message: sr?.message,
        responseTimeMs: elapsed,
        sampleTitles
      });
    } catch (error) {
      const elapsed = Date.now() - start;
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown error",
        responseTimeMs: elapsed,
        sampleTitles: []
      });
    }
  }

  return NextResponse.json({ results });
}
