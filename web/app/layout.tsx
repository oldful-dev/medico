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
  title: "Medico Web App",
  description: "Your health, our priority.",
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

