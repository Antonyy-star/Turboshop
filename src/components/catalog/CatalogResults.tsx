"use client";

import { useState } from "react";
import Link from "next/link";
import type { CatalogPart, CatalogTurbo, CatalogTurboPart } from "@/lib/catalog/search";
import { EyeIcon, QuickViewLink } from "./QuickView";

// Same columns as the turbocentras.com catalog search.
const MAIN_COLUMNS: { type: string; label: string }[] = [
  { type: "Cartridge",            label: "Patron" },
  { type: "Nozzle ring assembly", label: "Munstycksring" },
  { type: "Repair kit",           label: "Reparationssats" },
  { type: "Turbine housing",      label: "Turbinhus" },
  { type: "Compressor housing",   label: "Kompressorhus" },
  { type: "Actuator",             label: "Ställdon" },
];

const linkCls = "text-[#0891b2] hover:text-red-600";

// A part number: opens the part's catalog page in the quick view.
function PartRef({ part }: { part: Pick<CatalogTurboPart, "ref" | "pid" | "type"> }) {
  if (!part.pid) return <span className="font-mono text-gray-700">{part.ref}</span>;
  return (
    <QuickViewLink href={`/katalog/produkt/${part.pid}`} title={`${part.type} ${part.ref}`} className={`${linkCls} font-mono`}>
      {part.ref}
    </QuickViewLink>
  );
}

// A turbo number: the eye opens a quick view, the number opens the turbo's catalog page.
function TurboRef({ turbo }: { turbo: Pick<CatalogTurbo, "id" | "reference"> }) {
  const ref = turbo.reference ?? String(turbo.id);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <QuickViewLink href={`/katalog/turbo/${turbo.id}`} title={`Turbocharger ${ref}`} className={`${linkCls} p-0.5`}>
        <EyeIcon /><span className="sr-only">Snabbvy {ref}</span>
      </QuickViewLink>
      <Link href={`/katalog/turbo/${turbo.id}`} className={`${linkCls} font-mono`}>{ref}</Link>
    </span>
  );
}

const partsOfType = (t: CatalogTurbo, type: string) => t.parts.filter(p => p.type === type);

