import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { schoolConfig } from "@/config/school";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${schoolConfig.name} | Portal Escolar`,
  description: schoolConfig.description,
  icons: {
    icon: schoolConfig.branding.favicon
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const schoolTheme = {
    "--school-primary": schoolConfig.theme.primary,
    "--school-primary-foreground": schoolConfig.theme.primaryForeground,
    "--school-accent": schoolConfig.theme.accent,
    "--school-accent-foreground": schoolConfig.theme.accentForeground,
    "--primary": schoolConfig.theme.primary,
    "--primary-foreground": schoolConfig.theme.primaryForeground,
    "--accent": schoolConfig.theme.accent,
    "--accent-foreground": schoolConfig.theme.accentForeground,
    "--ring": schoolConfig.theme.primary
  } as CSSProperties;

  return (
    <html lang="pt-BR">
      <body className={inter.className} style={schoolTheme}>
        {children}
      </body>
    </html>
  );
}
