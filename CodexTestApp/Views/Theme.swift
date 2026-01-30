import SwiftUI
import UIKit

enum AppTheme {
    private static func dynamicColor(dark: UIColor, light: UIColor) -> Color {
        Color(UIColor { trait in
            trait.userInterfaceStyle == .dark ? dark : light
        })
    }

    private static let backgroundTop = dynamicColor(
        dark: UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0),
        light: UIColor(red: 0.97, green: 0.96, blue: 0.94, alpha: 1.0)
    )

    private static let backgroundMid = dynamicColor(
        dark: UIColor(red: 0.16, green: 0.15, blue: 0.26, alpha: 1.0),
        light: UIColor(red: 0.93, green: 0.95, blue: 0.97, alpha: 1.0)
    )

    private static let backgroundBottom = dynamicColor(
        dark: UIColor(red: 0.10, green: 0.21, blue: 0.28, alpha: 1.0),
        light: UIColor(red: 0.90, green: 0.94, blue: 0.96, alpha: 1.0)
    )

    static let backgroundGradient = LinearGradient(
        colors: [backgroundTop, backgroundMid, backgroundBottom],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let cardFill = dynamicColor(
        dark: UIColor(white: 1.0, alpha: 0.14),
        light: UIColor(white: 0.0, alpha: 0.06)
    )
    static let cardStroke = dynamicColor(
        dark: UIColor(white: 1.0, alpha: 0.18),
        light: UIColor(white: 0.0, alpha: 0.08)
    )
    static let accent = Color(red: 0.98, green: 0.56, blue: 0.30)
    static let muted = dynamicColor(
        dark: UIColor(white: 1.0, alpha: 0.7),
        light: UIColor(white: 0.0, alpha: 0.6)
    )
    static let highlight = Color(red: 0.22, green: 0.76, blue: 0.68)
    static let primaryText = dynamicColor(
        dark: UIColor(white: 1.0, alpha: 1.0),
        light: UIColor(white: 0.05, alpha: 1.0)
    )
}

enum AppFont {
    static func display(_ size: CGFloat) -> Font {
        .custom("AvenirNext-DemiBold", size: size)
    }

    static func title(_ size: CGFloat) -> Font {
        .custom("AvenirNext-Medium", size: size)
    }

    static func body(_ size: CGFloat) -> Font {
        .custom("AvenirNext-Regular", size: size)
    }
}

extension View {
    func glassCard() -> some View {
        padding(16)
            .background(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(AppTheme.cardFill)
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(AppTheme.cardStroke, lineWidth: 1)
                    )
            )
            .shadow(color: Color.black.opacity(0.25), radius: 16, x: 0, y: 8)
    }
}
