import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CompressorWheel from "@/components/account/CompressorWheel";
import { safeNextPath } from "@/lib/auth/redirect";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Logga in",
  description: "Logga in på ditt kundkonto hos TurboTeknik.",
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  inaktivt: "Kontot är inte aktiverat för inloggning än. Kontakta oss så hjälper vi dig.",
  utloggad: "Du är utloggad.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; fel?: string; status?: string }> }) {
  const { next, fel, status } = await searchParams;
  const notice = (fel && NOTICES[fel]) || (status && NOTICES[status]) || null;

  return (
    <>
      <Header />
      <main className="bg-gray-50 flex-1">
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
          <div className="grid md:grid-cols-[5fr_7fr] bg-white border border-gray-200 rounded-xl overflow-hidden">

            {/* Brand panel */}
            <section className="relative bg-black text-white overflow-hidden px-6 py-8 md:px-10 md:py-12 min-h-[168px] md:min-h-[520px]">
              <CompressorWheel className="pointer-events-none absolute -right-28 -bottom-32 w-64 opacity-40 md:opacity-90 md:w-[420px] md:-right-40 md:-bottom-40" />
              <div className="relative max-w-xs">
                <h1 className="text-3xl md:text-4xl font-black leading-tight">Kundinloggning</h1>
                <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                  Kundkonton skapas av TurboTeknik. Har du fått inloggningsuppgifter av oss loggar du in här.
                </p>
              </div>
            </section>

            {/* Form */}
            <section className="px-6 py-8 md:px-12 md:py-12 flex flex-col justify-center">
              <div className="w-full max-w-sm mx-auto md:mx-0">
                <h2 className="text-xl font-black text-black">Logga in på ditt konto</h2>
                <p className="mt-1 mb-7 text-sm text-gray-500">Använd e-postadressen som ditt konto är registrerat på.</p>
                <LoginForm next={safeNextPath(next)} notice={notice} signOutFirst={fel === "inaktivt"} />
                <p className="mt-8 pt-6 border-t border-gray-100 text-sm text-gray-500">
                  Vill du bli kund?{" "}
                  <Link href="/kontakt" className="text-red-600 font-medium hover:text-red-700">Hör av dig</Link>{" "}
                  så skapar vi ett konto åt dig.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
