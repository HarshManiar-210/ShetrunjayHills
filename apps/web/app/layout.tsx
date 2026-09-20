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
  title: "Shatrunjay Hills",
  description: "Shatrunjay Hills Web GIS Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/*
        Dark is the app's only theme, per the client's UI/UX brief — the `dark`
        class is pinned on <html> rather than chosen at runtime, so there is no
        bootstrap script, no localStorage read and no first-paint flash.
        The light palette in globals.css (`:root`) is still complete and still
        correct; nothing reads it while this class is set.

        To offer both again: drop `dark` from the className above, restore a
        pre-paint script that sets it from localStorage / the OS preference,
        and add a toggle to components/Header.tsx beside SHOW_PROFILE_MENU.
      */}
      <body className="min-h-full flex flex-col">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