export function TurboResults({ turbos, total }: { turbos: CatalogTurbo[]; total: number }) {
  return (
    <section aria-labelledby="turbo-results" className="mb-10">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 id="turbo-results" className="text-sm font-bold uppercase tracking-wide text-black">Turboladdare som matchar sökningen</h2>
        <p className="text-sm text-gray-500">
          {total > turbos.length ? `Visar ${turbos.length} av ${total.toLocaleString("sv-SE")}` : `${total} st`}
        </p>
      </div>

      <div className="hidden md:block overflow-x-auto border border-gray-200">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-600">
              <th className="px-3 py-2.5 font-semibold text-center">Serie</th>
              <th className="px-3 py-2.5 font-semibold text-center">Modell</th>
              <th className="px-3 py-2.5 font-semibold text-center">Turbo</th>
              {MAIN_COLUMNS.map(c => <th key={c.type} className="px-3 py-2.5 font-semibold text-center">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {turbos.map(t => (
              <tr key={t.id} className="border-t border-gray-200 hover:bg-gray-50 text-center align-top">
                <td className="px-3 py-2 text-gray-700">{t.series ?? ""}</td>
                <td className="px-3 py-2 text-gray-700">{t.model ?? ""}</td>
                <td className="px-3 py-2"><TurboRef turbo={t} /></td>
                {MAIN_COLUMNS.map(c => (
                  <td key={c.type} className="px-3 py-2 whitespace-nowrap">
                    <div className="flex flex-col items-center gap-0.5">
                      {partsOfType(t, c.type).map(p => <PartRef key={p.ref} part={p} />)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per turbo */}
      <ul className="md:hidden space-y-2">
        {turbos.map(t => {
          const main = MAIN_COLUMNS.map(c => ({ ...c, parts: partsOfType(t, c.type) })).filter(c => c.parts.length);
          return (
            <li key={t.id} className="border border-gray-200 bg-white p-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <TurboRef turbo={t} />
                <span className="text-xs text-gray-500 text-right">{[t.series, t.model].filter(Boolean).join(" · ")}</span>
              </div>
              {main.length > 0 && (
                <dl className="mt-2 space-y-1">
                  {main.map(c => (
                    <div key={c.type} className="flex gap-3">
                      <dt className="w-32 shrink-0 text-gray-500">{c.label}</dt>
                      <dd className="flex flex-wrap gap-x-3">{c.parts.map(p => <PartRef key={p.ref} part={p} />)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const TURBOS_SHOWN = 12;

function FitsTurbos({ part }: { part: CatalogPart }) {
  const [all, setAll] = useState(false);
  const shown = all ? part.turbos : part.turbos.slice(0, TURBOS_SHOWN);
  const hidden = part.turboCount - shown.length;
  if (part.turboCount === 0) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5">
      {shown.map(t => (
        <Link key={t.id} href={`/katalog/turbo/${t.id}`} className={`${linkCls} font-mono`}
          title={[t.brand, t.model].filter(Boolean).join(" ")}>
          {t.reference}
        </Link>
      ))}
      {hidden > 0 && (
        !all && part.turbos.length > shown.length ? (
          <button type="button" onClick={() => setAll(true)} className="text-gray-500 hover:text-red-600 underline">visa fler</button>
        ) : (
          <span className="text-gray-500">och {hidden.toLocaleString("sv-SE")} till</span>
        )
      )}
    </div>
  );
}

function PartWithEye({ part }: { part: CatalogPart }) {
  if (!part.product_id) return <span className="font-mono text-gray-700">{part.reference}</span>;
  return (
    <QuickViewLink href={`/katalog/produkt/${part.product_id}`} title={`${part.type ?? "Part"} ${part.reference}`}
      className={`${linkCls} inline-flex items-center gap-1.5 font-mono`}>
      <EyeIcon />{part.reference}
    </QuickViewLink>
  );
}

export function PartResults({ parts, total }: { parts: CatalogPart[]; total: number }) {
  return (
    <section aria-labelledby="part-results" className="mb-10">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 id="part-results" className="text-sm font-bold uppercase tracking-wide text-black">Turbodelar som matchar sökningen</h2>
        <p className="text-sm text-gray-500">
          {total > parts.length ? `Visar ${parts.length} av ${total.toLocaleString("sv-SE")}` : `${total} st`}
        </p>
      </div>

      <div className="hidden md:block overflow-x-auto border border-gray-200">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-600">
              <th className="px-3 py-2.5 font-semibold text-center">Märke</th>
              <th className="px-3 py-2.5 font-semibold text-center">Typ</th>
              <th className="px-3 py-2.5 font-semibold text-center">Artikelnummer</th>
              <th className="px-3 py-2.5 font-semibold text-center">Alternativa nummer</th>
              <th className="px-3 py-2.5 font-semibold text-center">Turboladdare</th>
            </tr>
          </thead>
          <tbody>
            {parts.map(p => (
              <tr key={p.id} className="border-t border-gray-200 hover:bg-gray-50 text-center align-top">
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{p.brand ?? ""}</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{p.type ?? ""}</td>
                <td className="px-3 py-2 whitespace-nowrap"><PartWithEye part={p} /></td>
                <td className="px-3 py-2 text-gray-700">{p.numbers.map(n => n.n).join(", ")}</td>
                <td className="px-3 py-2 min-w-[280px]"><FitsTurbos part={p} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden space-y-2">
        {parts.map(p => (
          <li key={p.id} className="border border-gray-200 bg-white p-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <PartWithEye part={p} />
              <span className="text-gray-500">{p.type}</span>
            </div>
            {p.numbers.length > 0 && <p className="mt-1 text-gray-600">Även: {p.numbers.map(n => n.n).join(", ")}</p>}
            <p className="mt-2 text-xs text-gray-500">Passar {p.turboCount.toLocaleString("sv-SE")} turboladdare</p>
            <div className="mt-1 text-left [&>div]:justify-start"><FitsTurbos part={p} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
