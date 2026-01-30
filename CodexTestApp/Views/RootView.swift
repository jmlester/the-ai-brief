import SwiftUI
import UIKit

struct RootView: View {
    @EnvironmentObject private var settingsStore: SettingsStore
    @Environment(\.colorScheme) private var systemColorScheme

    init() {
        applyTabBarAppearance(for: .dark)
    }

    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Dashboard", systemImage: "sparkles")
                }
            BriefView()
                .tabItem {
                    Label("Brief", systemImage: "doc.text.magnifyingglass")
                }
            SourcesView()
                .tabItem {
                    Label("Sources", systemImage: "tray.full")
                }
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "slider.horizontal.3")
                }
        }
        .tint(AppTheme.accent)
        .preferredColorScheme(colorScheme)
        .onAppear {
            applyTabBarAppearance(for: effectiveColorScheme)
        }
        .onChange(of: effectiveColorScheme) { _, newValue in
            applyTabBarAppearance(for: newValue)
        }
    }

    private var colorScheme: ColorScheme? {
        switch settingsStore.colorScheme {
        case .system:
            return nil
        case .light:
            return .light
        case .dark:
            return .dark
        }
    }

    private var effectiveColorScheme: ColorScheme {
        switch settingsStore.colorScheme {
        case .system:
            return systemColorScheme
        case .light:
            return .light
        case .dark:
            return .dark
        }
    }

    private func applyTabBarAppearance(for scheme: ColorScheme) {
        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()

        switch scheme {
        case .light:
            appearance.backgroundColor = UIColor(red: 1.0, green: 0.94, blue: 0.88, alpha: 0.96)
            let normal = UIColor(white: 0.2, alpha: 0.7)
            appearance.stackedLayoutAppearance.normal.iconColor = normal
            appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
                .foregroundColor: normal
            ]
            let selected = UIColor(red: 0.98, green: 0.56, blue: 0.3, alpha: 1.0)
            appearance.stackedLayoutAppearance.selected.iconColor = selected
            appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
                .foregroundColor: selected,
                .font: UIFont.systemFont(ofSize: 12, weight: .semibold)
            ]
        case .dark:
            appearance.backgroundColor = UIColor(red: 0.11, green: 0.11, blue: 0.15, alpha: 0.94)
            let normal = UIColor(white: 0.9, alpha: 0.85)
            appearance.stackedLayoutAppearance.normal.iconColor = normal
            appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
                .foregroundColor: normal
            ]
            let selected = UIColor(red: 0.98, green: 0.56, blue: 0.3, alpha: 1.0)
            appearance.stackedLayoutAppearance.selected.iconColor = selected
            appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
                .foregroundColor: selected,
                .font: UIFont.systemFont(ofSize: 12, weight: .semibold)
            ]
        @unknown default:
            break
        }

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}
