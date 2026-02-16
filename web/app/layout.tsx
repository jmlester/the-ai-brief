import "./globals.css";
import { Viewport } from "next";

export const metadata = {
  title: "The AI Brief",
  description: "The AI Brief across web and iOS"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="page">{children}</div>
      </body>
    </html>
  );
}
