import Foundation

final class RSSParser: NSObject, XMLParserDelegate {
    struct Item {
        let title: String
        let link: String
        let pubDate: Date
        let summary: String
        let author: String
        let imageURL: String
    }

    private var items: [Item] = []
    private var currentElement = ""
    private var currentTitle = ""
    private var currentLink = ""
    private var currentDate = ""
    private var currentSummary = ""
    private var currentAuthor = ""
    private var currentImageURL = ""
    private let dateParser = RSSDateParser()

    func parse(data: Data) -> [Item] {
        let parser = XMLParser(data: data)
        parser.delegate = self
        parser.parse()
        return items
    }

    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?,
                qualifiedName qName: String?, attributes attributeDict: [String: String] = [:]) {
        currentElement = elementName.lowercased()
        if currentElement == "item" || currentElement == "entry" {
            currentTitle = ""
            currentLink = ""
            currentDate = ""
            currentSummary = ""
            currentAuthor = ""
            currentImageURL = ""
        }
        if currentElement == "link", let href = attributeDict["href"], !href.isEmpty {
            currentLink = href
        }
        if currentElement == "media:content" || currentElement == "enclosure" {
            if let url = attributeDict["url"], !url.isEmpty, currentImageURL.isEmpty {
                currentImageURL = url
            }
        }
    }

    func parser(_ parser: XMLParser, foundCharacters string: String) {
        switch currentElement {
        case "title":
            currentTitle += string
        case "link":
            if currentLink.isEmpty {
                currentLink += string
            }
        case "pubdate", "published", "updated":
            currentDate += string
        case "description", "summary", "content":
            currentSummary += string
        case "author", "dc:creator":
            currentAuthor += string
        default:
            break
        }
    }

    func parser(_ parser: XMLParser, didEndElement elementName: String, namespaceURI: String?,
                qualifiedName qName: String?) {
        let name = elementName.lowercased()
        if name == "item" || name == "entry" {
            let title = currentTitle.trimmingCharacters(in: .whitespacesAndNewlines)
            let link = currentLink.trimmingCharacters(in: .whitespacesAndNewlines)
            let summary = currentSummary.trimmingCharacters(in: .whitespacesAndNewlines)
            let author = currentAuthor.trimmingCharacters(in: .whitespacesAndNewlines)
            let imageURL = currentImageURL.trimmingCharacters(in: .whitespacesAndNewlines)
            let date = dateParser.parse(currentDate) ?? Date()
            if !title.isEmpty {
                items.append(Item(title: title, link: link, pubDate: date, summary: summary, author: author, imageURL: imageURL))
            }
        }
        currentElement = ""
    }
}

private final class RSSDateParser {
    private let formatters: [DateFormatter] = {
        let enUS = Locale(identifier: "en_US_POSIX")
        let formatterStrings = [
            "EEE, dd MMM yyyy HH:mm:ss Z",
            "EEE, dd MMM yyyy HH:mm Z",
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
            "yyyy-MM-dd HH:mm:ss Z"
        ]
        return formatterStrings.map { format in
            let formatter = DateFormatter()
            formatter.locale = enUS
            formatter.dateFormat = format
            return formatter
        }
    }()

    func parse(_ string: String) -> Date? {
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        for formatter in formatters {
            if let date = formatter.date(from: trimmed) {
                return date
            }
        }
        return nil
    }
}
