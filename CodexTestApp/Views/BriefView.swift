import SwiftUI
import UIKit

struct BriefView: View {
    @EnvironmentObject private var briefViewModel: BriefViewModel
    @State private var expandedPrompts: Set<UUID> = []
    @State private var showArchive = false
    @State private var collapsedThemes: Set<UUID> = []
    @State private var showPromptLibrary = false
    @State private var collapsedSections: Set<String> = []
    @State private var copiedPromptId: UUID?

    var body: some View {
        ZStack {
            AppTheme.backgroundGradient
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack {
                        Text("Daily Brief")
                            .font(AppFont.display(30))
                            .foregroundStyle(AppTheme.primaryText)
                        Spacer()
                        Button("Prompts") {
                            showPromptLibrary = true
                        }
                        .font(AppFont.body(12))
                        .foregroundStyle(AppTheme.highlight)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(AppTheme.cardFill)
                        .clipShape(Capsule())
                        Button("Archive") {
                            showArchive = true
                        }
                        .font(AppFont.body(12))
                        .foregroundStyle(AppTheme.highlight)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(AppTheme.cardFill)
                        .clipShape(Capsule())
                    }
                    .padding(.top, 32)

                    if let brief = briefViewModel.brief {
                        timelineRow(id: "headline", title: "Headline", isLast: false) {
                            toplineSection(text: brief.topline)
                        }
                        timelineRow(id: "summary", title: "Summary", isLast: false) {
                            signalSummarySection(text: brief.signalSummary)
                        }
                        timelineRow(id: "other", title: "Other Stories", isLast: false) {
                            signalsSection(groups: brief.signals)
                        }
                        timelineRow(id: "dives", title: "Deep Dives", isLast: false) {
                            deepDivesSection(items: brief.deepDives)
                        }
                        timelineRow(id: "prompts", title: "Prompt Studio", isLast: false) {
                            promptStudioSection(items: brief.promptPack)
                        }
                        timelineRow(id: "radar", title: "Tomorrow's Radar", isLast: false) {
                            bulletSection(title: "Tomorrow's Radar", bullets: brief.watchlist, emptyMessage: "No radar items yet.")
                        }
                        timelineRow(id: "sources", title: "Sources Used", isLast: true) {
                            sourcesUsedSection(items: brief.sources)
                        }
                    } else {
                        Text("No brief yet. Head to the dashboard to generate one.")
                            .font(AppFont.body(15))
                            .foregroundStyle(AppTheme.muted)
                            .glassCard()
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
            }
        }
        .sheet(isPresented: $showArchive) {
            BriefArchiveSheet()
        }
        .sheet(isPresented: $showPromptLibrary) {
            PromptLibrarySheet()
        }
    }

