import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/app/providers/query-provider";
import { SettingsProvider } from "@/app/providers/settings-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { getSiteSettings } from "@/features/catalog/server/settings";
import { montserrat, playfairDisplay } from "@/lib/fonts";
import "@/app/globals.css";

// Revalidate site-settings-backed chrome (header/footer) periodically so
// Contentful edits surface without a redeploy.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Alesea Lifestyle",
  description:
    "Tees and pieces of your favorite stay to bring home — coastal apparel from La Union, Philippines.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="bg-cream text-ink font-sans min-h-full flex flex-col overflow-x-hidden">
        <QueryProvider>
          <SettingsProvider
            value={{
              currency: settings.currency,
              freeShipThreshold: settings.freeShipThreshold,
              standardShipping: settings.standardShipping,
              expressShipping: settings.expressShipping,
            }}
          >
            <SiteHeader
              logo={settings.logo}
              navLinks={settings.navLinks}
              bookNowLabel={settings.bookNowLabel}
              bookNowUrl={settings.bookNowUrl}
            />
            <main className="flex-1">{children}</main>
            <SiteFooter settings={settings} />
            <CartDrawer />
          </SettingsProvider>
        </QueryProvider>
        <Toaster richColors position="bottom-center" />
      </body>
    </html>
  );
}
