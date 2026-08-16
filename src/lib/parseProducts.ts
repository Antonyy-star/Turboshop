import fs from "fs";
import path from "path";

export type ParsedProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  sku: string;
  images: string[];
  badge: string | null;
  description: string;
};

function getValue(block: string, key: string): string {
  const lines = block.split("\n");
  const line = lines.find((l) => {
    const upper = l.trim().toUpperCase();
    return upper.startsWith(key.toUpperCase() + ":");
  });
  if (!line) return "";
  return line.substring(line.indexOf(":") + 1).trim();
}

function parseBlock(block: string, brand: string): ParsedProduct | null {
  const name = getValue(block, "NAMN");
  const priceStr = getValue(block, "PRIS");
  const reaPrisStr = getValue(block, "REA-PRIS");
  const sku = getValue(block, "SKU/ARTIKELNUMMER").replace(/\s+/g, "");
  const bildStr = getValue(block, "BILD");
  const badgeStr = getValue(block, "BADGE");
  const description = getValue(block, "BESKRIVNING");

  if (!name || !priceStr || !sku) return null;

  const price = parseFloat(priceStr);
  if (isNaN(price)) return null;

  const reaPris = parseFloat(reaPrisStr);
  const originalPrice = !isNaN(reaPris) && reaPris > 0 ? reaPris : null;

  const images = bildStr
    .split(",")
    .map((s) => s.trim().replace(/^"+|"+$/g, "").trim())
    .filter(Boolean)
    .map((url) => url.replace(/medium_default/g, "thickbox_default"));

  const id = `${brand.toLowerCase().replace(/\s+/g, "-")}-${sku}`;

  return {
    id,
    name,
    brand,
    price,
    originalPrice,
    sku,
    images,
    badge: badgeStr || null,
    description,
  };
}

export function getAllRealProducts(): ParsedProduct[] {
  const productsDir = path.join(process.cwd(), "public", "Products");
  if (!fs.existsSync(productsDir)) return [];

  const brands = fs
    .readdirSync(productsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const all: ParsedProduct[] = [];

  for (const brand of brands) {
    const txtPath = path.join(productsDir, brand, "products.txt");
    if (!fs.existsSync(txtPath)) continue;

    const content = fs.readFileSync(txtPath, "utf-8");
    const blocks = content.split("---");

    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed || trimmed.startsWith("===") || trimmed.startsWith("FORMAT") || trimmed.startsWith("=")) continue;
      const product = parseBlock(block, brand);
      if (product) all.push(product);
    }
  }

  return all;
}

export function getRealProductById(id: string): ParsedProduct | undefined {
  return getAllRealProducts().find((p) => p.id === id);
}
