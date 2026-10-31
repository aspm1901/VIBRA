import sharp from "sharp";
import { sanitizeLookPieces, type LookPiece, type LookPieceQuery } from "@/lib/look-pieces";

export async function prepareLookImage(dataUrl: string): Promise<string> {
  const data = dataUrl.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
  // La visión y los recortes deben usar la misma orientación, incluso con EXIF de celulares.
  const normalized = await sharp(Buffer.from(data, "base64")).rotate()
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 }).toBuffer();
  return `data:image/jpeg;base64,${normalized.toString("base64")}`;
}

export async function embedLookPieces(
  preparedImage: string,
  pieces: LookPiece[],
  embed: (image: string) => Promise<number[] | null>
): Promise<LookPieceQuery[]> {
  const valid = sanitizeLookPieces(pieces);
  if (!valid.length || valid.length !== pieces.length) throw new Error("No pudimos separar las prendas principales. Prueba otra foto o recorta una prenda.");
  const image = Buffer.from(preparedImage.split(",")[1], "base64");
  const { width, height } = await sharp(image).metadata();
  if (!width || !height) throw new Error("No pudimos leer la foto del look.");
  const results = await Promise.allSettled(valid.map(async piece => {
    const [ymin, xmin, ymax, xmax] = piece.box;
    const left = Math.floor(xmin * width / 1000);
    const top = Math.floor(ymin * height / 1000);
    const right = Math.min(width, Math.ceil(xmax * width / 1000));
    const bottom = Math.min(height, Math.ceil(ymax * height / 1000));
    const crop = await sharp(image).extract({ left, top, width: right - left, height: bottom - top })
      .jpeg({ quality: 88 }).toBuffer();
    const queryVector = await embed(`data:image/jpeg;base64,${crop.toString("base64")}`);
    if (!queryVector?.length || !queryVector.every(Number.isFinite) || !queryVector.some(n => n !== 0)) {
      throw new Error(`No pudimos comparar la prenda «${piece.name}». Reintenta la búsqueda.`);
    }
    return { ...piece, queryVector };
  }));
  const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failed) throw failed.reason;
  return results.map(result => (result as PromiseFulfilledResult<LookPieceQuery>).value);
}
