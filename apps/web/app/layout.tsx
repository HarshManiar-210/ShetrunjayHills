import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shetrunjay Hills",
  description: "Shetrunjay Hills Web GIS Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/*
        Dark mode is disabled for now. This used to carry a bootstrap script
        that set the `dark` class from localStorage or the OS colour-scheme
        preference before first paint. Without it the app always renders
        light, regardless of system settings. To re-enable: restore the
        script here and uncomment <ThemeToggle /> in components/Header.tsx —
        the `.dark` styles in globals.css and the map's dark basemap are
        both still in place and will start working again.
      */}
      <body className="min-h-full flex flex-col">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