    private func toplineSection(text: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(text.isEmpty ? "No headline yet." : text)
                .font(AppFont.body(15))
                .foregroundStyle(AppTheme.muted)
        }
        .glassCard()
    }

    private func signalSummarySection(text: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(text.isEmpty ? "No summary yet." : text)
                .font(AppFont.body(15))
                .foregroundStyle(AppTheme.muted)
        }
        .glassCard()
    }

    private func bulletSection(title: String, bullets: [String], emptyMessage: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            if bullets.isEmpty {
                Text(emptyMessage)
                    .font(AppFont.body(14))
                    .foregroundStyle(AppTheme.muted)
            } else {
                ForEach(Array(bullets.enumerated()), id: \.offset) { _, bullet in
                    HStack(alignment: .top, spacing: 8) {
                        Circle()
                            .fill(AppTheme.highlight)
                            .frame(width: 6, height: 6)
                            .padding(.top, 6)
                        Text(bullet)
                            .font(AppFont.body(14))
                            .foregroundStyle(AppTheme.muted)
                    }
                }
            }
        }
        .glassCard()
    }

    private func signalsSection(groups: [SignalGroup]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Spacer()
                if !groups.isEmpty {
                    Button(isAllThemesExpanded(in: groups) ? "Collapse all" : "Expand all") {
                        toggleAllThemes(groups)
                    }
                    .font(AppFont.body(12))
                    .foregroundStyle(AppTheme.highlight)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(AppTheme.cardFill)
                    .clipShape(Capsule())
                }
            }

            if groups.isEmpty {
                Text("No other stories yet.")
                    .font(AppFont.body(14))
                    .foregroundStyle(AppTheme.muted)
            } else {
                ForEach(groups) { group in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(group.theme)
                                .font(AppFont.title(15))
                                .foregroundStyle(AppTheme.primaryText)
                            Spacer()
                            Button(collapsedThemes.contains(group.id) ? "Expand" : "Collapse") {
                                toggleTheme(group.id)
                            }
                            .font(AppFont.body(11))
                            .foregroundStyle(AppTheme.muted)
                        }
                        if !collapsedThemes.contains(group.id) {
                            ForEach(group.items) { item in
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(item.story)
                                        .font(AppFont.body(14))
                                        .foregroundStyle(AppTheme.muted)
                                    HStack(spacing: 8) {
                                        if !item.source.isEmpty {
                                            Text(item.source)
                                                .font(AppFont.body(12))
                                                .foregroundStyle(AppTheme.muted)
                                        }
                                        if let url = URL(string: item.url) {
                                            Link("Read", destination: url)
                                                .font(AppFont.body(12))
                                                .foregroundStyle(AppTheme.highlight)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(AppTheme.cardFill)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(AppTheme.cardStroke, lineWidth: 1)
                            )
                    )
                }
            }
        }
        .glassCard()
    }

    private func deepDivesSection(items: [DeepDive]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if items.isEmpty {
                Text("No deep dives yet.")
                    .font(AppFont.body(14))
                    .foregroundStyle(AppTheme.muted)
            } else {
                ForEach(items) { item in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(item.story)
                            .font(AppFont.body(14))
                            .foregroundStyle(AppTheme.primaryText)
                        HStack(spacing: 8) {
                            if !item.source.isEmpty {
                                Text(item.source)
                                    .font(AppFont.body(12))
                                    .foregroundStyle(AppTheme.muted)
                            }
                            if let url = URL(string: item.url) {
                                Link("Read", destination: url)
                                    .font(AppFont.body(12))
                                    .foregroundStyle(AppTheme.highlight)
                            }
                        }
                    }
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(AppTheme.cardFill)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(AppTheme.cardStroke, lineWidth: 1)
                            )
                    )
                }
            }
        }
        .glassCard()
    }

    private func promptStudioSection(items: [PromptIdea]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Spacer()
                if !items.isEmpty {
                    Button(areAllPromptsExpanded(items) ? "Collapse all" : "Expand all") {
                        toggleAllPrompts(items)
                    }
                    .font(AppFont.body(12))
                    .foregroundStyle(AppTheme.highlight)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(AppTheme.cardFill)
                    .clipShape(Capsule())
                }
            }

            if items.isEmpty {
                Text("No prompts yet.")
                    .font(AppFont.body(14))
                    .foregroundStyle(AppTheme.muted)
            } else {
                ForEach(items) { item in
                    promptCard(item)
                        .onTapGesture {
                            togglePrompt(item.id)
                        }
                }
            }
        }
        .glassCard()
    }

    private func promptCard(_ item: PromptIdea) -> some View {
        let isExpanded = expandedPrompts.contains(item.id)
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(item.task.isEmpty ? "Prompt" : item.task)
                    .font(AppFont.title(16))
                    .foregroundStyle(AppTheme.primaryText)
                Spacer()
                Button {
                    UIPasteboard.general.string = item.prompt
                    copiedPromptId = item.id
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                        if copiedPromptId == item.id {
                            copiedPromptId = nil
                        }
                    }
                } label: {
                    Image(systemName: copiedPromptId == item.id ? "checkmark.circle.fill" : "doc.on.doc")
                        .foregroundStyle(copiedPromptId == item.id ? AppTheme.highlight : AppTheme.muted)
                }
                .buttonStyle(.plain)
                Button {
                    briefViewModel.togglePinned(item)
                } label: {
                    Image(systemName: briefViewModel.isPinned(item) ? "bookmark.fill" : "bookmark")
                        .foregroundStyle(AppTheme.highlight)
                }
                .buttonStyle(.plain)
            }

            Text(item.prompt.isEmpty ? "—" : item.prompt)
                .font(AppFont.body(14))
                .foregroundStyle(AppTheme.muted)
                .lineLimit(isExpanded ? nil : 3)

            if isExpanded {
                Divider().overlay(AppTheme.cardStroke)
                labeledLine(label: "Best For", value: item.bestFor)
                labeledLine(label: "Input", value: item.inputFormat)
                labeledLine(label: "Output", value: item.outputFormat)
            } else {
                Text("Tap to expand")
                    .font(AppFont.body(12))
                    .foregroundStyle(AppTheme.muted)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(AppTheme.cardFill)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(AppTheme.cardStroke, lineWidth: 1)
                )
        )
        .shadow(color: Color.black.opacity(0.12), radius: 10, x: 0, y: 6)
    }

    private func togglePrompt(_ id: UUID) {
        if expandedPrompts.contains(id) {
            expandedPrompts.remove(id)
        } else {
            expandedPrompts.insert(id)
        }
    }

    private func areAllPromptsExpanded(_ items: [PromptIdea]) -> Bool {
        guard !items.isEmpty else { return false }
        return items.allSatisfy { expandedPrompts.contains($0.id) }
    }

    private func toggleAllPrompts(_ items: [PromptIdea]) {
        if areAllPromptsExpanded(items) {
            expandedPrompts.removeAll()
        } else {
            expandedPrompts = Set(items.map { $0.id })
        }
    }

    private func isAllThemesExpanded(in groups: [SignalGroup]) -> Bool {
        guard !groups.isEmpty else { return false }
        return groups.allSatisfy { !collapsedThemes.contains($0.id) }
    }

    private func toggleTheme(_ id: UUID) {
        if collapsedThemes.contains(id) {
            collapsedThemes.remove(id)
        } else {
            collapsedThemes.insert(id)
        }
    }

    private func toggleAllThemes(_ groups: [SignalGroup]) {
        if isAllThemesExpanded(in: groups) {
            collapsedThemes = Set(groups.map { $0.id })
        } else {
            collapsedThemes.removeAll()
        }
    }

    private func labeledLine(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(AppFont.body(11))
                .foregroundStyle(AppTheme.muted)
            Text(value.isEmpty ? "—" : value)
                .font(AppFont.body(14))
                .foregroundStyle(AppTheme.primaryText)
        }
    }

    private func sourcesUsedSection(items: [NewsItem]) -> some View {
        let usableItems = items.filter { !$0.isPlaceholder }
        let contributors = Array(Set(usableItems.map { $0.source })).sorted()
        let results = briefViewModel.sourceResults

        return VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                if !briefViewModel.coverageSummary.isEmpty {
                    Text(briefViewModel.coverageSummary)
                        .font(AppFont.body(12))
                        .foregroundStyle(AppTheme.muted)
                }
                if briefViewModel.expandedWindowUsed {
                    Text("Window expanded to 48h")
                        .font(AppFont.body(11))
                        .foregroundStyle(AppTheme.highlight)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppTheme.cardFill)
                        .clipShape(Capsule())
                }
            }

            if contributors.isEmpty {
                Text("No ingestible items were found in the selected time window.")
                    .font(AppFont.body(14))
                    .foregroundStyle(AppTheme.muted)
            } else {
                Text(contributors.joined(separator: ", "))
                    .font(AppFont.body(13))
                    .foregroundStyle(AppTheme.muted)
            }

            ForEach(usableItems.prefix(6)) { item in
                VStack(alignment: .leading, spacing: 4) {
                    if let url = URL(string: item.url) {
                        Link(item.title, destination: url)
                            .font(AppFont.body(14))
                            .foregroundStyle(AppTheme.primaryText)
                    } else {
                        Text(item.title)
                            .font(AppFont.body(14))
                            .foregroundStyle(AppTheme.primaryText)
                    }
                    Text(item.source)
                        .font(AppFont.body(12))
                        .foregroundStyle(AppTheme.muted)
                }
                .padding(.vertical, 4)
            }

            if !results.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Source Health")
                        .font(AppFont.body(12))
                        .foregroundStyle(AppTheme.muted)
                    ForEach(results) { result in
                        HStack {
                            Text(result.source.name)
                                .font(AppFont.body(13))
                                .foregroundStyle(AppTheme.primaryText)
                            Spacer()
                            statusPill(for: result.status)
                        }
                    }
                }
            }
        }
        .glassCard()
    }

    private func timelineRow<Content: View>(id: String, title: String, isLast: Bool, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            TimelineHeader(
                title: title,
                isLast: isLast,
                isCollapsed: collapsedSections.contains(id)
            ) {
                toggleSection(id)
            }
            if !collapsedSections.contains(id) {
                content()
            }
        }
    }

    private func toggleSection(_ id: String) {
        if collapsedSections.contains(id) {
            collapsedSections.remove(id)
        } else {
            collapsedSections.insert(id)
        }
    }
}

