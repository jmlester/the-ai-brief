import Foundation

final class SourceStore: ObservableObject {
    @Published var sources: [Source] = [] {
        didSet { persist() }
    }

    private let defaults = UserDefaults.standard
    private let key = "sources.store"

    init() {
        load()
        if sources.isEmpty {
            sources = [
                Source(id: UUID(), name: "OpenAI Blog", url: "https://openai.com/blog/rss", type: .rss, isEnabled: true, isPreferred: true),
                Source(id: UUID(), name: "The Verge AI", url: "https://www.theverge.com/rss/ai/index.xml", type: .rss, isEnabled: true),
                Source(id: UUID(), name: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", type: .rss, isEnabled: false, isPreferred: true),
                Source(id: UUID(), name: "X Trends", url: "https://x.com", type: .social, isEnabled: false)
            ]
        }
    }

    func addSource(name: String, url: String, type: SourceType, ingestURL: String?) {
        guard !contains(url: url) else { return }
        let newSource = Source(id: UUID(), name: name, url: url, type: type, isEnabled: true, ingestURL: ingestURL)
        sources.append(newSource)
    }

    func toggle(_ source: Source) {
        guard let index = sources.firstIndex(where: { $0.id == source.id }) else { return }
        sources[index].isEnabled.toggle()
    }

    func togglePreferred(_ source: Source) {
        guard let index = sources.firstIndex(where: { $0.id == source.id }) else { return }
        sources[index].isPreferred.toggle()
    }

    func delete(at offsets: IndexSet) {
        sources.remove(atOffsets: offsets)
    }

    func addRecommended(_ recommended: RecommendedSource) {
        addSource(name: recommended.name, url: recommended.url, type: recommended.type, ingestURL: nil)
    }

    func contains(url: String) -> Bool {
        let trimmed = url.trimmingCharacters(in: .whitespacesAndNewlines)
        return sources.contains { $0.url.caseInsensitiveCompare(trimmed) == .orderedSame }
    }

    private func load() {
        guard let data = defaults.data(forKey: key),
              let decoded = try? JSONDecoder().decode([Source].self, from: data) else {
            sources = []
            return
        }
        sources = decoded
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(sources) else { return }
        defaults.set(data, forKey: key)
    }
}
