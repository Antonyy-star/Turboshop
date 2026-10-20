import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogSearchBox from "@/components/catalog/CatalogSearchBox";
import { PartResults, TurboResults } from "@/components/catalog/CatalogResults";
import { createServiceClient } from "@/lib/supabase/server";
import { MIN_QUERY_LENGTH, normaliseNumber, searchCatalog, type CatalogSearchResult } from "@/lib/catalog/search";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ s?: string }> }): Promise<Metadata> {
  const { s } = await searchParams;
  return {
    title: s ? `Katalogsökning: ${s.slice(0, 60)}` : "Avancerad katalogsökning",
    robots: { index: false, follow: true },
  };
}

const EXAMPLES = ["49377-06200", "GT1749V", "144119953R", "GA-04-0015"];

export default async function CatalogSearchPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "" } = await searchParams;
  const query = s.trim().slice(0, 60);
  const tooShort = normaliseNumber(query).length < MIN_QUERY_LENGTH;

  let result: CatalogSearchResult | null = null;
  let failed = false;
  if (!tooShort) {
    try {
      result = await searchCatalog(createServiceClient(), query);
    } catch {
      failed = true;
    }
  }
  const nothing = result && result.turbos.length === 0 && result.parts.length === 0;

  return (
    <>
      <Header />
      <main className="bg-white min-h-screen text-black">
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
            <nav className="text-sm text-gray-500 mb-3" aria-label="Brödsmulor">
              <Link href="/" className="hover:text-red-600">Hem</Link>
              <span className="mx-2">›</span>
              <Link href="/katalog" className="hover:text-red-600">Katalog</Link>
              <span className="mx-2">›</span>
              <span className="text-black">Sökning</span>
            </nav>
            <h1 className="text-2xl font-bold mb-1">
              {query ? <>Sökresultat för <span className="font-mono">{query}</span></> : "Avancerad katalogsökning"}
            </h1>
            <p className="text-sm text-gray-600 mb-4 max-w-2xl">
              Sök på turbonummer, OEM-nummer, modell eller artikelnummer för att se vilka delar som passar ihop.
            </p>
            <div className="max-w-2xl">
              <CatalogSearchBox initial={query} autoFocus={!query} />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {!query ? (
            <Examples />
          ) : tooShort ? (
            <Notice title="Skriv minst tre tecken">Sök till exempel på de första siffrorna i ett turbonummer.</Notice>
          ) : failed ? (
            <Notice title="Sökningen gick inte att genomföra">Försök igen om en stund. Fungerar det fortfarande inte, kontakta oss så hjälper vi dig.</Notice>
          ) : nothing ? (
            <>
              <Notice title={`Inga träffar för ”${query}”`}>
                Kontrollera numret, eller sök på en del av det. Bindestreck och mellanslag spelar ingen roll.
                Hittar du inte det du söker? <Link href="/kontakta-oss" className="text-red-600 hover:underline">Kontakta oss</Link> så hjälper vi dig.
              </Notice>
              <Examples />
            </>
          ) : result ? (
            <>
              {result.turbos.length > 0 && <TurboResults turbos={result.turbos} total={result.turbosTotal} />}
              {result.parts.length > 0 && <PartResults parts={result.parts} total={result.partsTotal} />}
              {(result.turbosTotal > result.turbos.length || result.partsTotal > result.parts.length) && (
                <p className="text-sm text-gray-500">Många träffar. Skriv ett längre nummer för att begränsa sökningen.</p>
              )}
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 mb-8 max-w-2xl">
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}

function Examples() {
  return (
    <div className="text-sm text-gray-600">
      <p className="mb-2">Exempel:</p>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map(e => (
          <Link key={e} href={`/katalog/sok?s=${encodeURIComponent(e)}`}
            className="font-mono px-3 py-1.5 border border-gray-300 rounded-md hover:border-red-500 hover:text-red-600 transition">
            {e}
          </Link>
        ))}
      </div>
    </div>
  );
}
