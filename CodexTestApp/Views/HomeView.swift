import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var briefViewModel: BriefViewModel
    @EnvironmentObject private var sourceStore: SourceStore
    @EnvironmentObject private var settingsStore: SettingsStore
    @State private var isPulsing = false
    @State private var loadingDots = 0
    @State private var showSourcesSheet = false

    var body: some View {
        ZStack {
            AppTheme.backgroundGradient
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    actionCard
                    snapshotCard
                    sourcesPreview
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("AI Daily Brief")
                .font(AppFont.display(34))
                .foregroundStyle(AppTheme.primaryText)
            Text("Pull the last 24 hours of AI news into a concise, actionable briefing.")
                .font(AppFont.body(16))
                .foregroundStyle(AppTheme.muted)
        }
        .padding(.top, 32)
    }

    private var actionCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Generate brief")
                        .font(AppFont.title(20))
                        .foregroundStyle(AppTheme.primaryText)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 8) {
                    Button {
                        briefViewModel.startGeneration(
                            settings: settingsStore,
                            sources: sourceStore.sources
                        )
                    } label: {
                        ZStack {
                            Capsule()
                                .fill(AppTheme.highlight)
                                .overlay(
                                    Capsule()
                                        .fill(
                                            LinearGradient(
                                                colors: [
                                                    AppTheme.highlight.opacity(0.2),
                                                    Color.white.opacity(0.6),
                                                    AppTheme.highlight.opacity(0.2)
                                                ],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                        )
                                        .offset(x: isPulsing ? 90 : -90)
                                )
                                .clipShape(Capsule())

                            Text(briefViewModel.isLoading ? "Working..." : "Create")
                                .font(AppFont.title(16))
                                .foregroundStyle(.black)
                        }
                        .frame(width: 120, height: 40)
                    }
                    .onAppear {
                        if briefViewModel.isLoading {
                            isPulsing = true
                        }
                    }
                    .onChange(of: briefViewModel.isLoading) { _, isLoading in
                        isPulsing = isLoading
                    }
                    .animation(
                        briefViewModel.isLoading
                            ? .linear(duration: 1.2).repeatForever(autoreverses: false)
                            : .default,
                        value: isPulsing
                    )
                    .disabled(briefViewModel.isLoading)

                    if briefViewModel.canCancel {
                        Button("Stop") {
                            briefViewModel.cancelGeneration()
                        }
                        .font(AppFont.body(12))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(Color(red: 0.86, green: 0.22, blue: 0.25))
                        .clipShape(Capsule())
                    }
                }
            }

            if let lastGenerated = briefViewModel.lastGenerated {
                HStack(spacing: 10) {
                    Text("Last run: \(lastGenerated.formatted(date: .abbreviated, time: .shortened))")
                        .font(AppFont.body(13))
                        .foregroundStyle(AppTheme.muted)
                    if !briefViewModel.coverageSummary.isEmpty {
                        Text(briefViewModel.coverageSummary)
                            .font(AppFont.body(11))
                            .foregroundStyle(AppTheme.muted)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(AppTheme.cardFill)
                            .clipShape(Capsule())
                    }
                    if briefViewModel.expandedWindowUsed {
                        Text("48h window")
                            .font(AppFont.body(11))
                            .foregroundStyle(AppTheme.highlight)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(AppTheme.cardFill)
                            .clipShape(Capsule())
                    }
                }
            }

            if briefViewModel.isLoading {
                if let status = briefViewModel.statusMessage {
                    Text("\(status)\(String(repeating: ".", count: loadingDots))")
                        .font(AppFont.body(13))
                        .foregroundStyle(AppTheme.muted)
                }
                if !briefViewModel.streamingPreview.isEmpty {
                    Text(briefViewModel.streamingPreview)
                        .font(AppFont.body(13))
                        .foregroundStyle(AppTheme.muted)
                        .lineLimit(4)
                }
            }

            if let error = briefViewModel.errorMessage {
                Text(error)
                    .font(AppFont.body(13))
                    .foregroundStyle(Color.red.opacity(0.9))
            }
        }
        .glassCard()
        .onReceive(Timer.publish(every: 0.6, on: .main, in: .common).autoconnect()) { _ in
            guard briefViewModel.isLoading else { return }
            loadingDots = (loadingDots + 1) % 4
        }
        .onChange(of: briefViewModel.isLoading) { _, isLoading in
            if !isLoading {
                loadingDots = 0
            }
        }
    }

    private var snapshotCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Snapshot")
                .font(AppFont.title(18))
                .foregroundStyle(AppTheme.primaryText)

            if let brief = briefViewModel.brief {
                Text(brief.dashboardSummary)
                    .font(AppFont.body(15))
                    .foregroundStyle(AppTheme.muted)
            } else {
                Text("Generate a brief to see the latest AI playbook.")
                    .font(AppFont.body(15))
                    .foregroundStyle(AppTheme.muted)
            }
        }
        .glassCard()
    }

    private var sourcesPreview: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Active sources")
                    .font(AppFont.title(18))
                    .foregroundStyle(AppTheme.primaryText)
                Spacer()
                Button("View all") {
                    showSourcesSheet = true
                }
                .font(AppFont.body(12))
                .foregroundStyle(AppTheme.highlight)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(AppTheme.cardFill)
                .clipShape(Capsule())
                Text("\(sourceStore.sources.filter { $0.isEnabled }.count) enabled")
                    .font(AppFont.body(13))
                    .foregroundStyle(AppTheme.muted)
            }

            ForEach(sourceStore.sources.prefix(4)) { source in
                HStack(spacing: 10) {
                    Image(systemName: source.type.systemImage)
                        .foregroundStyle(AppTheme.highlight)
                    Text(source.name)
                        .font(AppFont.body(14))
                        .foregroundStyle(AppTheme.primaryText)
                    Spacer()
                    if source.isEnabled {
                        Text("On")
                            .font(AppFont.body(12))
                            .foregroundStyle(AppTheme.highlight)
                    } else {
                        Text("Off")
                            .font(AppFont.body(12))
                            .foregroundStyle(AppTheme.muted)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .glassCard()
        .sheet(isPresented: $showSourcesSheet) {
            SourcesListSheet()
        }
    }
}

private struct SourcesListSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var sourceStore: SourceStore

    var body: some View {
        NavigationStack {
            List {
                ForEach(sourceStore.sources.filter { $0.isEnabled }) { source in
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
                    }
                    .listRowBackground(AppTheme.cardFill)
                }
            }
            .scrollContentBackground(.hidden)
            .navigationTitle("Active Sources")
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
