import { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/server";

export const revalidate = 86400;

const base = "https://turboshop-pi.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const brands = ["garrett", "borgwarner", "mitsubishi", "holset", "ihi", "toyota", "bmts", "hitachi", "valeo", "continental", "cz-turbo", "master"];
  const categories = ["turboladdare", "turbodelar", "chra", "kompressorhjul", "packningar", "prestanda", "utrustning", "tuning"];

  const supabase = createServiceClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, updated_at")
    .order("id", { ascending: true })
    .limit(10000);

  const productUrls: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${base}/produkt/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/katalog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/kontakt`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/kontakta-oss`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
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
    ...productUrls,
  ];
}
