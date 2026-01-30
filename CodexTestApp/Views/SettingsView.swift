import SwiftUI
import UserNotifications

struct SettingsView: View {
    @EnvironmentObject private var settingsStore: SettingsStore

    var body: some View {
        ZStack {
            AppTheme.backgroundGradient
                .ignoresSafeArea()

            Form {
                Section(header: Text("AI API")) {
                    SecureField("API Key", text: $settingsStore.apiKey)
                    TextField("Model", text: $settingsStore.model)
                        .textInputAutocapitalization(.never)
                }

                Section(header: Text("Brief Style")) {
                    Picker("Tone", selection: $settingsStore.tone) {
                        ForEach(BriefTone.allCases) { tone in
                            Text(tone.label).tag(tone)
                        }
                    }
                    TextField("Focus topics (comma-separated)", text: $settingsStore.focusTopics)
                        .textInputAutocapitalization(.never)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Time Window: \(Int(settingsStore.timeWindowHours)) hours")
                        Slider(value: $settingsStore.timeWindowHours, in: 6...48, step: 2)
                    }
                }

                Section(header: Text("Appearance")) {
                    Picker("Color Mode", selection: $settingsStore.colorScheme) {
                        ForEach(AppColorScheme.allCases) { scheme in
                            Text(scheme.label).tag(scheme)
                        }
                    }
                }

                Section(header: Text("Reminders")) {
                    Toggle("Daily reminder", isOn: $settingsStore.reminderEnabled)
                        .onChange(of: settingsStore.reminderEnabled) { _, enabled in
                            Task {
                                if enabled {
                                    let granted = await NotificationService.requestAuthorization()
                                    if granted {
                                        NotificationService.scheduleDailyReminder(
                                            hour: settingsStore.reminderHour,
                                            minute: settingsStore.reminderMinute
                                        )
                                    } else {
                                        settingsStore.reminderEnabled = false
                                    }
                                } else {
                                    NotificationService.cancelReminder()
                                }
                            }
                        }

                    DatePicker(
                        "Time",
                        selection: reminderTimeBinding,
                        displayedComponents: .hourAndMinute
                    )
                    .onChange(of: settingsStore.reminderHour) { _, _ in
                        if settingsStore.reminderEnabled {
                            NotificationService.scheduleDailyReminder(
                                hour: settingsStore.reminderHour,
                                minute: settingsStore.reminderMinute
                            )
                        }
                    }
                    .onChange(of: settingsStore.reminderMinute) { _, _ in
                        if settingsStore.reminderEnabled {
                            NotificationService.scheduleDailyReminder(
                                hour: settingsStore.reminderHour,
                                minute: settingsStore.reminderMinute
                            )
                        }
                    }
                }

                Section(header: Text("About")) {
                    Text("Briefs are only generated on demand. Adjust your sources to improve coverage.")
                }
            }
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Settings")
    }

    private var reminderTimeBinding: Binding<Date> {
        Binding<Date>(
            get: {
                var components = DateComponents()
                components.hour = settingsStore.reminderHour
                components.minute = settingsStore.reminderMinute
                return Calendar.current.date(from: components) ?? Date()
            },
            set: { newDate in
                let components = Calendar.current.dateComponents([.hour, .minute], from: newDate)
                settingsStore.reminderHour = components.hour ?? settingsStore.reminderHour
                settingsStore.reminderMinute = components.minute ?? settingsStore.reminderMinute
            }
        )
    }
}

private enum NotificationService {
    static let reminderIdentifier = "dailyBrief.reminder"

    static func requestAuthorization() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return false
        }
    }

    static func scheduleDailyReminder(hour: Int, minute: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Daily Brief"
        content.body = "Ready for your AI brief? Tap to generate."
        content.sound = .default

        var date = DateComponents()
        date.hour = hour
        date.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        let request = UNNotificationRequest(
            identifier: reminderIdentifier,
            content: content,
            trigger: trigger
        )

        let center = UNUserNotificationCenter.current()
        center.add(request)
    }

    static func cancelReminder() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [reminderIdentifier])
    }
}
