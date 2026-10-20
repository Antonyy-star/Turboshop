import sharp from "sharp";

// Product images are stored as WebP: about a third of the JPEG size with no
// visible difference, which keeps Supabase Storage well under the free 1 GB.
// Never larger than 1024px on the long side (the size Turbocentras supplies),
// so zooming on the product page stays sharp.
export const PRODUCT_IMAGE_TYPE = "image/webp";
export const PRODUCT_IMAGE_EXT = "webp";

export async function compressProductImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toBuffer();
}
