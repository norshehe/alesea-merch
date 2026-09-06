import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { montserrat, playfairDisplay } from "@/lib/fonts";
import "@/app/globals.css";

// Admin surfaces are operator tools: never cached, never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alesea Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="admin-theme bg-background text-foreground font-sans min-h-full">
        {children}
        <Toaster richColors position="bottom-center" />
      </body>
    </html>
  );
}
