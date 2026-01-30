import "./globals.css";

export const metadata = {
  title: "The AI Brief",
  description: "The AI Brief across web and iOS"
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
