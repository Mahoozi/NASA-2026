import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

// Archivo carries a width axis: headings are set narrow in globals.css.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Firebreak",
  description: "What NASA has burned in space, and what it hasn't.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-foreground">
        <Nav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
