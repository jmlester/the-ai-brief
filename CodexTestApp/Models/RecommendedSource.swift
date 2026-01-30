import Foundation

struct RecommendedSource: Identifiable, Codable {
    let id: UUID
    let name: String
    let url: String
    let type: SourceType
    let category: String
    let summary: String
    let tags: [String]
}

enum SourceCatalog {
    static let all: [RecommendedSource] = [
        RecommendedSource(
            id: UUID(),
            name: "OpenAI Blog",
            url: "https://openai.com/blog/rss",
            type: .rss,
            category: "Labs",
            summary: "Research releases, product launches, and safety updates from OpenAI.",
            tags: ["models", "research", "product"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "Google AI Blog",
            url: "https://blog.google/technology/ai/rss/",
            type: .rss,
            category: "Labs",
            summary: "Updates on Google research, Gemini, and applied AI.",
            tags: ["research", "product", "enterprise"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "DeepMind Blog",
            url: "https://deepmind.google/blog/rss.xml",
            type: .rss,
            category: "Labs",
            summary: "Research highlights and frontier model advances from DeepMind.",
            tags: ["research", "frontier"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "Anthropic News",
            url: "https://www.anthropic.com/news.rss",
            type: .rss,
            category: "Labs",
            summary: "Anthropic announcements, research, and safety notes.",
            tags: ["safety", "models"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "The Verge AI",
            url: "https://www.theverge.com/rss/ai/index.xml",
            type: .rss,
            category: "Media",
            summary: "Mainstream coverage of AI products and industry moves.",
            tags: ["product", "industry"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "TechCrunch AI",
            url: "https://techcrunch.com/tag/artificial-intelligence/feed/",
            type: .rss,
            category: "Media",
            summary: "Startup funding, product launches, and market coverage.",
            tags: ["startups", "funding"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "VentureBeat AI",
            url: "https://venturebeat.com/category/ai/feed/",
            type: .rss,
            category: "Media",
            summary: "Enterprise AI news, tooling, and market analysis.",
            tags: ["enterprise", "tools"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "MIT Technology Review AI",
            url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
            type: .rss,
            category: "Media",
            summary: "High-quality reporting on AI research and impact.",
            tags: ["policy", "research"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "Ars Technica AI",
            url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
            type: .rss,
            category: "Media",
            summary: "Technical coverage of AI and computing trends.",
            tags: ["technical", "industry"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "The Decoder",
            url: "https://the-decoder.com/feed/",
            type: .rss,
            category: "Media",
            summary: "Daily AI coverage with product and lab updates.",
            tags: ["daily", "product"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "Hugging Face Blog",
            url: "https://huggingface.co/blog/feed.xml",
            type: .rss,
            category: "Community",
            summary: "Open-source models, datasets, and tutorials.",
            tags: ["open-source", "tools"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "Hacker News AI Search",
            url: "https://hnrss.org/newest?q=artificial%20intelligence",
            type: .rss,
            category: "Community",
            summary: "Fresh AI links from the HN community.",
            tags: ["community", "links"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "Reddit r/MachineLearning",
            url: "https://www.reddit.com/r/MachineLearning/.rss",
            type: .rss,
            category: "Community",
            summary: "Research discussions, paper highlights, and debates.",
            tags: ["research", "discussion"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "Papers with Code",
            url: "https://paperswithcode.com/feed.xml",
            type: .rss,
            category: "Research",
            summary: "New papers with code implementations.",
            tags: ["research", "code"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "arXiv AI (cs.AI)",
            url: "http://export.arxiv.org/rss/cs.AI",
            type: .rss,
            category: "Research",
            summary: "Latest arXiv submissions in AI.",
            tags: ["research", "papers"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "arXiv Machine Learning (cs.LG)",
            url: "http://export.arxiv.org/rss/cs.LG",
            type: .rss,
            category: "Research",
            summary: "Latest arXiv submissions in machine learning.",
            tags: ["research", "papers"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "NVIDIA AI Blog",
            url: "https://blogs.nvidia.com/blog/category/deep-learning/feed/",
            type: .rss,
            category: "Labs",
            summary: "Infrastructure and model updates from NVIDIA.",
            tags: ["hardware", "infrastructure"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "Stanford HAI News",
            url: "https://hai.stanford.edu/news/rss.xml",
            type: .rss,
            category: "Policy",
            summary: "Academic research, policy, and societal impact.",
            tags: ["policy", "academic"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "OECD AI Policy",
            url: "https://oecd.ai/en/rss",
            type: .rss,
            category: "Policy",
            summary: "Global policy updates and AI governance.",
            tags: ["policy", "government"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "Partnership on AI",
            url: "https://partnershiponai.org/feed/",
            type: .rss,
            category: "Policy",
            summary: "Best practices and policy frameworks.",
            tags: ["policy", "ethics"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "xAI",
            url: "https://x.com/xai",
            type: .social,
            category: "Social",
            summary: "Updates and announcements from xAI.",
            tags: ["social", "announcements"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "OpenAI",
            url: "https://x.com/OpenAI",
            type: .social,
            category: "Social",
            summary: "Official OpenAI social updates.",
            tags: ["social", "announcements"]
        ),
        RecommendedSource(
            id: UUID(),
            name: "Google DeepMind",
            url: "https://x.com/GoogleDeepMind",
            type: .social,
            category: "Social",
            summary: "DeepMind social updates and research signals.",
            tags: ["social", "research"]
        )
    ]
}
