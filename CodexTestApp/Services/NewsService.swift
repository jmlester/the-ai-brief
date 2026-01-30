import Foundation

final class NewsService {
    private let rssParser = RSSParser()

    func fetchRecentNews(from sources: [Source], withinHours hours: Double) async throws -> (items: [NewsItem], results: [SourceFetchResult]) {
        let cutoff = Date().addingTimeInterval(-(hours * 3600))
        var collected: [NewsItem] = []
        var results: [SourceFetchResult] = []

        for source in sources {
            switch source.type {
            case .rss:
                do {
                    let rssItems = try await fetchRSS(from: source.url)
                    let items = rssItems
                        .filter { $0.pubDate >= cutoff }
                        .map {
                        NewsItem(
                            id: UUID(),
                            title: $0.title,
                            source: source.name,
                            url: $0.link,
                            publishedAt: $0.pubDate,
                            summary: $0.summary,
                            isPlaceholder: false,
                            author: $0.author.isEmpty ? nil : $0.author,
                            imageURL: $0.imageURL.isEmpty ? nil : $0.imageURL
                        )
                    }
                    if items.isEmpty, let latest = rssItems.max(by: { $0.pubDate < $1.pubDate }) {
                        let fallbackSummary = latest.summary.isEmpty
                            ? "Older than the selected time window."
                            : "\(latest.summary)\n\nOlder than the selected time window."
                        collected.append(
                            NewsItem(
                                id: UUID(),
                            title: latest.title,
                            source: source.name,
                            url: latest.link,
                            publishedAt: latest.pubDate,
                            summary: fallbackSummary,
                            isPlaceholder: false,
                            author: latest.author.isEmpty ? nil : latest.author,
                            imageURL: latest.imageURL.isEmpty ? nil : latest.imageURL
                        )
                    )
                        results.append(
                            SourceFetchResult(
                                source: source,
                                status: .empty,
                                fetchedAt: Date()
                            )
                        )
                    } else {
                        collected.append(contentsOf: items)
                        results.append(
                            SourceFetchResult(
                                source: source,
                                status: .success(count: items.count),
                                fetchedAt: Date()
                            )
                        )
                    }
                } catch {
                    results.append(
                        SourceFetchResult(
                            source: source,
                            status: .failed(message: error.localizedDescription),
                            fetchedAt: Date()
                        )
                    )
                }
            case .website, .newsletter, .social:
                if source.type == .social, let ingest = source.ingestURL, !ingest.isEmpty {
                    do {
                        let rssItems = try await fetchRSS(from: ingest)
                        let items = rssItems
                            .filter { $0.pubDate >= cutoff }
                            .map {
                                NewsItem(
                                    id: UUID(),
                                    title: $0.title,
                                    source: source.name,
                                    url: $0.link,
                                    publishedAt: $0.pubDate,
                                    summary: $0.summary,
                                    isPlaceholder: false,
                                    author: $0.author.isEmpty ? nil : $0.author,
                                    imageURL: $0.imageURL.isEmpty ? nil : $0.imageURL
                                )
                            }
                        collected.append(contentsOf: items)
                        results.append(
                            SourceFetchResult(
                                source: source,
                                status: items.isEmpty ? .empty : .success(count: items.count),
                                fetchedAt: Date()
                            )
                        )
                        break
                    } catch {
                        results.append(
                            SourceFetchResult(
                                source: source,
                                status: .failed(message: error.localizedDescription),
                                fetchedAt: Date()
                            )
                        )
                        break
                    }
                }
                let fallback = NewsItem(
                    id: UUID(),
                    title: "Source queued: \(source.name)",
                    source: source.name,
                    url: source.url,
                    publishedAt: Date(),
                    summary: "Add an RSS feed or connect an API to ingest this source.",
                    isPlaceholder: true,
                    author: nil,
                    imageURL: nil
                )
                collected.append(fallback)
                results.append(
                    SourceFetchResult(
                        source: source,
                        status: .queued,
                        fetchedAt: Date()
                    )
                )
            }
        }

        return (collected.sorted { $0.publishedAt > $1.publishedAt }, results)
    }

    private func fetchRSS(from urlString: String) async throws -> [RSSParser.Item] {
        guard let url = URL(string: urlString) else {
            throw NewsServiceError.invalidURL
        }
        let (data, _) = try await URLSession.shared.data(from: url)
        return rssParser.parse(data: data)
    }
}

enum NewsServiceError: LocalizedError {
    case invalidURL

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "One of the sources has an invalid URL."
        }
    }
}

struct SourceFetchResult: Identifiable {
    let id = UUID()
    let source: Source
    let status: SourceFetchStatus
    let fetchedAt: Date
}

enum SourceFetchStatus: Equatable {
    case success(count: Int)
    case empty
    case failed(message: String)
    case queued
}
