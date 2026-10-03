import type { Metadata } from "next";
import { EB_Garamond, Geist } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const garamond = EB_Garamond({ subsets: ["latin"], variable: "--font-eb-garamond" });

export const metadata: Metadata = {
  title: { default: "FEXO Admin", template: "%s — FEXO Admin" },
  description: "FEXO store administration",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${garamond.variable}`}>
      <body>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
