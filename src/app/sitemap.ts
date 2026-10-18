import { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAll, SITE_URL } from "@/lib/supabase/fetchAll";

export const revalidate = 86400;

const base = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const brands = ["garrett", "borgwarner", "mitsubishi", "holset", "ihi", "toyota", "bmts", "hitachi", "valeo", "continental", "cz-turbo", "master"];
  const categories = ["turboladdare", "turbodelar", "chra", "kompressorhjul", "packningar", "prestanda", "utrustning", "tuning"];

  const supabase = createServiceClient();
  // products has no updated_at column; created_at is the closest available date
  const products = await fetchAll<{ id: string; created_at: string | null }>((from, to) =>
    supabase.from("products").select("id, created_at").order("id", { ascending: true }).range(from, to),
  ).catch(() => []);

  const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/produkt/${p.id}`,
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
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
