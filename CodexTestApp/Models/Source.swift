import Foundation

enum SourceType: String, Codable, CaseIterable, Identifiable {
    case website
    case newsletter
    case rss
    case social

    var id: String { rawValue }

    var label: String {
        switch self {
        case .website:
            return "Website"
        case .newsletter:
            return "Newsletter"
        case .rss:
            return "RSS"
        case .social:
            return "Social"
        }
    }

    var systemImage: String {
        switch self {
        case .website:
            return "globe"
        case .newsletter:
            return "envelope.badge"
        case .rss:
            return "dot.radiowaves.left.and.right"
        case .social:
            return "bubble.left.and.bubble.right"
        }
    }
}

struct SourceHealth: Identifiable, Codable {
    let id: UUID
    let sourceId: UUID
    var lastFetched: Date
    var history: [SourceStatusSnapshot]
}

struct SourceStatusSnapshot: Codable, Identifiable {
    let id: UUID
    let date: Date
    let kind: SourceStatusKind
    let count: Int?
    let message: String?
}

enum SourceStatusKind: String, Codable {
    case success
    case empty
    case failed
    case queued
}

struct Source: Identifiable, Codable {
    let id: UUID
    var name: String
    var url: String
    var type: SourceType
    var isEnabled: Bool
    var isPreferred: Bool
    var ingestURL: String?

    init(
        id: UUID,
        name: String,
        url: String,
        type: SourceType,
        isEnabled: Bool,
        isPreferred: Bool = false,
        ingestURL: String? = nil
    ) {
        self.id = id
        self.name = name
        self.url = url
        self.type = type
        self.isEnabled = isEnabled
        self.isPreferred = isPreferred
        self.ingestURL = ingestURL
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case name
        case url
        case type
        case isEnabled
        case isPreferred
        case ingestURL
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        url = try container.decode(String.self, forKey: .url)
        type = try container.decode(SourceType.self, forKey: .type)
        isEnabled = try container.decode(Bool.self, forKey: .isEnabled)
        isPreferred = (try? container.decode(Bool.self, forKey: .isPreferred)) ?? false
        ingestURL = try? container.decode(String.self, forKey: .ingestURL)
    }
}
