import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export const metadata: Metadata = {
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
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Vanguard",
    title: "Vanguard - Community Incident Awareness Platform",
    description:
      "Stay informed about local emergencies and incidents in your community.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vanguard - Community Incident Awareness Platform",
    description:
      "Stay informed about local emergencies and incidents in your community.",
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
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
