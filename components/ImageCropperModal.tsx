"use client";

import React, { useState, useCallback, useEffect } from "react";
import Cropper, { Area, MediaSize } from "react-easy-crop";
import { ZoomIn, ZoomOut, Check, X, Crop, Maximize2, Square } from "lucide-react";

interface ImageCropperModalProps {
  imageSrc: string;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

// Función auxiliar para recortar y optimizar la imagen en el canvas del navegador
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No se pudo obtener el contexto 2d del canvas");
  }

  // Escalar proporcionalmente a un máximo de 640px para carga y procesamiento ultrarrápido
  const MAX_DIM = 640;
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * MAX_DIM) / targetWidth);
      targetWidth = MAX_DIM;
    } else {
      targetWidth = Math.round((targetWidth * MAX_DIM) / targetHeight);
      targetHeight = MAX_DIM;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return canvas.toDataURL("image/jpeg", 0.82);
}

// Redimensiona una imagen completa a un tamaño óptimo ligero
async function getDownscaledFullImg(imageSrc: string): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const MAX_DIM = 640;
  let targetWidth = image.naturalWidth || image.width;
  let targetHeight = image.naturalHeight || image.height;

  if (targetWidth <= MAX_DIM && targetHeight <= MAX_DIM) {
    return imageSrc;
  }

  if (targetWidth > targetHeight) {
    targetHeight = Math.round((targetHeight * MAX_DIM) / targetWidth);
    targetWidth = MAX_DIM;
  } else {
    targetWidth = Math.round((targetWidth * MAX_DIM) / targetHeight);
    targetHeight = MAX_DIM;
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageSrc;

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [naturalAspect, setNaturalAspect] = useState<number>(3 / 4);
  const [aspectMode, setAspectMode] = useState<"full" | "3:4" | "1:1">("full");

  // Detectar dimensiones naturales de la imagen inmediatamente
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        const aspect = img.naturalWidth / img.naturalHeight;
        setNaturalAspect(aspect);
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const onMediaLoaded = (mediaSize: MediaSize) => {
    if (mediaSize.naturalWidth && mediaSize.naturalHeight) {
      const aspect = mediaSize.naturalWidth / mediaSize.naturalHeight;
      setNaturalAspect(aspect);
    }
  };

  const onCropChange = (newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropCompleteCallback = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApplyCrop = async () => {
    try {
      setIsProcessing(true);
      // Si está en modo foto completa y sin zoom relevante, optimizamos la imagen completa
      if (aspectMode === "full" && zoom <= 1.02 && crop.x === 0 && crop.y === 0) {
        const optimized = await getDownscaledFullImg(imageSrc);
        onCropComplete(optimized);
        return;
      }

      if (!croppedAreaPixels) {
        const optimized = await getDownscaledFullImg(imageSrc);
        onCropComplete(optimized);
        return;
      }

      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error("Error al recortar la imagen:", e);
      onCropComplete(imageSrc);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseOriginal = async () => {
    try {
      setIsProcessing(true);
      const optimized = await getDownscaledFullImg(imageSrc);
      onCropComplete(optimized);
    } catch {
      onCropComplete(imageSrc);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectAspect = (mode: "full" | "3:4" | "1:1") => {
    setAspectMode(mode);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow || "";
      document.documentElement.style.overflow = originalHtmlOverflow || "";
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  const currentAspect =
    aspectMode === "full"
      ? naturalAspect
      : aspectMode === "1:1"
      ? 1
      : 3 / 4;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-lg bg-[#18181b] border border-[#2e2e38] rounded-3xl p-5 md:p-6 text-white shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2e2e38]">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-vibra-400" />
            <h3 className="text-lg font-bold text-white">Encuadra la imagen</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-[#272730] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de modo de encuadre */}
        <div className="flex items-center gap-1.5 p-1 bg-[#121215] rounded-2xl border border-[#2b2b36] my-3">
          <button
            type="button"
            onClick={() => selectAspect("full")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              aspectMode === "full"
                ? "bg-vibra-500 text-white shadow-md shadow-vibra-950/40"
                : "text-gray-400 hover:text-white hover:bg-[#1a1a20]"
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Toda la foto (100%)</span>
          </button>

          <button
            type="button"
            onClick={() => selectAspect("3:4")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              aspectMode === "3:4"
                ? "bg-vibra-500 text-white shadow-md shadow-vibra-950/40"
                : "text-gray-400 hover:text-white hover:bg-[#1a1a20]"
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Prenda (3:4)</span>
          </button>

          <button
            type="button"
            onClick={() => selectAspect("1:1")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              aspectMode === "1:1"
                ? "bg-vibra-500 text-white shadow-md shadow-vibra-950/40"
                : "text-gray-400 hover:text-white hover:bg-[#1a1a20]"
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Cuadrado (1:1)</span>
          </button>
        </div>

        {/* Área del Cropper */}
        <div className="relative w-full h-84 md:h-[400px] bg-black rounded-2xl overflow-hidden mb-3 border border-[#2e2e38]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={currentAspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            onMediaLoaded={onMediaLoaded}
          />
        </div>

        {/* Control de Zoom */}
        <div className="flex items-center gap-3 px-2 py-1">
          <ZoomOut className="w-4 h-4 text-gray-400" />
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-vibra-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
          />
          <ZoomIn className="w-4 h-4 text-gray-400" />
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#2e2e38]">
          <button
            type="button"
            onClick={handleUseOriginal}
            className="flex-1 py-3 px-4 bg-[#23232b] hover:bg-[#2d2d38] text-gray-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Foto completa directa
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleApplyCrop}
            className="flex-1 py-3 px-4 bg-vibra-500 hover:bg-vibra-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-vibra-950/40"
          >
            <Check className="w-4 h-4" />
            <span>{isProcessing ? "Procesando..." : "Confirmar encuadre"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
