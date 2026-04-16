import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MobileNavigation from "@/components/MobileNavigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "School Management System",
  description: "Unified Gateway for Library and Account Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background antialiased`}>
        <MobileNavigation />
        <main>{children}</main>
      </body>
    </html>
  );
}
