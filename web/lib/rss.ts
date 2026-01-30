import { load } from "cheerio";
import Parser from "rss-parser";
import { NewsItem, Source, SourceResult } from "./types";

const parser = new Parser({
  customFields: {
    item: ["media:content"]
  }
});

type RSSItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  creator?: string;
  author?: string;
  enclosure?: { url?: string };
  [key: string]: unknown;
};

function safeDate(value?: string) {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function extractImage(item: RSSItem) {
  const enclosure = item.enclosure as { url?: string } | undefined;
  if (enclosure?.url) {
    return enclosure.url;
  }
  const media = item["media:content"] as { url?: string } | undefined;
  if (media?.url) {
    return media.url;
  }
  return undefined;
}

async function fetchRSS(url: string): Promise<RSSItem[]> {
  const feed = await parser.parseURL(url);
  const items = (feed.items as unknown) as RSSItem[];
  return items ?? [];
}

function normalizeHost(value: string) {
  return value.replace(/^www\\./, "").toLowerCase();
}

async function scrapeWebsite(source: Source): Promise<NewsItem[]> {
  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TheAIBrief/1.0)"
    }
  });
  if (!response.ok) {
    throw new Error(`Scrape failed (${response.status})`);
  }
  const html = await response.text();
  const $ = load(html);
  const baseUrl = new URL(source.url);
  const baseHost = normalizeHost(baseUrl.hostname);
  const candidates: { title: string; link: string }[] = [];
  const seen = new Set<string>();
  const selectors = ["article a", "h2 a", "h3 a", "a"];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const text = $(element).text().trim().replace(/\\s+/g, " ");
      const href = $(element).attr("href") ?? "";
      if (!text || text.length < 20 || text.length > 140) return;
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) {
        return;
      }
      let absolute: string;
      try {
        absolute = new URL(href, baseUrl).toString();
      } catch {
        return;
      }
      const host = normalizeHost(new URL(absolute).hostname);
      if (host !== baseHost) return;
      if (seen.has(absolute)) return;
      seen.add(absolute);
      candidates.push({ title: text, link: absolute });
    });
    if (candidates.length >= 12) break;
  }

  if (candidates.length === 0) {
    const title = $("title").text().trim();
    if (title) {
      candidates.push({ title, link: baseUrl.toString() });
    }
  }

  const now = new Date().toISOString();
  return candidates.slice(0, 12).map((item) => ({
    id: crypto.randomUUID(),
    title: item.title,
    source: source.name,
    url: item.link,
    publishedAt: now,
    summary: "",
    isPlaceholder: false,
    author: null,
    imageURL: null
  }));
}

function placeholderItem(source: Source, summary: string): NewsItem {
  return {
    id: crypto.randomUUID(),
    title: `Source queued: ${source.name}`,
    source: source.name,
    url: source.url,
    publishedAt: new Date().toISOString(),
    summary,
    isPlaceholder: true,
    author: null,
    imageURL: null
  };
}

export async function fetchRecentNews(sources: Source[], withinHours: number) {
  const cutoff = new Date(Date.now() - withinHours * 3600 * 1000);
  const collected: NewsItem[] = [];
  const results: SourceResult[] = [];

  for (const source of sources) {
    const isRSS = source.type === "rss";
    const ingestURL = source.ingestURL?.trim();
    const canIngest = isRSS || (!!ingestURL && ingestURL.length > 0);
    let mapped: NewsItem[] = [];
    try {
      if (canIngest) {
        const url = isRSS ? source.url : (ingestURL as string);
        try {
          const rssItems = await fetchRSS(url);
          mapped = rssItems
            .map((item) => {
              const title = (item.title ?? "").trim();
              if (!title) {
                return null;
              }
              const date = safeDate(item.isoDate ?? item.pubDate);
              return {
                id: crypto.randomUUID(),
                title,
                source: source.name,
                url: (item.link ?? source.url).trim(),
                publishedAt: date.toISOString(),
                summary: (item.contentSnippet ?? item.content ?? "").trim(),
                isPlaceholder: false,
                author: (item.creator ?? item.author ?? "").toString() || null,
                imageURL: extractImage(item) ?? null
              } as NewsItem;
            })
            .filter(Boolean) as NewsItem[];
        } catch (error) {
          if (source.allowScrape) {
            mapped = await scrapeWebsite(source);
          } else {
            throw error;
          }
        }
      } else if (source.allowScrape) {
        mapped = await scrapeWebsite(source);
      } else {
        collected.push(
          placeholderItem(source, "Add an RSS feed or enable webpage scrape for this source.")
        );
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          status: "queued"
        });
        continue;
      }

      const filtered = mapped.filter((item) => new Date(item.publishedAt) >= cutoff);

      if (filtered.length === 0 && mapped.length > 0) {
        const latest = mapped.sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        )[0];
        const fallbackSummary = latest.summary.length
          ? `${latest.summary}\n\nOlder than the selected time window.`
          : "Older than the selected time window.";
        collected.push({ ...latest, summary: fallbackSummary });
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          status: "empty"
        });
      } else {
        collected.push(...filtered);
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          status: filtered.length === 0 ? "empty" : "success",
          count: filtered.length
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        status: "failed",
        message
      });
    }
  }

  collected.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return { items: collected, results };
}
