import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import { AuthProvider } from '@/context/AuthContext';

const font = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "ACCIDENTAI",
  description: "Created by Manzi Ivan",
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
