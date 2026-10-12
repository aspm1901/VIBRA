import React from "react";
import { ResonanceBand } from "@/types";

interface RadarArcIconProps {
  score: number;
  band: ResonanceBand;
  className?: string;
}

export const RadarArcIcon: React.FC<RadarArcIconProps> = ({ score, band, className = "" }) => {
  // Cantidad de arcos activos según la banda (especificación VIBRA sección 6.3)
  const activeArcs = band === "Alta" ? 3 : band === "Media" ? 2 : 1;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Icono de 3 arcos de resonancia */}
      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-vibra-400"
      >
        {/* Arco 1 (Interno) */}
        <path
          d="M 12 11 A 8 8 0 0 1 12 23"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={activeArcs >= 1 ? 1 : 0.2}
          className="transition-opacity duration-300"
        />
        {/* Arco 2 (Medio) */}
        <path
          d="M 16 7 A 13 13 0 0 1 16 27"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={activeArcs >= 2 ? 1 : 0.2}
          className="transition-opacity duration-300"
        />
        {/* Arco 3 (Externo) */}
        <path
          d="M 20 3 A 18 18 0 0 1 20 31"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={activeArcs >= 3 ? 1 : 0.2}
          className="transition-opacity duration-300"
        />
      </svg>

      {/* Puntaje numérico y etiqueta de banda */}
      <div className="text-center mt-1">
        <span className="text-sm font-bold text-gray-100 block tracking-tight">
          {score.toFixed(2).replace(".", ",")}
        </span>
        <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
          {band}
        </span>
      </div>
    </div>
  );
};
