import { NextResponse } from "next/server";
import { fetchRecentNews } from "../../../lib/rss";
import { Source } from "../../../lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const sources = (body.sources as Source[]) ?? [];
  const hours = Number(body.hours ?? 24);

  if (!Array.isArray(sources) || sources.length === 0) {
    return NextResponse.json({ error: "No sources provided." }, { status: 400 });
  }

  try {
    const result = await fetchRecentNews(sources, hours);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
