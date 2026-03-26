import type { Metadata } from "next";
import { Oswald, Sono } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400", "500", "600", "700"],
});

const sono = Sono({
  subsets: ["latin"],
  variable: "--font-data",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "DispatchTrack",
  description: "Sistema de Trazabilidad, Monitoreo y Rendimiento del Área de Despacho",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${oswald.variable} ${sono.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
