import type { Metadata } from "next";
import Link from "next/link";
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
  title: "Vibra",
  description:
    "Identidad visual para búsqueda multimodal en Gamarra. Entra una fotografía, sale un ranking de tiendas registradas ordenadas por resonancia.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
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
      <body className="bg-caliza-5 text-basalto-90 min-h-screen font-sans selection:bg-higo-30 selection:text-basalto-90 antialiased flex flex-col">
        <div className="flex-1 flex flex-col">{children}</div>
        <footer className="border-t border-caliza-20 bg-caliza-5 py-4 px-5 md:px-8 text-center text-[12px] leading-[18px] text-grafito-55">
          <div className="max-w-[1200px] mx-auto flex items-center justify-center gap-2">
            <Link href="/terminos" className="hover:text-basalto-90 underline-offset-4 hover:underline transition-colors">
              Términos
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacidad" className="hover:text-basalto-90 underline-offset-4 hover:underline transition-colors">
              Privacidad
            </Link>
            <span aria-hidden="true">·</span>
            <a href="mailto:equipovibra@gmail.com" className="hover:text-basalto-90 underline-offset-4 hover:underline transition-colors">
              Contacto
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
