import SwiftUI

struct SourcesView: View {
    @EnvironmentObject private var sourceStore: SourceStore
    @EnvironmentObject private var briefViewModel: BriefViewModel
    @State private var showManageSheet = false

    var body: some View {
        ZStack {
            AppTheme.backgroundGradient
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack {
                        Text("Sources")
                            .font(AppFont.display(30))
                            .foregroundStyle(AppTheme.primaryText)
                        Spacer()
                        Button {
                            showManageSheet = true
                        } label: {
                            Text("Manage")
                                .font(AppFont.title(15))
                                .foregroundStyle(.black)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(AppTheme.highlight)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 32)

                    selectedSourcesCard
                    briefImpactCard
                    Spacer(minLength: 24)
                }
            }
        }
        .sheet(isPresented: $showManageSheet) {
            ManageSourcesSheet()
        }
    }

    private var selectedSourcesCard: some View {
        let selected = sourceStore.sources.filter { $0.isEnabled }
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Selected Sources")
                    .font(AppFont.title(18))
                    .foregroundStyle(AppTheme.primaryText)
                Spacer()
                Text("\(selected.count) active")
                    .font(AppFont.body(12))
                    .foregroundStyle(AppTheme.muted)
            }

            if selected.isEmpty {
                Text("No sources selected yet. Tap Manage to add or enable sources.")
                    .font(AppFont.body(14))
                    .foregroundStyle(AppTheme.muted)
            } else {
                ForEach(selected.prefix(6)) { source in
                    HStack(spacing: 10) {
                        Image(systemName: source.type.systemImage)
                            .foregroundStyle(AppTheme.highlight)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(source.name)
                                .font(AppFont.body(14))
                                .foregroundStyle(AppTheme.primaryText)
                            if let lastFetched = lastFetchedString(for: source) {
                                Text("Last fetched \(lastFetched)")
                                    .font(AppFont.body(11))
                                    .foregroundStyle(AppTheme.muted)
                            }
                        }
                        Spacer()
                        Text(source.type.label)
                            .font(AppFont.body(12))
                            .foregroundStyle(AppTheme.muted)
                        if let status = statusLabel(for: source) {
                            VStack(alignment: .trailing, spacing: 4) {
                                Text(status)
                                    .font(AppFont.body(11))
                                    .foregroundStyle(AppTheme.muted)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 3)
                                    .background(AppTheme.cardFill)
                                    .clipShape(Capsule())
                                if let history = briefViewModel.sourceHealth[source.id]?.history {
                                    historyDots(history)
                                }
                            }
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .glassCard()
        .padding(.horizontal, 20)
    }

    private var briefImpactCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Brief Coverage")
                .font(AppFont.title(18))
                .foregroundStyle(AppTheme.primaryText)
            Text("Your daily brief pulls only from the selected sources above. Add or enable more sources to widen coverage.")
                .font(AppFont.body(14))
                .foregroundStyle(AppTheme.muted)
        }
        .padding(.horizontal, 20)
        .glassCard()
        .padding(.horizontal, 20)
    }

    private func statusLabel(for source: Source) -> String? {
        guard let result = briefViewModel.sourceResults.first(where: { $0.source.id == source.id }) else {
            return nil
        }
        switch result.status {
        case let .success(count):
            return "\(count) items"
        case .empty:
            return "No recent"
        case .failed:
            return "Failed"
        case .queued:
            return "Queued"
        }
    }

    private func lastFetchedString(for source: Source) -> String? {
        guard let health = briefViewModel.sourceHealth[source.id] else { return nil }
        return health.lastFetched.formatted(date: .abbreviated, time: .shortened)
    }

    private func historyDots(_ history: [SourceStatusSnapshot]) -> some View {
        HStack(spacing: 4) {
            ForEach(history.prefix(5)) { snapshot in
                Circle()
                    .fill(color(for: snapshot.kind))
                    .frame(width: 6, height: 6)
            }
        }
    }

    private func color(for kind: SourceStatusKind) -> Color {
        switch kind {
        case .success:
            return AppTheme.highlight
        case .empty:
            return AppTheme.muted
        case .failed:
            return Color.red.opacity(0.8)
        case .queued:
            return AppTheme.muted
        }
    }
}

