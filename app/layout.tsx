import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vibra — Muéstralo. Encuéntralo cerca.",
  description:
    "Plataforma de búsqueda visual de ropa para tiendas de Gamarra. Encuentra las tiendas cuyo estilo tiene mayor afinidad con tu referencia visual.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-background text-gray-100 min-h-screen selection:bg-vibra-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
