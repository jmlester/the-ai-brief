import Foundation

struct DailyBrief: Identifiable, Codable {
    let id: UUID
    let date: Date
    let topline: String
    let signalSummary: String
    let signals: [SignalGroup]
    let deepDives: [DeepDive]
    let promptPack: [PromptIdea]
    let watchlist: [String]
    let sources: [NewsItem]
}

struct SignalGroup: Identifiable, Codable {
    let id: UUID
    let theme: String
    let items: [SignalItem]
}

struct SignalItem: Identifiable, Codable {
    let id: UUID
    let story: String
    let source: String
    let url: String
}

struct DeepDive: Identifiable, Codable {
    let id: UUID
    let story: String
    let source: String
    let url: String
}

struct PromptIdea: Identifiable, Codable {
    let id: UUID
    let task: String
    let prompt: String
    let bestFor: String
    let inputFormat: String
    let outputFormat: String
}

extension DailyBrief {
    var dashboardSummary: String {
        var parts: [String] = []
        if !topline.isEmpty {
            parts.append(topline)
        }
        if !signalSummary.isEmpty {
            parts.append(signalSummary)
        }
        let combined = parts.joined(separator: " ")
        return String(combined.prefix(360))
    }
}
