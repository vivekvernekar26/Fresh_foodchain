import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FreshChain OS — AI Autonomous Cold-Chain Integrity",
  description:
    "Real-time food cold-chain command center: IoT telemetry monitoring, AI spoilage prediction, fraud prevention, and dynamic dispatch optimization from Farm to Table.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="antialiased bg-[#06090e] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
