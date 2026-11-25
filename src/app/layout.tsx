import type { Metadata, Viewport } from "next";
import { Hind_Siliguri } from "next/font/google";
import { getLang, getTheme } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

// One family that covers both Bangla and Latin text.
const hind = Hind_Siliguri({
  variable: "--font-hind",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Hisab", template: "%s · Hisab" },
  description: "Personal bKash money tracker",
  applicationName: "Hisab",
  appleWebApp: { capable: true, title: "Hisab", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2eee5" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1e23" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [lang, theme] = await Promise.all([getLang(), getTheme()]);
  return (
    <html lang={lang} data-theme={theme} className={`${hind.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <I18nProvider lang={lang}>{children}</I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
