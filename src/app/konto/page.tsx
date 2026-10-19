import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { requireCustomerPage } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import ChangePasswordForm from "./ChangePasswordForm";
import LogoutButton from "./LogoutButton";

export const metadata: Metadata = {
  title: "Mitt konto",
  robots: { index: false, follow: false },
};

type DiscountCode = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_order_value: number | null;
  max_uses: number | null;
  uses_count: number | null;
  expires_at: string | null;
  applies_to: string | null;
  applies_to_value: string | null;
};

const kr = (n: number) => `${new Intl.NumberFormat("sv-SE").format(n)} kr`;

function discountValue(c: DiscountCode) {
  return c.type === "percentage" ? `${c.value} % rabatt` : `${kr(c.value)} rabatt`;
}

function discountTerms(c: DiscountCode): string[] {
  const terms: string[] = [];
  if (c.applies_to === "category" && c.applies_to_value) terms.push(`Gäller kategorin ${c.applies_to_value}`);
  else if (c.applies_to === "product" && c.applies_to_value) terms.push(`Gäller artikel ${c.applies_to_value}`);
  else terms.push("Gäller alla produkter");
  if (c.min_order_value && c.min_order_value > 0) terms.push(`Vid köp från ${kr(c.min_order_value)}`);
  if (c.expires_at) terms.push(`Giltig till ${new Date(c.expires_at).toLocaleDateString("sv-SE")}`);
  if (c.max_uses !== null) {
    const left = Math.max(0, c.max_uses - (c.uses_count ?? 0));
    terms.push(left === 1 ? "1 användning kvar" : `${left} användningar kvar`);
  }
  return terms;
}

async function personalDiscountCodes(email: string): Promise<DiscountCode[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("id, code, type, value, min_order_value, max_uses, uses_count, expires_at, applies_to, applies_to_value")
    .ilike("assigned_to_email", email.replace(/[%_\\]/g, "\\$&"))
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  const now = Date.now();
  return (data as DiscountCode[]).filter(c =>
    (!c.expires_at || new Date(c.expires_at).getTime() > now) &&
    (c.max_uses === null || (c.uses_count ?? 0) < c.max_uses)
  );
}

export default async function AccountPage() {
  const user = await requireCustomerPage("/konto");
  const meta = user.user_metadata ?? {};
  const name: string = meta.name || user.email?.split("@")[0] || "";
  const firstName = name.split(/\s+/)[0];
  const codes = user.email ? await personalDiscountCodes(user.email) : [];

  const postort = [meta.postnummer, meta.ort].filter(Boolean).join(" ");
  const address = [meta.adress, postort].filter(Boolean).join(", ");
  const details: [string, string][] = [
    ["Namn", name || "—"],
    ["E-post", user.email ?? "—"],
    ["Telefon", meta.telefon || "—"],
    ["Företag", meta.foretag || "—"],
    ...(meta.orgnr ? [["Organisationsnummer", meta.orgnr] as [string, string]] : []),
    ["Adress", address || "—"],
  ];

  return (
    <>
      <Header />
      <main className="bg-gray-50 flex-1">
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-10">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-black leading-tight">
                {firstName ? `Hej ${firstName}` : "Mitt konto"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">Inloggad som {user.email}</p>
            </div>
            <LogoutButton />
          </div>

          <div className="grid gap-6 md:grid-cols-3 items-start">
            <div className="md:col-span-2 space-y-6">

              <section aria-labelledby="codes-title" className="bg-white border border-gray-200 rounded-xl">
                <div className="px-6 pt-6 pb-4">
                  <h2 id="codes-title" className="text-lg font-black text-black">Dina rabattkoder</h2>
                  <p className="mt-1 text-sm text-gray-500">Personliga koder som gäller för ditt konto.</p>
                </div>
                {codes.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-gray-500">
                    Du har inga personliga rabattkoder just nu.
                  </p>
                ) : (
                  <ul className="border-t border-gray-100">
                    {codes.map(c => (
                      <li key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-6 py-4 border-b border-gray-100 last:border-0">
                        <span className="self-start font-mono font-bold tracking-wider text-sm text-black border border-dashed border-red-500 bg-red-50 rounded px-3 py-1.5 select-all">
                          {c.code}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-black">{discountValue(c)}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{discountTerms(c).join(". ")}.</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="password-title" className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 id="password-title" className="text-lg font-black text-black">Byt lösenord</h2>
                <p className="mt-1 mb-6 text-sm text-gray-500">Ange ditt nuvarande lösenord och välj ett nytt.</p>
                <ChangePasswordForm email={user.email ?? ""} />
              </section>
            </div>

            <section aria-labelledby="details-title" className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 id="details-title" className="text-lg font-black text-black">Dina uppgifter</h2>
              <dl className="mt-4 divide-y divide-gray-100">
                {details.map(([k, v]) => (
                  <div key={k} className="py-3 first:pt-0">
                    <dt className="text-xs text-gray-500">{k}</dt>
                    <dd className="text-sm text-black mt-0.5 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
                Stämmer något inte?{" "}
                <Link href="/kontakt" className="text-red-600 font-medium hover:text-red-700">Kontakta oss</Link>{" "}
                så uppdaterar vi dina uppgifter.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
