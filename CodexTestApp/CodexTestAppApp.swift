import SwiftUI

@main
struct CodexTestAppApp: App {
    @StateObject private var sourceStore = SourceStore()
    @StateObject private var settingsStore = SettingsStore()
    @StateObject private var briefViewModel = BriefViewModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(sourceStore)
                .environmentObject(settingsStore)
                .environmentObject(briefViewModel)
        }
    }
}
