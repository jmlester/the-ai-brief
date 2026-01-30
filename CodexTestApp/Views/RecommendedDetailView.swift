import SwiftUI
import UIKit

struct RecommendedDetailView: View {
    @Environment(\.openURL) private var openURL
    @EnvironmentObject private var sourceStore: SourceStore
    let source: RecommendedSource

    var body: some View {
        ZStack {
            AppTheme.backgroundGradient
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(source.name)
                        .font(AppFont.display(26))
                        .foregroundStyle(AppTheme.primaryText)
                    Text(source.category)
                        .font(AppFont.body(14))
                        .foregroundStyle(AppTheme.highlight)
                }

                Text(source.summary)
                    .font(AppFont.body(15))
                    .foregroundStyle(AppTheme.muted)

                if !source.tags.isEmpty {
                    FlowLayout(tags: source.tags)
                }

                HStack(spacing: 12) {
                    Button {
                        sourceStore.addRecommended(source)
                    } label: {
                        Text(sourceStore.contains(url: source.url) ? "Added" : "Add Source")
                            .font(AppFont.title(15))
                            .foregroundStyle(.black)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 10)
                            .background(AppTheme.highlight)
                            .clipShape(Capsule())
                    }
                    .disabled(sourceStore.contains(url: source.url))

                    Button {
                        if let url = URL(string: source.url) {
                            openURL(url)
                        }
                    } label: {
                        Text("Open Link")
                            .font(AppFont.title(15))
                            .foregroundStyle(AppTheme.primaryText)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 10)
                            .overlay(
                                Capsule().stroke(AppTheme.cardStroke, lineWidth: 1)
                            )
                    }
                }

                Spacer()
            }
            .padding(24)
        }
    }
}

private struct FlowLayout: View {
    let tags: [String]

    var body: some View {
        FlexibleView(
            data: tags,
            spacing: 8,
            alignment: .leading
        ) { tag in
            Text(tag)
                .font(AppFont.body(12))
                .foregroundStyle(AppTheme.primaryText)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(AppTheme.cardFill)
                .clipShape(Capsule())
        }
    }
}

private struct FlexibleView<Data: Collection, Content: View>: View where Data.Element: Hashable {
    let data: Data
    let spacing: CGFloat
    let alignment: HorizontalAlignment
    let content: (Data.Element) -> Content

    @State private var availableWidth: CGFloat = 0

    var body: some View {
        VStack(alignment: alignment, spacing: spacing) {
            GeometryReader { geometry in
                Color.clear
                    .onAppear { availableWidth = geometry.size.width }
                    .onChange(of: geometry.size.width) { _, newValue in
                        availableWidth = newValue
                    }
            }
            .frame(height: 1)

            let rows = computeRows()
            ForEach(rows.indices, id: \.self) { index in
                HStack(spacing: spacing) {
                    ForEach(rows[index], id: \.self) { element in
                        content(element)
                    }
                }
            }
        }
    }

    private func computeRows() -> [[Data.Element]] {
        var rows: [[Data.Element]] = [[]]
        var currentRowWidth: CGFloat = 0

        for element in data {
            let elementWidth = estimateWidth(for: element)
            if currentRowWidth + elementWidth + spacing > availableWidth, !rows.last!.isEmpty {
                rows.append([element])
                currentRowWidth = elementWidth + spacing
            } else {
                rows[rows.count - 1].append(element)
                currentRowWidth += elementWidth + spacing
            }
        }
        return rows
    }

    private func estimateWidth(for element: Data.Element) -> CGFloat {
        let string = String(describing: element)
        let font = UIFont.systemFont(ofSize: 12, weight: .regular)
        let width = string.size(withAttributes: [.font: font]).width
        return width + 28
    }
}
