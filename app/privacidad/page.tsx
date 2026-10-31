import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { VibraBrandLogo } from "@/components/RadarArcIcon";

export const metadata: Metadata = {
  title: "Política de privacidad · Vibra",
  description: "Política de privacidad de VIBRA (Versión 2026-10-31).",
};

export default function PrivacidadPage() {
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
              Política de privacidad de VIBRA
            </h1>
            <p className="text-[13px] text-grafito-55 mt-1 font-medium">Versión 2026-10-31</p>
          </div>

          <p>
            <strong>1. Quién es responsable de tus datos.</strong> Equipo VIBRA, proyecto académico. VIBRA es un prototipo de demostración y aún no opera como empresa: los datos de identificación y el domicilio del responsable se publicarán cuando el servicio opere comercialmente. Contacto:{" "}
            <a href="mailto:equipovibra@gmail.com" className="text-higo-70 underline hover:text-basalto-90">
              equipovibra@gmail.com
            </a>
            .
          </p>

          <div className="space-y-2">
            <p>
              <strong>2. Qué datos tratamos.</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Tu foto de consulta (o su recorte):</strong> la enviamos a la IA de Google para reconocer la prenda y compararla con las tiendas. VIBRA no guarda tu foto. No la usamos para reconocer personas.
              </li>
              <li>
                <strong>Estilos y filtros que eliges:</strong> para ordenar las tiendas en esa búsqueda.
              </li>
              <li>
                <strong>Correo y nombre de tu cuenta de Google</strong>, solo si inicias sesión: para guardar y sincronizar tu ruta.
              </li>
              <li>
                <strong>Tu ruta:</strong> las tiendas que añades. Se guarda en tu navegador y, si inicias sesión, también en tu cuenta.
              </li>
              <li>
                <strong>Tu aceptación de estos textos:</strong> guardamos en tu navegador la versión y la fecha.
              </li>
              <li>
                <strong>Datos de contacto de las tiendas</strong> (nombre y teléfono de WhatsApp), que las tiendas nos entregan con su autorización.
              </li>
            </ul>
          </div>

          <p>
            <strong>3. Para qué los usamos.</strong> Para buscar tiendas afines a tu referencia, guardar tu ruta y mostrar la información de cada tienda. No vendemos tus datos ni los usamos para publicidad.
          </p>

          <p>
            <strong>4. A quién se los enviamos.</strong> A los proveedores que hacen funcionar VIBRA: Google (inteligencia artificial e inicio de sesión), Supabase (base de datos) y Vercel (alojamiento). Google procesa tu foto como proveedor de IA y puede conservar registros temporales por seguridad, según sus términos. Estos proveedores pueden procesar los datos fuera del Perú.
          </p>

          <div className="space-y-2">
            <p>
              <strong>5. Cuánto tiempo los conservamos.</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Tu foto: VIBRA no la guarda.</li>
              <li>Tu cuenta y tu ruta: hasta que pidas eliminarlas.</li>
              <li>Datos de las tiendas: mientras su ficha esté publicada y hasta que pidan retirarla.</li>
            </ul>
          </div>

          <p>
            <strong>6. Qué pasa si no entregas tus datos.</strong> Sin foto, puedes usar solo la búsqueda &quot;Por estilo&quot;. Sin iniciar sesión, tu ruta queda únicamente en este navegador.
          </p>

          <p>
            <strong>7. Tus derechos.</strong> Puedes pedir acceso, rectificación, cancelación u oposición sobre tus datos, y revocar tu consentimiento en cualquier momento, sin justificación, escribiendo a{" "}
            <a href="mailto:equipovibra@gmail.com" className="text-higo-70 underline hover:text-basalto-90">
              equipovibra@gmail.com
            </a>
            . Respondemos en los plazos del reglamento (8 días hábiles para información, 20 para acceso y 10 para rectificación, cancelación y oposición). Si no estás conforme, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.
          </p>

          <p>
            <strong>8. Menores de edad.</strong> VIBRA está dirigido a personas de 18 años o más.
          </p>

          <p>
            <strong>9. Almacenamiento en tu navegador.</strong> Guardamos tu ruta y tu aceptación en el almacenamiento local de tu navegador. VIBRA no usa cookies de publicidad.
          </p>

          <p>
            <strong>10. Cambios.</strong> Si cambiamos esta política, publicaremos la nueva versión aquí y, cuando corresponda, volveremos a pedir tu aceptación.
          </p>
        </article>
      </main>
    </div>
  );
}
