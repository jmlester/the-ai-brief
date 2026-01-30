import Foundation

@MainActor
final class BriefViewModel: ObservableObject {
    @Published var brief: DailyBrief?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var lastGenerated: Date?
    @Published var statusMessage: String?
    @Published var streamingPreview: String = ""
    @Published var canCancel = false
    @Published var archive: [DailyBrief] = []
    @Published var sourceResults: [SourceFetchResult] = []
    @Published var coverageSummary: String = ""
    @Published var expandedWindowUsed = false
    @Published var sourceHealth: [UUID: SourceHealth] = [:]
    @Published var pinnedPrompts: [PromptIdea] = []

    private var currentTask: Task<Void, Never>?

    private let newsService = NewsService()
    private let aiClient = AIClient()
    private let archiveKey = "brief.archive"
    private let sourceHealthKey = "sources.health"
    private let promptLibraryKey = "prompt.library"
    private let offlineBriefsKey = "brief.offline"

    init() {
        loadArchive()
        brief = archive.first
        lastGenerated = archive.first?.date
        loadSourceHealth()
        loadPromptLibrary()
    }

    func startGeneration(settings: SettingsStore, sources: [Source]) {
        currentTask?.cancel()
        currentTask = Task {
            await generateBrief(settings: settings, sources: sources)
        }
    }

    func cancelGeneration() {
        currentTask?.cancel()
        currentTask = nil
        isLoading = false
        canCancel = false
        statusMessage = "Generation stopped."
    }

    private func generateBrief(settings: SettingsStore, sources: [Source]) async {
        errorMessage = nil
        isLoading = true
        canCancel = true
        statusMessage = "Collecting sources..."
        streamingPreview = ""
        expandedWindowUsed = false
        defer {
            isLoading = false
            canCancel = false
        }

        let activeSources = sources.filter { $0.isEnabled }
        guard !activeSources.isEmpty else {
            errorMessage = "Enable at least one source to build a brief."
            return
        }
        guard let configuration = settings.aiConfiguration else {
            errorMessage = "Add your API key and model in Settings."
            return
        }

        do {
            try Task.checkCancellation()
            var fetchWindow = settings.timeWindowHours
            var result = try await newsService.fetchRecentNews(from: activeSources, withinHours: fetchWindow)
            var items = result.items
            sourceResults = result.results
            updateSourceHealth(with: result.results)

            var promptItems = items.filter { !$0.isPlaceholder }
            let preferredSourceNames = activeSources.filter { $0.isPreferred }.map { $0.name }
            let preferredSet = Set(preferredSourceNames)
            promptItems = dedupe(promptItems)
            promptItems.sort {
                let lhsPreferred = preferredSet.contains($0.source)
                let rhsPreferred = preferredSet.contains($1.source)
                if lhsPreferred != rhsPreferred {
                    return lhsPreferred && !rhsPreferred
                }
                return $0.publishedAt > $1.publishedAt
            }
            if promptItems.count < 3, fetchWindow < 48 {
                expandedWindowUsed = true
                statusMessage = "Low volume, expanding window..."
                fetchWindow = 48
                result = try await newsService.fetchRecentNews(from: activeSources, withinHours: fetchWindow)
                items = result.items
                sourceResults = result.results
                updateSourceHealth(with: result.results)
                promptItems = dedupe(items.filter { !$0.isPlaceholder })
                promptItems.sort {
                    let lhsPreferred = preferredSet.contains($0.source)
                    let rhsPreferred = preferredSet.contains($1.source)
                    if lhsPreferred != rhsPreferred {
                        return lhsPreferred && !rhsPreferred
                    }
                    return $0.publishedAt > $1.publishedAt
                }
            }
            updateCoverageSummary(from: sourceResults, enabledCount: activeSources.count)
            try Task.checkCancellation()
            statusMessage = "Preparing request..."
            let responseText = try await aiClient.generateBrief(
                news: promptItems,
                configuration: configuration,
                tone: settings.tone,
                focusTopics: settings.focusTopics,
                preferredSources: preferredSourceNames,
                onStatus: { [weak self] status in
                    Task { @MainActor in
                        self?.statusMessage = status
                    }
                },
                onDelta: { [weak self] delta in
                    Task { @MainActor in
                        self?.streamingPreview += delta
                    }
                }
            )
            try Task.checkCancellation()
            statusMessage = "Parsing response..."
            let newBrief = BriefComposer.compose(from: responseText, sources: items)
            brief = newBrief
            lastGenerated = newBrief.date
            archiveBrief(newBrief)
            statusMessage = "Brief ready."
        } catch {
            if (error as? CancellationError) != nil {
                statusMessage = "Generation canceled."
                return
            }
            errorMessage = error.localizedDescription
        }
    }

