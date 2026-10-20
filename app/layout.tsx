import type { Metadata } from "next";
import { Bricolage_Grotesque, Poppins } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-bricolage",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "vibra — Muéstralo. Encuéntralo cerca.",
  description:
    "Identidad visual para búsqueda multimodal en Gamarra. Entra una fotografía, sale un ranking de tiendas físicas reales ordenadas por resonancia.",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${bricolage.variable} ${poppins.variable}`}>
      <body className="bg-caliza-5 text-basalto-90 min-h-screen font-sans selection:bg-higo-30 selection:text-basalto-90 antialiased">
        {children}
      </body>
    </html>
  );
}
