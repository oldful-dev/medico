import type { Metadata } from "next";
import { Poppins, Lexend_Deca } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

const lexendDeca = Lexend_Deca({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "Oldful - Senior Care that feels like family",
  description: "Comprehensive elder care management platform delivering healthcare to your door.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${lexendDeca.variable}`}>
      <body className="min-h-screen flex flex-col antialiased bg-(--color-bg-screen) font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

