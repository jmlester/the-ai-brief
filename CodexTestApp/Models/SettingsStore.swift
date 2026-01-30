import Foundation
import SwiftUI

struct AIConfiguration: Codable {
    let apiKey: String
    let model: String
}

enum BriefTone: String, CaseIterable, Identifiable, Codable {
    case executive
    case practical
    case builder

    var id: String { rawValue }

    var label: String {
        switch self {
        case .executive:
            return "Executive"
        case .practical:
            return "Practical"
        case .builder:
            return "Builder"
        }
    }
}

enum AppColorScheme: String, CaseIterable, Identifiable, Codable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var label: String {
        switch self {
        case .system:
            return "System"
        case .light:
            return "Light"
        case .dark:
            return "Dark"
        }
    }
}

final class SettingsStore: ObservableObject {
    @Published var apiKey: String {
        didSet { save() }
    }
    @Published var model: String {
        didSet { save() }
    }
    @Published var focusTopics: String {
        didSet { save() }
    }
    @Published var tone: BriefTone {
        didSet { save() }
    }
    @Published var timeWindowHours: Double {
        didSet { save() }
    }
    @Published var colorScheme: AppColorScheme {
        didSet { save() }
    }
    @Published var reminderEnabled: Bool {
        didSet { save() }
    }
    @Published var reminderHour: Int {
        didSet { save() }
    }
    @Published var reminderMinute: Int {
        didSet { save() }
    }

    private let defaults = UserDefaults.standard

    private enum Keys {
        static let apiKey = "settings.apiKey"
        static let model = "settings.model"
        static let focusTopics = "settings.focusTopics"
        static let tone = "settings.tone"
        static let timeWindowHours = "settings.timeWindowHours"
        static let colorScheme = "settings.colorScheme"
        static let reminderEnabled = "settings.reminderEnabled"
        static let reminderHour = "settings.reminderHour"
        static let reminderMinute = "settings.reminderMinute"
    }

    init() {
        apiKey = defaults.string(forKey: Keys.apiKey) ?? ""
        model = defaults.string(forKey: Keys.model) ?? "gpt-4o-mini"
        focusTopics = defaults.string(forKey: Keys.focusTopics) ?? ""
        tone = BriefTone(rawValue: defaults.string(forKey: Keys.tone) ?? "") ?? .practical
        let storedWindow = defaults.double(forKey: Keys.timeWindowHours)
        timeWindowHours = storedWindow == 0 ? 24 : storedWindow
        colorScheme = AppColorScheme(rawValue: defaults.string(forKey: Keys.colorScheme) ?? "") ?? .system
        reminderEnabled = defaults.bool(forKey: Keys.reminderEnabled)
        let hour = defaults.integer(forKey: Keys.reminderHour)
        let minute = defaults.integer(forKey: Keys.reminderMinute)
        reminderHour = hour == 0 ? 9 : hour
        reminderMinute = minute
    }

    var aiConfiguration: AIConfiguration? {
        let trimmedKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedModel = model.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedKey.isEmpty, !trimmedModel.isEmpty else {
            return nil
        }
        return AIConfiguration(apiKey: trimmedKey, model: trimmedModel)
    }

    private func save() {
        defaults.set(apiKey, forKey: Keys.apiKey)
        defaults.set(model, forKey: Keys.model)
        defaults.set(focusTopics, forKey: Keys.focusTopics)
        defaults.set(tone.rawValue, forKey: Keys.tone)
        defaults.set(timeWindowHours, forKey: Keys.timeWindowHours)
        defaults.set(colorScheme.rawValue, forKey: Keys.colorScheme)
        defaults.set(reminderEnabled, forKey: Keys.reminderEnabled)
        defaults.set(reminderHour, forKey: Keys.reminderHour)
        defaults.set(reminderMinute, forKey: Keys.reminderMinute)
    }
}
