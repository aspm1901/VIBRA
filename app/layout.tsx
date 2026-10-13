import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vibra — Muéstralo. Encuéntralo cerca.",
  description:
    "Plataforma de búsqueda visual de ropa para tiendas de Gamarra. Encuentra las tiendas cuyo estilo tiene mayor afinidad con tu referencia visual.",
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
    <html lang="es" className={`dark ${jakarta.variable}`}>
      <body className="bg-background text-slate-100 min-h-screen font-sans selection:bg-vibra-500 selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