private struct BriefArchiveSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var briefViewModel: BriefViewModel
    @State private var searchText = ""
    @State private var filter: ArchiveFilter = .all

    private enum ArchiveFilter: String, CaseIterable, Identifiable {
        case all = "All"
        case week = "7d"
        case month = "30d"

        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            List {
                if filteredBriefs.isEmpty {
                    Text("No archived briefs yet.")
                        .font(AppFont.body(14))
                        .foregroundStyle(AppTheme.muted)
                        .listRowBackground(AppTheme.cardFill)
                } else {
                    ForEach(filteredBriefs) { brief in
                        Button {
                            briefViewModel.selectArchived(brief)
                            dismiss()
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(brief.topline.isEmpty ? "Daily Brief" : brief.topline)
                                    .font(AppFont.title(16))
                                    .foregroundStyle(AppTheme.primaryText)
                                    .lineLimit(2)
                                Text(brief.date.formatted(date: .abbreviated, time: .shortened))
                                    .font(AppFont.body(12))
                                    .foregroundStyle(AppTheme.muted)
                            }
                        }
                        .listRowBackground(AppTheme.cardFill)
                        .contextMenu {
                            ShareLink(item: briefViewModel.markdown(for: brief)) {
                                Text("Share Markdown")
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .navigationTitle("Brief Archive")
            .searchable(text: $searchText, prompt: "Search briefs")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Picker("Filter", selection: $filter) {
                        ForEach(ArchiveFilter.allCases) { option in
                            Text(option.rawValue).tag(option)
                        }
                    }
                    .pickerStyle(.segmented)
                }
            }
        }
    }

    private var filteredBriefs: [DailyBrief] {
        let cutoff: Date? = {
            switch filter {
            case .all:
                return nil
            case .week:
                return Calendar.current.date(byAdding: .day, value: -7, to: Date())
            case .month:
                return Calendar.current.date(byAdding: .day, value: -30, to: Date())
            }
        }()

        return briefViewModel.archive.filter { brief in
            if let cutoff, brief.date < cutoff {
                return false
            }
            if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return true
            }
            let query = searchText.lowercased()
            return brief.topline.lowercased().contains(query) ||
                brief.signalSummary.lowercased().contains(query)
        }
    }
}

