import Foundation

enum BriefComposer {
    static func compose(from text: String, sources: [NewsItem]) -> DailyBrief {
        let sections = splitSections(text: text)
        let topline = sections.topline.isEmpty
            ? text.trimmingCharacters(in: .whitespacesAndNewlines)
            : sections.topline
        let signalSummary = sections.signalSummary
        let signals = sections.signals
        let deepDives = sections.deepDives
        let promptPack = sections.promptPack
        let watchlist = sections.watchlist

        return DailyBrief(
            id: UUID(),
            date: Date(),
            topline: topline,
            signalSummary: signalSummary,
            signals: signals,
            deepDives: deepDives,
            promptPack: promptPack,
            watchlist: watchlist,
            sources: sources
        )
    }

    private static func splitSections(text: String) -> (
        topline: String,
        signalSummary: String,
        signals: [SignalGroup],
        deepDives: [DeepDive],
        promptPack: [PromptIdea],
        watchlist: [String]
    ) {
        var sections: [String: [String]] = [:]
        var currentKey: String?
        var buffer: [String] = []

        let lines = text.components(separatedBy: .newlines)
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            let lower = trimmed.lowercased()
            if lower.hasPrefix("headline") || lower.hasPrefix("topline") {
                commit(key: currentKey, buffer: buffer, sections: &sections)
                currentKey = "topline"
                buffer = []
                continue
            } else if lower.hasPrefix("summary") || lower.hasPrefix("other headlines summary") || lower.hasPrefix("signal summary") {
                commit(key: currentKey, buffer: buffer, sections: &sections)
                currentKey = "summary"
                buffer = []
                continue
            } else if lower.hasPrefix("other stories") || lower.hasPrefix("signals") {
                commit(key: currentKey, buffer: buffer, sections: &sections)
                currentKey = "signals"
                buffer = []
                continue
            } else if lower.hasPrefix("deep dives") {
                commit(key: currentKey, buffer: buffer, sections: &sections)
                currentKey = "deepdives"
                buffer = []
                continue
            } else if lower.hasPrefix("prompt studio") {
                commit(key: currentKey, buffer: buffer, sections: &sections)
                currentKey = "promptpack"
                buffer = []
                continue
            } else if lower.hasPrefix("tomorrow's radar") || lower.hasPrefix("tomorrows radar") || lower.hasPrefix("watchlist") {
                commit(key: currentKey, buffer: buffer, sections: &sections)
                currentKey = "watchlist"
                buffer = []
                continue
            }

            if !trimmed.isEmpty {
                buffer.append(trimmed)
            }
        }

        commit(key: currentKey, buffer: buffer, sections: &sections)

