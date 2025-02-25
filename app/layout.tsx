import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";

const font = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "THE ROAD",
  description: "Created by Uteramahoro Avellin Bonaparte & Manzi David",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${font.variable} ${font.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