private struct ManageSourcesSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var sourceStore: SourceStore
    @State private var searchText = ""
    @State private var selectedTab: SourceTab = .recommended
    @State private var selectedRecommendation: RecommendedSource?
    @State private var showAddSheet = false

    private enum SourceTab: String, CaseIterable, Identifiable {
        case recommended = "Recommended"
        case yours = "Your Sources"

        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                Picker("Source Tab", selection: $selectedTab) {
                    ForEach(SourceTab.allCases) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)

                List {
                    if selectedTab == .recommended {
                        ForEach(filteredRecommended) { recommendation in
                            Button {
                                selectedRecommendation = recommendation
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: recommendation.type.systemImage)
                                        .foregroundStyle(AppTheme.highlight)
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(recommendation.name)
                                            .font(AppFont.title(16))
                                            .foregroundStyle(AppTheme.primaryText)
                                        Text(recommendation.category)
                                            .font(AppFont.body(12))
                                            .foregroundStyle(AppTheme.muted)
                                    }
                                    Spacer()
                                    if sourceStore.contains(url: recommendation.url) {
                                        Text("Added")
                                            .font(AppFont.body(12))
                                            .foregroundStyle(AppTheme.highlight)
                                    } else {
                                        Text("Details")
                                            .font(AppFont.body(12))
                                            .foregroundStyle(AppTheme.muted)
                                    }
                                }
                            }
                            .listRowBackground(AppTheme.cardFill)
                        }
                    } else {
                        ForEach(sourceStore.sources) { source in
                            HStack(spacing: 12) {
                                Image(systemName: source.type.systemImage)
                                    .foregroundStyle(AppTheme.highlight)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(source.name)
                                        .font(AppFont.title(16))
                                        .foregroundStyle(AppTheme.primaryText)
                                    Text(source.url)
                                        .font(AppFont.body(12))
                                        .foregroundStyle(AppTheme.muted)
                                }
                                Spacer()
                                Button {
                                    sourceStore.togglePreferred(source)
                                } label: {
                                    Image(systemName: source.isPreferred ? "star.fill" : "star")
                                        .foregroundStyle(AppTheme.highlight)
                                }
                                .buttonStyle(.plain)
                                Toggle("", isOn: binding(for: source))
                                    .labelsHidden()
                            }
                            .listRowBackground(AppTheme.cardFill)
                        }
                        .onDelete(perform: sourceStore.delete)
                    }
                }
                .scrollContentBackground(.hidden)
                .searchable(text: $searchText, prompt: "Search recommended")
            }
            .navigationTitle("Manage Sources")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add Custom") {
                        showAddSheet = true
                    }
                }
            }
        }
        .sheet(item: $selectedRecommendation) { recommendation in
            RecommendedDetailView(source: recommendation)
        }
        .sheet(isPresented: $showAddSheet) {
            AddSourceSheet()
        }
    }

    private func binding(for source: Source) -> Binding<Bool> {
        Binding(
            get: {
                sourceStore.sources.first(where: { $0.id == source.id })?.isEnabled ?? false
            },
            set: { _ in
                sourceStore.toggle(source)
            }
        )
    }

    private var filteredRecommended: [RecommendedSource] {
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return SourceCatalog.all
        }
        return SourceCatalog.all.filter {
            $0.name.localizedCaseInsensitiveContains(trimmed) ||
            $0.category.localizedCaseInsensitiveContains(trimmed)
        }
    }
}

private struct AddSourceSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var sourceStore: SourceStore
    @State private var name = ""
    @State private var url = ""
    @State private var ingestURL = ""
    @State private var type: SourceType = .rss

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Details")) {
                    TextField("Name", text: $name)
                    TextField("URL", text: $url)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                    if type == .social {
                        TextField("RSS Bridge URL (optional)", text: $ingestURL)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.URL)
                    }
                    Picker("Type", selection: $type) {
                        ForEach(SourceType.allCases) { type in
                            Text(type.label).tag(type)
                        }
                    }
                }
            }
            .navigationTitle("Add Source")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let trimmedIngest = ingestURL.trimmingCharacters(in: .whitespacesAndNewlines)
                        sourceStore.addSource(
                            name: name,
                            url: url,
                            type: type,
                            ingestURL: trimmedIngest.isEmpty ? nil : trimmedIngest
                        )
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
                              url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
