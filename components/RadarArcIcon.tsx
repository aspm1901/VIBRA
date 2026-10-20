import React from "react";
import { ResonanceBand } from "@/types";

interface RadarArcIconProps {
  score: number;
  band: ResonanceBand;
  isStyleMode?: boolean;
  className?: string;
}

/**
 * 2 · Medidor de afinidad (Manual v2.0, pág. 4 y 7)
 * Retícula base 8u: Núcleo r=8, arcos en r=20, 32 y 44, barrido 140°, grosores 7, 5 y 3.
 * Escala de resonancia con un solo matiz:
 * - Alta: Higo 70 (#71545B) en los tres arcos y en la cifra
 * - Media: Grafito 55 (#676B63) en dos arcos, Caliza 20 (#CFD1C7) en el exterior
 * - Exploratoria / Baja: Grafito 55 (#676B63) en un arco, Caliza 20 (#CFD1C7) en los otros dos
 */
export const RadarArcIcon: React.FC<RadarArcIconProps> = ({
  score,
  band,
  className = "",
}) => {
  const percentage = Math.round(score * 100);

  const isAlta = band === "Alta";
  const isMedia = band === "Media";

  const coreColor = isAlta ? "#71545B" : "#676B63";
  const arc1Color = isAlta ? "#71545B" : "#676B63";
  const arc2Color = isAlta ? "#71545B" : isMedia ? "#676B63" : "#CFD1C7";
  const arc3Color = isAlta ? "#71545B" : "#CFD1C7";

  return (
    <div className={`flex flex-col items-center justify-center w-16 select-none ${className}`}>
      <svg
        width="34"
        height="36"
        viewBox="12 2 62 92"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-1"
        aria-hidden="true"
      >
        {/* Núcleo r = 8 */}
        <circle cx="24" cy="48" r="8" fill={coreColor} />
        {/* Arco 1: r = 20, grosor = 7 */}
        <path
          d="M 30.84 29.21 A 20 20 0 0 1 30.84 66.79"
          stroke={arc1Color}
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Arco 2: r = 32, grosor = 5 */}
        <path
          d="M 34.94 17.93 A 32 32 0 0 1 34.94 78.07"
          stroke={arc2Color}
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Arco 3: r = 44, grosor = 3 */}
        <path
          d="M 39.05 6.65 A 44 44 0 0 1 39.05 89.35"
          stroke={arc3Color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      <div className="text-center">
        <span
          className={`text-[15px] leading-[19px] font-semibold tabular-nums block ${
            isAlta ? "text-higo-70" : "text-basalto-90"
          }`}
        >
          {percentage}%
        </span>
        <span
          className={`text-[11px] leading-[14px] font-medium block mt-0.5 ${
            isAlta ? "text-higo-70" : "text-grafito-55"
          }`}
        >
          {band}
        </span>
      </div>
    </div>
  );
};

/**
 * 1 · Isotipo + Logotipo oficial "vıbra" (Manual v2.0, pág. 4 y 5)
 * El punto de la "i" se sustituye por el núcleo del isotipo en Higo 70 (#71545B)
 * sin romper jamás la línea base tipográfica.
 */
export const VibraBrandLogo: React.FC<{ showIsotipo?: boolean; className?: string }> = ({
  showIsotipo = true,
  className = "",
}) => {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {showIsotipo && (
        <svg
          width="30"
          height="32"
          viewBox="12 2 62 92"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="shrink-0"
        >
          <circle cx="24" cy="48" r="8" fill="#26282A" />
          <path
            d="M 30.84 29.21 A 20 20 0 0 1 30.84 66.79"
            stroke="#26282A"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 34.94 17.93 A 32 32 0 0 1 34.94 78.07"
            stroke="#71545B"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 39.05 6.65 A 44 44 0 0 1 39.05 89.35"
            stroke="#676B63"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span
        className="font-display font-semibold text-[28px] sm:text-[31px] leading-none text-basalto-90 whitespace-nowrap"
        style={{ letterSpacing: "-0.048em" }}
      >
        v
        <span className="relative inline-block">
          ı
          <span
            className="
              absolute left-1/2 -translate-x-1/2
              top-[0.06em] w-[0.21em] h-[0.21em]
              rounded-full bg-higo-70 pointer-events-none
            "
            aria-hidden="true"
          />
        </span>
        bra
      </span>
    </span>
  );
};

/**
 * 3 · Indicador de carga: barrido del núcleo hacia fuera en ciclo de 1.4 s (Manual v2.0, pág. 4)
 */
export const ResonanceSweepLoader: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="12 2 62 92"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="24" cy="48" r="8" fill="#71545B" />
    <path
      d="M 30.84 29.21 A 20 20 0 0 1 30.84 66.79"
      stroke="#71545B"
      strokeWidth="7"
      strokeLinecap="round"
      className="arc-sweep-1"
    />
    <path
      d="M 34.94 17.93 A 32 32 0 0 1 34.94 78.07"
      stroke="#71545B"
      strokeWidth="5"
      strokeLinecap="round"
      className="arc-sweep-2"
    />
    <path
      d="M 39.05 6.65 A 44 44 0 0 1 39.05 89.35"
      stroke="#676B63"
      strokeWidth="3"
      strokeLinecap="round"
      className="arc-sweep-3"
    />
  </svg>
);

/**
 * 4 · Estado vacío: núcleo sin propagación (Manual v2.0, pág. 4 y 12)
 */
export const ResonanceEmptyNode: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="32" cy="32" r="22" fill="#E2E3DB" />
    <circle cx="32" cy="32" r="8" fill="#B6B9AD" />
  </svg>
);
