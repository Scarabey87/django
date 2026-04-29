import { cn } from "@/lib/utils";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";
import AgeGate from "@/components/age-gate";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "LIVE-AI.ART",
  description: "Exclusive AI Video Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          GeistSans.variable,
          GeistMono.variable
        )}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AgeGate />
            {children}
          </ThemeProvider>
      </body>
    </html>
  );
}