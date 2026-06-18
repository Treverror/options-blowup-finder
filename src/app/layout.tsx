import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Options Blow-Up Finder",
  description:
    "Screens stocks for under-reacted news catalysts and ranks options ideas. Research only — not financial advice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
