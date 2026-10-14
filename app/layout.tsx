import type { Metadata } from "next";
import "./globals.css";
import "./figma.css";

export const metadata: Metadata = {
  title: "Do Nothing · Review Studio",
  description: "Manage client QR codes and help customers write reviews in their own words.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