    func selectArchived(_ brief: DailyBrief) {
        self.brief = brief
        lastGenerated = brief.date
    }

    func markdown(for brief: DailyBrief) -> String {
        var lines: [String] = []
        lines.append("# Daily Brief")
        lines.append("")
        lines.append("**Date:** \(brief.date.formatted(date: .long, time: .shortened))")
        lines.append("")
        lines.append("## Headline")
        lines.append(brief.topline)
        lines.append("")
        lines.append("## Other Headlines Summary")
        lines.append(brief.signalSummary)
        lines.append("")
        if !brief.signals.isEmpty {
            lines.append("## Other Stories")
            for group in brief.signals {
                lines.append("- **\(group.theme)**")
                for item in group.items {
                    let link = item.url.isEmpty ? "" : " (\(item.url))"
                    let source = item.source.isEmpty ? "" : " — \(item.source)"
                    lines.append("  - \(item.story)\(source)\(link)")
                }
            }
            lines.append("")
        }
        if !brief.deepDives.isEmpty {
            lines.append("## Deep Dives")
            for item in brief.deepDives {
                let link = item.url.isEmpty ? "" : " (\(item.url))"
                let source = item.source.isEmpty ? "" : " — \(item.source)"
                lines.append("- \(item.story)\(source)\(link)")
            }
            lines.append("")
        }
        if !brief.promptPack.isEmpty {
            lines.append("## Prompt Studio")
            for (index, item) in brief.promptPack.enumerated() {
                lines.append("\(index + 1). **\(item.task.isEmpty ? "Prompt" : item.task)**")
                lines.append("   - Prompt: \(item.prompt)")
                if !item.bestFor.isEmpty {
                    lines.append("   - Best For: \(item.bestFor)")
                }
                if !item.inputFormat.isEmpty {
                    lines.append("   - Input: \(item.inputFormat)")
                }
                if !item.outputFormat.isEmpty {
                    lines.append("   - Output: \(item.outputFormat)")
                }
            }
            lines.append("")
        }
        if !brief.watchlist.isEmpty {
            lines.append("## Tomorrow's Radar")
            for item in brief.watchlist {
                lines.append("- \(item)")
            }
            lines.append("")
        }
        let sources = brief.sources.filter { !$0.isPlaceholder }
        if !sources.isEmpty {
            lines.append("## Sources Used")
            for item in sources {
                lines.append("- \(item.title) — \(item.source) (\(item.url))")
            }
        }
        return lines.joined(separator: "\n")
    }

    private func archiveBrief(_ brief: DailyBrief) {
        if let first = archive.first,
           abs(first.date.timeIntervalSince(brief.date)) < 60,
           first.topline == brief.topline {
            return
        }
        archive.insert(brief, at: 0)
        if archive.count > 30 {
            archive = Array(archive.prefix(30))
        }
        saveArchive()
        saveOfflineBriefs()
    }

    private func loadArchive() {
        guard let data = UserDefaults.standard.data(forKey: archiveKey) else { return }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        if let decoded = try? decoder.decode([DailyBrief].self, from: data) {
            archive = decoded
        }
    }

    private func saveArchive() {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(archive) else { return }
        UserDefaults.standard.set(data, forKey: archiveKey)
    }

    private func saveOfflineBriefs() {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let recent = Array(archive.prefix(3))
        guard let data = try? encoder.encode(recent) else { return }
        UserDefaults.standard.set(data, forKey: offlineBriefsKey)
    }