        let topline = (sections["topline"] ?? []).joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines)
        let signalSummary = (sections["summary"] ?? []).joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines)
        let signals = parseSignals(lines: sections["signals"] ?? [])
        let deepDives = parseDeepDives(lines: sections["deepdives"] ?? [])
        let watchlist = cleanBullets(sections["watchlist"] ?? [])
        let promptPackLines = sections["promptpack"] ?? []

        return (
            topline: topline,
            signalSummary: signalSummary,
            signals: signals,
            deepDives: deepDives,
            promptPack: parsePromptPack(lines: promptPackLines),
            watchlist: watchlist
        )
    }

    private static func commit(key: String?, buffer: [String], sections: inout [String: [String]]) {
        guard let key, !buffer.isEmpty else { return }
        sections[key] = buffer
    }

    private static func cleanBullets(_ lines: [String]) -> [String] {
        lines.compactMap { line in
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.hasPrefix("- ") {
                return String(trimmed.dropFirst(2))
            }
            if trimmed.hasPrefix("•") {
                return String(trimmed.dropFirst()).trimmingCharacters(in: .whitespacesAndNewlines)
            }
            if trimmed.first?.isNumber == true, trimmed.contains(")") {
                let parts = trimmed.split(separator: ")", maxSplits: 1)
                if parts.count == 2 {
                    return parts[1].trimmingCharacters(in: .whitespacesAndNewlines)
                }
            }
            return trimmed.isEmpty ? nil : trimmed
        }
    }

    private static func parseSignals(lines: [String]) -> [SignalGroup] {
        var groups: [SignalGroup] = []
        var currentTheme = ""
        var currentItems: [SignalItem] = []
        var currentStory = ""
        var currentSource = ""
        var currentURL = ""

        func commit() {
            let trimmedTheme = currentTheme.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmedTheme.isEmpty else { return }
            if !currentStory.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                currentItems.append(
                    SignalItem(
                        id: UUID(),
                        story: currentStory.trimmingCharacters(in: .whitespacesAndNewlines),
                        source: currentSource,
                        url: currentURL
                    )
                )
            }
            groups.append(
                SignalGroup(
                    id: UUID(),
                    theme: trimmedTheme,
                    items: currentItems
                )
            )
            currentTheme = ""
            currentItems = []
            currentStory = ""
            currentSource = ""
            currentURL = ""
        }

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.localizedCaseInsensitiveContains("theme:") {
                commit()
                currentTheme = value(from: trimmed, label: "Theme")
                continue
            }
            if trimmed.hasPrefix("- ") || trimmed.hasPrefix("•") {
                if !currentStory.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    currentItems.append(
                        SignalItem(
                            id: UUID(),
                            story: currentStory.trimmingCharacters(in: .whitespacesAndNewlines),
                            source: currentSource,
                            url: currentURL
                        )
                    )
                    currentStory = ""
                    currentSource = ""
                    currentURL = ""
                }
                let cleaned = trimmed.hasPrefix("- ") ? String(trimmed.dropFirst(2)) : String(trimmed.dropFirst())
                if cleaned.localizedCaseInsensitiveContains("story:") {
                    currentStory = value(from: cleaned, label: "Story")
                } else {
                    currentStory = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
                }
                continue
            }
            if trimmed.localizedCaseInsensitiveContains("story:") {
                currentStory = value(from: trimmed, label: "Story")
                continue
            }
            if trimmed.localizedCaseInsensitiveContains("source:") {
                let parsed = parseSourceAndURL(from: trimmed)
                currentSource = parsed.source
                if !parsed.url.isEmpty {
                    currentURL = parsed.url
                }
                continue
            }
            if trimmed.localizedCaseInsensitiveContains("url:") {
                currentURL = value(from: trimmed, label: "URL")
                continue
            }
            if !trimmed.isEmpty {
                currentStory += currentStory.isEmpty ? trimmed : " \(trimmed)"
            }
        }

        commit()
        return groups
    }

    private static func parseDeepDives(lines: [String]) -> [DeepDive] {
        var items: [DeepDive] = []
        var currentStory = ""
        var currentSource = ""
        var currentURL = ""

        func commit() {
            let trimmedStory = currentStory.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmedStory.isEmpty else { return }
            items.append(
                DeepDive(
                    id: UUID(),
                    story: trimmedStory,
                    source: currentSource,
                    url: currentURL
                )
            )
            currentStory = ""
            currentSource = ""
            currentURL = ""
        }

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.hasPrefix("- ") || trimmed.hasPrefix("•") {
                commit()
                let cleaned = trimmed.hasPrefix("- ") ? String(trimmed.dropFirst(2)) : String(trimmed.dropFirst())
                if cleaned.localizedCaseInsensitiveContains("story:") {
                    currentStory = value(from: cleaned, label: "Story")
                } else {
                    currentStory = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
                }
                continue
            }

            if trimmed.localizedCaseInsensitiveContains("story:") {
                currentStory = value(from: trimmed, label: "Story")
            } else if trimmed.localizedCaseInsensitiveContains("source:") {
                let parsed = parseSourceAndURL(from: trimmed)
                currentSource = parsed.source
                if !parsed.url.isEmpty {
                    currentURL = parsed.url
                }
            } else if trimmed.localizedCaseInsensitiveContains("url:") {
                currentURL = value(from: trimmed, label: "URL")
            } else if !trimmed.isEmpty {
                currentStory += currentStory.isEmpty ? trimmed : " \(trimmed)"
            }
        }

        commit()
        return items
    }

    private static func parsePromptPack(lines: [String]) -> [PromptIdea] {
        var prompts: [PromptIdea] = []
        var current: PromptIdeaBuilder?

        for rawLine in lines {
            let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
            if line.isEmpty { continue }

            if line.first?.isNumber == true, line.contains(")") {
                if let current = current, current.isComplete {
                    prompts.append(current.build())
                }
                current = PromptIdeaBuilder()
                let remainder = line.split(separator: ")", maxSplits: 1).last.map(String.init) ?? ""
                if remainder.localizedCaseInsensitiveContains("task:") {
                    let value = remainder.replacingOccurrences(of: "Task:", with: "", options: [.caseInsensitive])
                    current?.task = value.trimmingCharacters(in: .whitespacesAndNewlines)
                }
                continue
            }

            if line.localizedCaseInsensitiveContains("task:") {
                current?.task = value(from: line, label: "Task")
            } else if line.localizedCaseInsensitiveContains("prompt:") {
                current?.prompt = value(from: line, label: "Prompt")
            } else if line.localizedCaseInsensitiveContains("best for:") {
                current?.bestFor = value(from: line, label: "Best For")
            } else if line.localizedCaseInsensitiveContains("input format:") {
                current?.inputFormat = value(from: line, label: "Input Format")
            } else if line.localizedCaseInsensitiveContains("output format:") {
                current?.outputFormat = value(from: line, label: "Output Format")
            } else {
                current?.appendOverflow(line)
            }
        }

        if let current = current, current.isComplete {
            prompts.append(current.build())
        }

        return prompts
    }

    private static func value(from line: String, label: String) -> String {
        line.replacingOccurrences(of: "\(label):", with: "", options: [.caseInsensitive])
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func parseSourceAndURL(from line: String) -> (source: String, url: String) {
        let lower = line.lowercased()
        guard let sourceRange = lower.range(of: "source:") else {
            return (source: value(from: line, label: "Source"), url: "")
        }
        if let urlRange = lower.range(of: "url:") {
            let sourceValue = String(line[sourceRange.upperBound..<urlRange.lowerBound])
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .trimmingCharacters(in: CharacterSet(charactersIn: "|"))
                .trimmingCharacters(in: .whitespacesAndNewlines)
            let urlValue = String(line[urlRange.upperBound...])
                .trimmingCharacters(in: .whitespacesAndNewlines)
            return (source: sourceValue, url: urlValue)
        }
        return (source: value(from: line, label: "Source"), url: "")
    }
}

private struct PromptIdeaBuilder {
    var task: String = ""
    var prompt: String = ""
    var bestFor: String = ""
    var inputFormat: String = ""
    var outputFormat: String = ""

    var isComplete: Bool {
        !task.isEmpty || !prompt.isEmpty || !bestFor.isEmpty || !inputFormat.isEmpty || !outputFormat.isEmpty
    }

    mutating func appendOverflow(_ line: String) {
        if prompt.isEmpty {
            prompt = line
        } else {
            prompt += " \(line)"
        }
    }

    func build() -> PromptIdea {
        PromptIdea(
            id: UUID(),
            task: task,
            prompt: prompt,
            bestFor: bestFor,
            inputFormat: inputFormat,
            outputFormat: outputFormat
        )
    }
}
