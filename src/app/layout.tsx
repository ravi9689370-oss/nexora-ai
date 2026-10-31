import type { Metadata } from "next";
import "./globals.css";
import { AppLayout } from "@/components/layout/app-layout";

export const metadata: Metadata = {
  title: "Nexora AI",
  description: "Multi-model AI, Agents, REA Reverse Engineering, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-black text-white">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
