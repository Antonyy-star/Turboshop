import { MetadataRoute } from "next";

const base = "https://turboshop-sigma.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const brands = ["garrett", "borgwarner", "mitsubishi", "holset", "ihi", "toyota", "bmts", "hitachi", "valeo", "continental", "cz-turbo", "master"];
  const categories = ["turboladdare", "turbodelar", "kompressorhjul", "packningar", "prestanda", "utrustning"];

  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/kontakt`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/kontakta-oss`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/katalog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    ...categories.map((slug) => ({
      url: `${base}/kategori/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...brands.map((brand) => ({
      url: `${base}/marke/${brand}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
