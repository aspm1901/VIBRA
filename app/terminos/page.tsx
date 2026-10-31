import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { VibraBrandLogo } from "@/components/RadarArcIcon";

export const metadata: Metadata = {
  title: "Términos de uso · Vibra",
  description: "Términos de uso de VIBRA (Versión 2026-10-31).",
};

export default function TerminosPage() {
  return (
    <div className="flex-1 bg-caliza-5 text-basalto-90">
      <header className="border-b border-caliza-20 bg-caliza-5/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[820px] mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="focus:outline-none py-1">
            <VibraBrandLogo showIsotipo={true} />
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-full neu-chip text-basalto-90 text-xs sm:text-[13px] font-medium hover:border-higo-70/50 transition-all"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-[820px] mx-auto px-5 md:px-8 py-10 sm:py-14">
        <article className="neu-elevated rounded-3xl p-6 sm:p-10 space-y-5 text-[14px] sm:text-[15px] leading-[24px] text-basalto-90">
          <div>
            <h1
              className="font-display font-bold text-[28px] leading-[34px] sm:text-[36px] sm:leading-[42px] text-basalto-90"
              style={{ letterSpacing: "-0.025em" }}
            >
              Términos de uso de VIBRA
            </h1>
            <p className="text-[13px] text-grafito-55 mt-1 font-medium">Versión 2026-10-31</p>
          </div>

          <p>
            <strong>1. Qué es VIBRA.</strong> VIBRA es una plataforma web que te orienta sobre en qué tiendas de moda femenina de Gamarra buscar, a partir de una foto o de estilos que eliges. No vende prendas, no administra inventarios y no garantiza que una tienda tenga una prenda, talla, color o precio determinado. Confirma esos datos con la tienda antes de ir.
          </p>

          <p>
            <strong>2. Quién puede usarla.</strong> Personas de 18 años o más.
          </p>

          <p>
            <strong>3. Fotos que subes.</strong> Usas tu foto solo como referencia de búsqueda. Declaras que puedes usar esa imagen para ese fin y que no subirás contenido ilegal ni que vulnere derechos de terceros. Si puedes, recorta solo la prenda.
          </p>

          <p>
            <strong>4. Resultados.</strong> VIBRA usa inteligencia artificial para interpretar tu foto y ordenar las tiendas por afinidad visual y de estilo. La IA puede equivocarse. El porcentaje de afinidad es una orientación: no mide exactitud ni confirma stock, talla ni precio.
          </p>

          <p>
            <strong>5. Tiendas y terceros.</strong> Las tiendas, WhatsApp y Google Maps son ajenos a VIBRA. El precio, la disponibilidad y cualquier compra se acuerdan directamente entre tú y cada tienda; VIBRA no es parte de esa relación.
          </p>

          <p>
            <strong>6. Planes de pago.</strong> Si VIBRA ofrece planes de pago, se mostrarán el precio, la vigencia y el comprobante antes de que pagues.
          </p>

          <p>
            <strong>7. Propiedad intelectual.</strong> Las fotos y datos de las tiendas se publican con su autorización y pertenecen a sus titulares, igual que sus marcas. No puedes copiarlos ni reutilizarlos sin permiso. El nombre, el diseño y el software de VIBRA pertenecen a VIBRA.
          </p>

          <p>
            <strong>8. Tiendas: corregir o retirar tu ficha.</strong> Si representas a una tienda y quieres corregir o retirar tu ficha, escríbenos a{" "}
            <a href="mailto:equipovibra@gmail.com" className="text-higo-70 underline hover:text-basalto-90">
              equipovibra@gmail.com
            </a>
            .
          </p>

          <p>
            <strong>9. Datos personales.</strong> Tratamos tus datos según nuestra{" "}
            <Link href="/privacidad" className="text-higo-70 underline hover:text-basalto-90">
              Política de privacidad
            </Link>
            .
          </p>

          <p>
            <strong>10. Cambios y ley aplicable.</strong> Podemos actualizar estos términos; vale la versión publicada aquí. Se rigen por las leyes del Perú. Contacto:{" "}
            <a href="mailto:equipovibra@gmail.com" className="text-higo-70 underline hover:text-basalto-90">
              equipovibra@gmail.com
            </a>
            .
          </p>
        </article>
      </main>
    </div>
  );
}
