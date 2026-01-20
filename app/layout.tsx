import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://vanguardalerts.com"
  ),
  title: {
    default: "Vanguard - Community Incident Awareness Platform",
    template: "%s | Vanguard",
  },
  description:
    "Stay informed about local emergencies and incidents in your community. Real-time tracking, weather alerts, and community updates all in one place.",
  keywords: [
    "community awareness",
    "incident tracking",
    "local emergencies",
    "PulsePoint integration",
    "weather alerts",
    "community safety",
    "emergency notifications",
  ],
  authors: [{ name: "Vanguard" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Vanguard",
    title: "Vanguard - Community Incident Awareness Platform",
    description:
      "Stay informed about local emergencies and incidents in your community.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vanguard - Community Incident Awareness Platform",
    description:
      "Stay informed about local emergencies and incidents in your community.",
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider>
          <ConvexClientProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