private struct PromptLibrarySheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var briefViewModel: BriefViewModel

    var body: some View {
        NavigationStack {
            List {
                if briefViewModel.pinnedPrompts.isEmpty {
                    Text("No pinned prompts yet.")
                        .font(AppFont.body(14))
                        .foregroundStyle(AppTheme.muted)
                        .listRowBackground(AppTheme.cardFill)
                } else {
                    ForEach(briefViewModel.pinnedPrompts) { item in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(item.task.isEmpty ? "Prompt" : item.task)
                                .font(AppFont.title(16))
                                .foregroundStyle(AppTheme.primaryText)
                            Text(item.prompt)
                                .font(AppFont.body(14))
                                .foregroundStyle(AppTheme.muted)
                            if !item.bestFor.isEmpty {
                                Text("Best For: \(item.bestFor)")
                                    .font(AppFont.body(12))
                                    .foregroundStyle(AppTheme.muted)
                            }
                        }
                        .contextMenu {
                            ShareLink(item: item.prompt) {
                                Text("Share Prompt")
                            }
                        }
                        .listRowBackground(AppTheme.cardFill)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .navigationTitle("Prompt Library")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct TimelineHeader: View {
    let title: String
    let isLast: Bool
    let isCollapsed: Bool
    let onToggle: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Button {
                onToggle()
            } label: {
                HStack(spacing: 10) {
                    VStack(spacing: 6) {
                        Circle()
                            .fill(AppTheme.highlight.opacity(isCollapsed ? 0.4 : 1.0))
                            .frame(width: 10, height: 10)
                        if !isLast {
                            Rectangle()
                                .fill(AppTheme.cardStroke)
                                .frame(width: 2, height: 28)
                        }
                    }

                    Text(title)
                        .font(AppFont.title(18))
                        .foregroundStyle(AppTheme.primaryText)
                }
            }
            .buttonStyle(.plain)
        }
    }
}

private extension BriefView {
    func statusPill(for status: SourceFetchStatus) -> some View {
        let label: String
        let color: Color
        switch status {
        case let .success(count):
            label = "\(count) items"
            color = AppTheme.highlight
        case .empty:
            label = "No recent items"
            color = AppTheme.muted
        case .failed:
            label = "Failed"
            color = Color.red.opacity(0.8)
        case .queued:
            label = "Queued"
            color = AppTheme.muted
        }

        return Text(label)
            .font(AppFont.body(11))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(AppTheme.cardFill)
            .clipShape(Capsule())
    }
}
