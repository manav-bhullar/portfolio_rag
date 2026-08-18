import AdminShortcutListener from '@/components/analytics/AdminShortcutListener';
import { Analytics } from "@vercel/analytics/react"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from '@/components/posthog-provider';
import "./globals.css";

// Inter for body text
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Google Sans Flex for display/headline text — the real Material 3 typeface
// (open-sourced 2025), self-hosted since it isn't in next/font/google's
// bundled catalog yet. DESIGN.md: confident, rounded, warm.
const googleSansFlex = localFont({
  src: [
    { path: "./fonts/GoogleSansFlex-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/GoogleSansFlex-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/GoogleSansFlex-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/GoogleSansFlex-700.ttf", weight: "700", style: "normal" },
    { path: "./fonts/GoogleSansFlex-800.ttf", weight: "800", style: "normal" },
    { path: "./fonts/GoogleSansFlex-900.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-google-sans-flex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Manav Bhullar | AI Portfolio",
  description: "Interactive portfolio with an AI-powered persona that answers questions about my full-stack, data analytics, and AI/ML work",
  keywords: [
    "Manav Bhullar",
    "Portfolio",
    "Developer",
    "AI",
    "Interactive",
    "Web Development",
    "Full Stack",
    "Data Analytics",
    "Next.js",
    "React"
  ],
  authors: [
    {
      name: "Manav Bhullar",
    },
  ],
  creator: "Manav Bhullar",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Manav Bhullar Portfolio",
    description: "Interactive portfolio with an AI-powered persona that answers questions about my work",
    siteName: "Manav Bhullar Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Manav Bhullar Portfolio",
    description: "Interactive portfolio with an AI-powered persona that answers questions about my work",
  },
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        sizes: "any",
      }
    ],
    shortcut: "/favicon.svg?v=2",
    apple: "/apple-touch-icon.svg?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.svg" sizes="any" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable,
          googleSansFlex.variable,
        )}
      >
        <PostHogProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
          >
            <main className="flex min-h-screen flex-col">
              {children}
            </main>
            <Toaster />
          </ThemeProvider>
          <Analytics />
          <AdminShortcutListener />
        </PostHogProvider>
      </body>
    </html>
  );
}