"use client";

import React, { useState, useCallback, useEffect } from "react";
import Cropper, { Area, MediaSize } from "react-easy-crop";
import { ZoomIn, ZoomOut, Check, X, Crop, Maximize2, Square } from "lucide-react";

interface ImageCropperModalProps {
  imageSrc: string;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-basalto-90/80 backdrop-blur-md overflow-y-auto animate-vibra-fade"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-lg bg-white border border-caliza-20/80 rounded-3xl p-5 sm:p-6 text-basalto-90 shadow-[0_25px_70px_-15px_rgba(20,22,25,0.45)] ring-1 ring-black/5 flex flex-col my-auto max-h-[96vh] overflow-y-auto animate-vibra-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-caliza-20">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-higo-70" />
            <h3 className="font-display text-[20px] font-semibold text-basalto-90">
              Encuadra la prenda
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full neu-chip flex items-center justify-center text-grafito-55 hover:text-basalto-90 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de proporción */}
        <div className="flex items-center gap-1.5 p-1.5 neu-sunken rounded-2xl my-3">
          <button
            type="button"
            onClick={() => selectAspect("full")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              aspectMode === "full"
                ? "neu-chip text-higo-70 font-semibold border border-higo-30"
                : "text-grafito-55 hover:text-basalto-90"
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Foto completa</span>
          </button>

          <button
            type="button"
            onClick={() => selectAspect("3:4")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              aspectMode === "3:4"
                ? "neu-chip text-higo-70 font-semibold border border-higo-30"
                : "text-grafito-55 hover:text-basalto-90"
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Vertical (3:4)</span>
          </button>

          <button
            type="button"
            onClick={() => selectAspect("1:1")}
            className={`flex-1 py-2 px-2.5 rounded-xl text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              aspectMode === "1:1"
                ? "neu-chip text-higo-70 font-semibold border border-higo-30"
                : "text-grafito-55 hover:text-basalto-90"
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Cuadrado (1:1)</span>
          </button>
        </div>

        {/* Área del Cropper */}
        <div className="relative w-full h-[300px] sm:h-[340px] bg-basalto-90 rounded-2xl overflow-hidden mb-3 border border-caliza-20">
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
          <ZoomOut className="w-4 h-4 text-grafito-55" />
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-higo-70 h-1.5 bg-caliza-20 rounded-lg cursor-pointer"
          />
          <ZoomIn className="w-4 h-4 text-grafito-55" />
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-caliza-20">
          <button
            type="button"
            onClick={handleUseOriginal}
            className="flex-1 py-3 px-4 neu-chip text-basalto-90 rounded-full text-[13px] font-medium transition-colors"
          >
            Usar sin recortar
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleApplyCrop}
            className="flex-1 py-3 px-4 bg-higo-70 hover:bg-vibra-600 text-white rounded-full text-[13px] font-medium transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isProcessing ? "Procesando..." : "Confirmar encuadre"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