    private func updateCoverageSummary(from results: [SourceFetchResult], enabledCount: Int) {
        let contributing = results.filter {
            if case let .success(count) = $0.status {
                return count > 0
            }
            return false
        }.count
        coverageSummary = "\(contributing) of \(enabledCount) sources contributed"
    }

    private func updateSourceHealth(with results: [SourceFetchResult]) {
        for result in results {
            let sourceId = result.source.id
            let snapshot = SourceStatusSnapshot(
                id: UUID(),
                date: result.fetchedAt,
                kind: mapStatusKind(result.status),
                count: statusCount(result.status),
                message: statusMessage(result.status)
            )
            if var existing = sourceHealth[sourceId] {
                existing.lastFetched = result.fetchedAt
                existing.history.insert(snapshot, at: 0)
                if existing.history.count > 5 {
                    existing.history = Array(existing.history.prefix(5))
                }
                sourceHealth[sourceId] = existing
            } else {
                sourceHealth[sourceId] = SourceHealth(
                    id: UUID(),
                    sourceId: sourceId,
                    lastFetched: result.fetchedAt,
                    history: [snapshot]
                )
            }
        }
        saveSourceHealth()
    }

    private func mapStatusKind(_ status: SourceFetchStatus) -> SourceStatusKind {
        switch status {
        case .success:
            return .success
        case .empty:
            return .empty
        case .failed:
            return .failed
        case .queued:
            return .queued
        }
    }

    private func statusCount(_ status: SourceFetchStatus) -> Int? {
        if case let .success(count) = status {
            return count
        }
        return nil
    }

    private func statusMessage(_ status: SourceFetchStatus) -> String? {
        if case let .failed(message) = status {
            return message
        }
        return nil
    }

    private func loadSourceHealth() {
        guard let data = UserDefaults.standard.data(forKey: sourceHealthKey) else { return }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        if let decoded = try? decoder.decode([SourceHealth].self, from: data) {
            sourceHealth = Dictionary(uniqueKeysWithValues: decoded.map { ($0.sourceId, $0) })
        }
    }

    private func saveSourceHealth() {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let values = Array(sourceHealth.values)
        guard let data = try? encoder.encode(values) else { return }
        UserDefaults.standard.set(data, forKey: sourceHealthKey)
    }

    func togglePinned(_ prompt: PromptIdea) {
        if let index = pinnedPrompts.firstIndex(where: { $0.id == prompt.id }) {
            pinnedPrompts.remove(at: index)
        } else {
            pinnedPrompts.insert(prompt, at: 0)
        }
        if pinnedPrompts.count > 50 {
            pinnedPrompts = Array(pinnedPrompts.prefix(50))
        }
        savePromptLibrary()
    }

    func isPinned(_ prompt: PromptIdea) -> Bool {
        pinnedPrompts.contains(where: { $0.id == prompt.id })
    }

    private func loadPromptLibrary() {
        guard let data = UserDefaults.standard.data(forKey: promptLibraryKey) else { return }
        let decoder = JSONDecoder()
        if let decoded = try? decoder.decode([PromptIdea].self, from: data) {
            pinnedPrompts = decoded
        }
    }

    private func savePromptLibrary() {
        let encoder = JSONEncoder()
        guard let data = try? encoder.encode(pinnedPrompts) else { return }
        UserDefaults.standard.set(data, forKey: promptLibraryKey)
    }

    private func dedupe(_ items: [NewsItem]) -> [NewsItem] {
        var seen: [String: NewsItem] = [:]
        for item in items {
            let key = normalizeTitle(item.title)
            if let existing = seen[key] {
                if item.publishedAt > existing.publishedAt {
                    seen[key] = item
                }
            } else {
                seen[key] = item
            }
        }
        return Array(seen.values)
    }

    private func normalizeTitle(_ title: String) -> String {
        let lower = title.lowercased()
        let cleaned = lower.replacingOccurrences(of: "[^a-z0-9\\s]", with: " ", options: .regularExpression)
        let parts = cleaned.split(separator: " ").filter { $0.count > 2 }
        return parts.map { String($0) }.joined(separator: " ")
    }
}
