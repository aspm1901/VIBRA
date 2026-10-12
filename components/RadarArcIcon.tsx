import React from "react";
import { ResonanceBand } from "@/types";

interface RadarArcIconProps {
  score: number;
  band: ResonanceBand;
  isStyleMode?: boolean;
  className?: string;
}

export const RadarArcIcon: React.FC<RadarArcIconProps> = ({
  score,
  band,
  isStyleMode = false,
  className = "",
}) => {
  const percentage = Math.round(score * 100);
  const activeArcs = band === "Alta" ? 3 : band === "Media" ? 2 : 1;

  // Etiqueta amigable de fácil comprensión humana
  const label = isStyleMode
    ? band === "Alta"
      ? "Afinidad alta"
      : band === "Media"
      ? "Afinidad media"
      : "Explorar estilo"
    : band === "Alta"
    ? "Muy parecida"
    : band === "Media"
    ? "Parecida"
    : "Por explorar";

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Icono de 3 arcos de resonancia como adorno sutil */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 34 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-vibra-400 mb-0.5"
      >
        <path
          d="M 12 11 A 8 8 0 0 1 12 23"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={activeArcs >= 1 ? 1 : 0.25}
          className="transition-opacity duration-300"
        />
        <path
          d="M 16 7 A 13 13 0 0 1 16 27"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={activeArcs >= 2 ? 1 : 0.25}
          className="transition-opacity duration-300"
        />
        <path
          d="M 20 3 A 18 18 0 0 1 20 31"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={activeArcs >= 3 ? 1 : 0.25}
          className="transition-opacity duration-300"
        />
      </svg>

      {/* Porcentaje numérico y etiqueta amigable */}
      <div className="text-center">
        <span className="text-lg font-black text-white block tracking-tight leading-none">
          {percentage}%
        </span>
        <span className="text-[10px] sm:text-[11px] font-bold text-vibra-300 tracking-wide mt-0.5 block whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
};
