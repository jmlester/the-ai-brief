import Foundation

struct NewsItem: Identifiable, Codable {
    let id: UUID
    let title: String
    let source: String
    let url: String
    let publishedAt: Date
    let summary: String
    let isPlaceholder: Bool
    let author: String?
    let imageURL: String?

    init(
        id: UUID,
        title: String,
        source: String,
        url: String,
        publishedAt: Date,
        summary: String,
        isPlaceholder: Bool = false,
        author: String? = nil,
        imageURL: String? = nil
    ) {
        self.id = id
        self.title = title
        self.source = source
        self.url = url
        self.publishedAt = publishedAt
        self.summary = summary
        self.isPlaceholder = isPlaceholder
        self.author = author
        self.imageURL = imageURL
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case title
        case source
        case url
        case publishedAt
        case summary
        case isPlaceholder
        case author
        case imageURL
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        source = try container.decode(String.self, forKey: .source)
        url = try container.decode(String.self, forKey: .url)
        publishedAt = try container.decode(Date.self, forKey: .publishedAt)
        summary = try container.decode(String.self, forKey: .summary)
        isPlaceholder = (try? container.decode(Bool.self, forKey: .isPlaceholder)) ?? false
        author = try? container.decode(String.self, forKey: .author)
        imageURL = try? container.decode(String.self, forKey: .imageURL)
    }
}
