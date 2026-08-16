export type Product = {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  sku: string;
  badge: string | null;
};

const brands = ["Garrett", "BorgWarner", "Holset", "Mitsubishi", "IHI", "BMTS", "Continental", "Hitachi", "Valeo", "Toyota", "Master", "CZ Turbo"];

const models = [
  "GT1544V", "GT1749V", "GT2052V", "GT2256V", "GT2560R", "GT3071R", "GT3076R", "GT3582R", "GT4202R", "GTX2867R",
  "GTX3071R", "GTX3076R", "GTX3582R", "GTX4202R", "GTX4508R", "G25-550", "G25-660", "G30-770", "G30-900",
  "EFR 6258", "EFR 6758", "EFR 7163", "EFR 7670", "EFR 8374", "S200", "S300", "S400", "HX25", "HX30", "HX35",
  "HX40", "HX50", "HX55", "HY35", "HE200", "HE300", "HE351", "HE400", "HE431", "HE500",
  "TD02", "TD03", "TD04", "TD04HL", "TD05", "TD05H", "TD06", "TD06SL2", "TD07", "TF035",
  "TF035HL", "TF04", "RHF3", "RHF4", "RHF5", "RHB5", "RHB52", "VF30", "VF34", "VF39",
  "VF43", "VF48", "VF52", "B03", "B04", "B06", "VNT15", "VNT17", "VNT20", "VNT25",
];

const variants = ["", " Gen II", " Plus", " Sport", " Pro", " HD", " T3", " T4", " T3/T4", " Twin Scroll", " Hybrid"];
const applications = [
  "1.6 TDI", "1.9 TDI", "2.0 TDI", "2.5 TDI", "3.0 TDI", "1.4 TSI", "1.8 TSI", "2.0 TSI",
  "2.7 BiTurbo", "3.0 BiTurbo", "Diesel Universal", "Petrol Universal", "6.7 Cummins",
  "5.9 Cummins", "7.3 PowerStroke", "6.0 PowerStroke", "Duramax", "EJ20", "EJ25", "4G63",
  "2JZ-GTE", "1JZ-GTE", "SR20DET", "RB26DETT", "B5234T4", "D5244T", "OM651", "N47", "M57",
];

const brandModels: Record<string, string[]> = {
  garrett: [
    "GT1238", "GT1241", "GT1444", "GT1544V", "GT1749V", "GT1752S", "GT1756V", "GT1759V",
    "GT2052V", "GT2056V", "GT2256V", "GT2259S", "GT2560R", "GT2860R", "GT2860RS", "GT2871R",
    "GT3071R", "GT3076R", "GT3082R", "GT3271R", "GT3540", "GT3576R", "GT3582R", "GT3788R",
    "GT4082R", "GT4088R", "GT4202R", "GT4294R", "GT4508R", "GTX2860R", "GTX2867R", "GTX2871R",
    "GTX3071R", "GTX3076R", "GTX3082R", "GTX3271R", "GTX3576R", "GTX3582R", "GTX3788R",
    "GTX4088R", "GTX4202R", "GTX4294R", "GTX4508R", "G25-550", "G25-660", "G30-660",
    "G30-770", "G30-900", "G35-900", "G35-1050", "G40-1150", "G42-1200", "G45-1350",
  ],
  borgwarner: [
    "EFR 6258", "EFR 6758", "EFR 7163", "EFR 7670", "EFR 8374", "EFR 9180",
    "S200", "S300", "S300SX", "S400", "S400SX", "S475", "S480",
    "K03", "K04", "K14", "K16", "K24", "K26", "K27", "K28", "K29", "K31",
  ],
  holset: [
    "HX25", "HX30", "HX35", "HX40", "HX50", "HX55", "HX60", "HY35", "HY50",
    "HE200", "HE211", "HE300", "HE341", "HE351", "HE400", "HE431", "HE500", "HE551",
  ],
  mitsubishi: [
    "TD02", "TD03", "TD04", "TD04HL", "TD04L", "TD05", "TD05H", "TD05HR",
    "TD06", "TD06SL2", "TD06H", "TD07", "TD07S", "TF035", "TF035HL", "TF04",
  ],
  ihi: [
    "RHF3", "RHF4", "RHF4H", "RHF5", "RHF5H", "RHB5", "RHB51", "RHB52",
    "VF30", "VF34", "VF37", "VF39", "VF43", "VF48", "VF52", "VF54", "VF56",
  ],
};

const brandApplications: Record<string, string[]> = {
  garrett: [
    "Audi 1.8T", "Audi 2.7T", "Audi 3.0 TFSI", "VW Golf GTI", "VW Passat TDI",
    "BMW 335i", "BMW M3 S55", "BMW 135i", "BMW 535d", "Mercedes C63 AMG",
    "Mercedes E300 CDI", "Porsche 911 Turbo", "Porsche Cayenne S", "Subaru WRX EJ20",
    "Subaru STI EJ257", "Mitsubishi EVO 4G63", "Nissan GT-R RB26", "Toyota Supra 2JZ",
    "Honda Civic K20", "Ford Mustang EcoBoost", "Ford F-250 6.7L", "Dodge Cummins 5.9",
    "Chevy Duramax LBZ", "Universal Petrol", "Universal Diesel", "Race / Track Build",
  ],
};

export function generateBrandProducts(brand: string, count: number): Product[] {
  const key = brand.toLowerCase();
  const modelList = brandModels[key] ?? models;
  const appList = brandApplications[key] ?? applications;
  const products: Product[] = [];
  const displayBrand = brand.charAt(0).toUpperCase() + brand.slice(1);

  for (let i = 1; i <= count; i++) {
    const model = modelList[i % modelList.length];
    const app = appList[i % appList.length];
    const variant = variants[i % variants.length];
    const basePrice = 1490 + ((i * 211) % 28000);
    const hasDiscount = i % 4 === 0;
    const originalPrice = hasDiscount ? Math.round(basePrice * 1.2 / 10) * 10 : null;
    const badge = i % 9 === 0 ? "Ny" : hasDiscount ? "Rea" : null;

    products.push({
      id: i,
      name: `${displayBrand} ${model}${variant} — ${app}`,
      brand: displayBrand,
      price: basePrice,
      originalPrice,
      sku: `${key.substring(0, 3).toUpperCase()}-${model.replace(/[\s-]/g, "")}-${String(i).padStart(4, "0")}`,
      badge,
    });
  }
  return products;
}

export function generateProducts(count: number): Product[] {
  const products: Product[] = [];
  for (let i = 1; i <= count; i++) {
    const brand = brands[i % brands.length];
    const model = models[i % models.length];
    const variant = variants[i % variants.length];
    const app = applications[i % applications.length];
    const basePrice = 990 + ((i * 137) % 24000);
    const hasDiscount = i % 3 === 0;
    const originalPrice = hasDiscount ? Math.round(basePrice * 1.2 / 10) * 10 : null;
    const badge = i % 7 === 0 ? "Ny" : hasDiscount ? "Rea" : null;

    products.push({
      id: i,
      name: `${brand} ${model}${variant} — ${app}`,
      brand,
      price: basePrice,
      originalPrice,
      sku: `${brand.substring(0, 3).toUpperCase()}-${model.replace(/\s/g, "")}-${String(i).padStart(4, "0")}`,
      badge,
    });
  }
  return products;
}
