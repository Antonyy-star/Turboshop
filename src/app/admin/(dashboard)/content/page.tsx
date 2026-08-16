import { createClient } from "@/lib/supabase/server";
import ContentEditor, { SiteContent } from "@/components/admin/ContentEditor";

const defaults: SiteContent = {
  hero: {
    eyebrow: "Frakt över hela världen",
    heading: "Premium turbos &\nbildelar",
    subtext: "OEM och eftermarknads turboladdare, patroner och delar för alla märken och modeller. Snabb leverans, expertsupport.",
    button1_label: "Handla turbos",
    button1_href: "/kategori/turboladdare",
    button2_label: "Visa alla delar",
    button2_href: "/kategori/delar",
  },
  feature1: {
    eyebrow: "Rubrik här",
    heading: "Din text kommer\natt synas här",
    body: "Beskriv din produkt, tjänst eller fördel här. Berätta för kunden varför de ska välja er. Kort, tydligt och övertygande.",
    button_label: "Läs mer →",
    button_href: "/kategori/turboladdare",
    image: "/Images/Bilden1.jpeg",
  },
  feature2: {
    eyebrow: "Rubrik här",
    heading: "Din text kommer\natt synas här",
    body: "Beskriv din produkt, tjänst eller fördel här. Berätta för kunden varför de ska välja er. Kort, tydligt och övertygande.",
    button_label: "Läs mer →",
    button_href: "/kategori/turboladdare",
    image: "/Images/teknik1.jpeg",
  },
  why: {
    cards: [
      { title: "Expertkunskap",    desc: "Vårt team är turbospecialister med decennier av erfarenhet." },
      { title: "Snabb leverans",   desc: "Beställningar före kl. 14:00 skickas samma dag. Leverans världen över." },
      { title: "Kvalitetsgaranti", desc: "Alla delar testade och verifierade. Full garanti på varje beställning." },
    ],
  },
};

export default async function AdminContent() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("key, content");

  const db: Record<string, any> = {};
  data?.forEach(row => { db[row.key] = row.content; });

  const content: SiteContent = {
    hero:     db.hero     ?? defaults.hero,
    feature1: db.feature1 ?? defaults.feature1,
    feature2: db.feature2 ?? defaults.feature2,
    why:      db.why      ?? defaults.why,
  };

  return <ContentEditor initialContent={content} />;
}
